import { cbcRouter } from "~/server/api/routers/cbc";
import { checkinRouter } from "~/server/api/routers/checkin";
import { dashboardRouter } from "~/server/api/routers/dashboard";
import { hospitalRouter } from "~/server/api/routers/hospital";
import { patientRouter } from "~/server/api/routers/patient";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  patient: patientRouter,
  checkin: checkinRouter,
  cbc: cbcRouter,
  dashboard: dashboardRouter,
  hospital: hospitalRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
