import "server-only";
import { type Prisma } from "../../../generated/prisma";
import { reviewRisk } from "~/lib/ai/service";
import { symptomsSchema } from "~/lib/ai/schemas";
import { combine } from "~/lib/risk/score";
import { evaluateRules } from "~/lib/risk/who-rules";
import { db } from "~/server/db";

/**
 * Re-run the risk engine for a patient and store a RiskAssessment.
 * Rules always run; the AI review is best-effort (if it fails, rules + static advice are used).
 */
export async function reassessPatient(patientId: string, opts: { useAi?: boolean } = {}) {
  const patient = await db.patient.findUniqueOrThrow({
    where: { id: patientId },
    include: {
      checkIns: { orderBy: { createdAt: "asc" } },
      labs: { where: { confirmed: true }, orderBy: { takenAt: "asc" } },
    },
  });

  const now = new Date();
  const latest = patient.checkIns.at(-1);
  const rule = evaluateRules({
    patient,
    latestCheckIn: latest
      ? { createdAt: latest.createdAt, symptoms: symptomsSchema.parse(latest.symptoms) }
      : null,
    labs: patient.labs,
    now,
  });

  let ai = null;
  if (opts.useAi !== false) {
    const timeline = {
      ageYears: patient.ageYears,
      riskFactors: patient.riskFactors,
      dayOfFever: rule.dayOfFever,
      checkIns: patient.checkIns.slice(-7).map((c) => ({
        at: c.createdAt.toISOString(),
        symptoms: c.symptoms,
      })),
      labs: patient.labs.map((l) => ({
        at: l.takenAt.toISOString(),
        plateletUl: l.plateletUl,
        hctPct: l.hctPct,
        wbcUl: l.wbcUl,
      })),
    };
    try {
      ai = (await reviewRisk(timeline, { status: rule.status, reasons: rule.reasons })).value;
    } catch (err) {
      console.warn("[assess] AI review failed, using rules only:", err);
    }
  }

  const final = combine(rule, ai);
  const saved = await db.riskAssessment.create({
    data: {
      patientId,
      status: final.status,
      ruleStatus: final.ruleStatus,
      aiStatus: final.aiStatus,
      reasons: final.reasons as unknown as Prisma.InputJsonValue,
      adviceBn: final.adviceBn,
    },
  });
  return { ...saved, reasons: final.reasons, dayOfFever: rule.dayOfFever, inCriticalPhase: rule.inCriticalPhase };
}
