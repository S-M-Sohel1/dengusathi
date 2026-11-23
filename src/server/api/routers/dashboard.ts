import { detectSpike, dhakaDay, fillDays, lastNDays } from "~/lib/anomaly";
import { AREAS, areaName } from "~/lib/areas";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

type Status = "GREEN" | "YELLOW" | "RED";
const RANK: Record<Status, number> = { GREEN: 0, YELLOW: 1, RED: 2 };

/** Patients whose fever started within this many days count as "active". */
const ACTIVE_DAYS = 10;
/** PROTOTYPE heuristic: share of YELLOW patients in fever day 3-6 expected to turn RED within 48 h. */
const YELLOW_TO_RED_48H = 0.3;

export const dashboardRouter = createTRPCRouter({
  /**
   * Area-level overview for hospitals / upazila health offices. Anonymised: only area + status.
   * Daily count = distinct patients whose worst status that day was YELLOW or RED.
   */
  overview: publicProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const days = lastNDays(15, now);
    const since = new Date(now.getTime() - 15 * 864e5);

    const [assessments, patients] = await Promise.all([
      ctx.db.riskAssessment.findMany({
        where: { createdAt: { gte: since } },
        select: { patientId: true, status: true, createdAt: true, patient: { select: { area: true } } },
      }),
      ctx.db.patient.findMany({
        where: { feverStart: { gte: new Date(now.getTime() - ACTIVE_DAYS * 864e5) } },
        select: {
          id: true,
          area: true,
          feverStart: true,
          assessments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
        },
      }),
    ]);

    // worst status per (area, day, patient)
    const worst = new Map<string, Status>();
    for (const a of assessments) {
      const key = `${a.patient.area}|${dhakaDay(a.createdAt)}|${a.patientId}`;
      const cur = worst.get(key);
      if (!cur || RANK[a.status] > RANK[cur]) worst.set(key, a.status);
    }
    const daily = new Map<string, { red: Map<string, number>; yellow: Map<string, number> }>();
    for (const [key, status] of worst) {
      if (status === "GREEN") continue;
      const [area, day] = key.split("|") as [string, string];
      const d = daily.get(area) ?? { red: new Map(), yellow: new Map() };
      const m = status === "RED" ? d.red : d.yellow;
      m.set(day, (m.get(day) ?? 0) + 1);
      daily.set(area, d);
    }

    const areas = AREAS.map((area) => {
      const active = patients.filter((p) => p.area === area.id);
      const current = { GREEN: 0, YELLOW: 0, RED: 0 } as Record<Status, number>;
      let yellowCritical = 0;
      for (const p of active) {
        const s = p.assessments[0]?.status ?? "GREEN";
        current[s]++;
        const day = Math.floor((now.getTime() - p.feverStart.getTime()) / 864e5) + 1;
        if (s === "YELLOW" && day >= 3 && day <= 6) yellowCritical++;
      }
      const d = daily.get(area.id);
      const red = fillDays(d?.red ?? new Map<string, number>(), days);
      const yellow = fillDays(d?.yellow ?? new Map<string, number>(), days);
      const severe = red.map((r, i) => ({ day: r.day, count: r.count + yellow[i]!.count }));
      return {
        id: area.id,
        nameBn: area.nameBn,
        lat: area.lat,
        lng: area.lng,
        active: active.length,
        current,
        expectedRed48h: Math.round(yellowCritical * YELLOW_TO_RED_48H + current.RED),
        spike: detectSpike(severe),
        series: days.map((day, i) => ({ day, red: red[i]!.count, yellow: yellow[i]!.count })),
      };
    });

    const totals = areas.reduce(
      (t, a) => ({
        active: t.active + a.active,
        red: t.red + a.current.RED,
        yellow: t.yellow + a.current.YELLOW,
        green: t.green + a.current.GREEN,
        expectedRed48h: t.expectedRed48h + a.expectedRed48h,
      }),
      { active: 0, red: 0, yellow: 0, green: 0, expectedRed48h: 0 },
    );

    const series = days.map((day, i) => ({
      day,
      red: areas.reduce((s, a) => s + a.series[i]!.red, 0),
      yellow: areas.reduce((s, a) => s + a.series[i]!.yellow, 0),
    }));

    const alerts = areas
      .filter((a) => a.spike.isSpike)
      .map((a) => ({ areaId: a.id, nameBn: areaName(a.id), today: a.spike.today, ratio: a.spike.ratio, z: a.spike.z }));

    return { generatedAt: now, totals, series, areas, alerts };
  }),
});
