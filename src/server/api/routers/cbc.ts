import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { extractCbc } from "~/lib/ai/service";
import { normalizeCbc } from "~/lib/risk/cbc-normalize";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { reassessPatient } from "~/server/services/assess";

/** Client compresses to max 1600 px JPEG (~200-400 KB). 3 MB base64 is a hard cap. */
const MAX_IMAGE_BASE64 = 3_000_000;

export const cbcRouter = createTRPCRouter({
  /** Photo -> normalised values for the user to confirm. The photo itself is not stored. */
  extract: publicProcedure
    .input(
      z.object({
        imageBase64: z.string().max(MAX_IMAGE_BASE64),
        mimeType: z.string().default("image/jpeg"),
      }),
    )
    .mutation(async ({ input }) => {
      let res;
      try {
        res = await extractCbc(input.imageBase64, input.mimeType);
      } catch (err) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "রিপোর্ট পড়া যায়নি। মানগুলো হাতে লিখে দিন।",
          cause: err,
        });
      }
      return { raw: res.value, provider: res.provider, values: normalizeCbc(res.value) };
    }),

  /** Save user-confirmed values and re-run the risk engine. */
  save: publicProcedure
    .input(
      z.object({
        patientId: z.string(),
        takenAt: z.coerce.date(),
        plateletUl: z.number().int().min(1_000).max(1_500_000).nullable(),
        hctPct: z.number().min(10).max(70).nullable(),
        wbcUl: z.number().int().min(300).max(100_000).nullable(),
        hbGdl: z.number().min(3).max(22).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.labResult.create({ data: { ...input, confirmed: true } });
      return reassessPatient(input.patientId);
    }),
});
