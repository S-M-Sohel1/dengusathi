import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { reassessPatient } from "~/server/services/assess";

export const patientRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        nickname: z.string().min(1).max(60),
        ageYears: z.number().int().min(0).max(120),
        sex: z.enum(["male", "female", "other"]).optional(),
        weightKg: z.number().min(1).max(250).optional(),
        riskFactors: z.array(z.string()).default([]),
        area: z.string().min(1),
        feverStart: z.coerce.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const patient = await ctx.db.patient.create({ data: input });
      await reassessPatient(patient.id, { useAi: false });
      return patient;
    }),

  /** Everything the patient home screen needs. */
  get: publicProcedure.input(z.object({ id: z.string() })).query(({ ctx, input }) =>
    ctx.db.patient.findUnique({
      where: { id: input.id },
      include: {
        checkIns: { orderBy: { createdAt: "desc" }, take: 14 },
        labs: { where: { confirmed: true }, orderBy: { takenAt: "asc" } },
        assessments: { orderBy: { createdAt: "desc" }, take: 30 },
      },
    }),
  ),

  reassess: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => reassessPatient(input.id)),
});
