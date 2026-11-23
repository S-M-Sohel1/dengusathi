import "server-only";
import { type Prisma } from "../../../generated/prisma";
import { reviewRisk } from "~/lib/ai/service";
import { symptomsSchema } from "~/lib/ai/schemas";
import { dhakaHour, fluidTargetMl, startOfDhakaDay } from "~/lib/fluids";
import { combine } from "~/lib/risk/score";
import { evaluateRules } from "~/lib/risk/who-rules";
import { db } from "~/server/db";

/** Max time to wait for the optional AI risk review before falling back to rules only. */
const AI_REVIEW_BUDGET_MS = 10_000;

/**
 * Re-run the risk engine for a patient and store a RiskAssessment.
 * Rules always run; the AI review is best-effort (if it fails or is slow, rules + static advice are used).
 */
export async function reassessPatient(
  patientId: string,
  opts: { useAi?: boolean } = {},
) {
  const patient = await db.patient.findUniqueOrThrow({
    where: { id: patientId },
    include: {
      checkIns: { orderBy: { createdAt: "asc" } },
      labs: { where: { confirmed: true }, orderBy: { takenAt: "asc" } },
    },
  });

  const now = new Date();
  const latest = patient.checkIns.at(-1);
  const fluidLogs = await db.fluidLog.findMany({
    where: { patientId, createdAt: { gte: startOfDhakaDay(now) } },
    select: { ml: true },
  });
  const fluidsTodayMl = fluidLogs.reduce((s, l) => s + l.ml, 0);
  const fluidTarget = fluidTargetMl(patient.ageYears, patient.weightKg).ml;
  const rule = evaluateRules({
    patient,
    latestCheckIn: latest
      ? {
          createdAt: latest.createdAt,
          symptoms: symptomsSchema.parse(latest.symptoms),
        }
      : null,
    labs: patient.labs,
    now,
    fluids: {
      todayMl: fluidsTodayMl,
      targetMl: fluidTarget,
      logged: fluidLogs.length > 0,
      localHour: dhakaHour(now),
    },
  });

  let ai = null;
  if (opts.useAi !== false) {
    const timeline = {
      ageYears: patient.ageYears,
      riskFactors: patient.riskFactors,
      dayOfFever: rule.dayOfFever,
      oralFluidsTodayMl: fluidLogs.length ? fluidsTodayMl : null,
      oralFluidTargetMl: fluidTarget,
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
    // The AI review is a best-effort second opinion (rules already decided the minimum status),
    // so never let a slow free-tier model hold the family's result hostage: give it AI_REVIEW_BUDGET_MS.
    try {
      const review = reviewRisk(timeline, {
        status: rule.status,
        reasons: rule.reasons,
      });
      review.catch(() => undefined); // if we time out, a late rejection must not crash the process
      ai = (
        await Promise.race([
          review,
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(`AI review exceeded ${AI_REVIEW_BUDGET_MS} ms`),
                ),
              AI_REVIEW_BUDGET_MS,
            ),
          ),
        ])
      ).value;
    } catch (err) {
      console.warn(
        "[assess] AI review skipped, using rules + standard advice:",
        err instanceof Error ? err.message : err,
      );
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
  return {
    ...saved,
    reasons: final.reasons,
    dayOfFever: rule.dayOfFever,
    inCriticalPhase: rule.inCriticalPhase,
  };
}
