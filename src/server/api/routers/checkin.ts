import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { flagMissedDangerSigns } from "~/lib/ai/safety-net";
import { symptomsSchema, type VoiceExtraction } from "~/lib/ai/schemas";
import { extractFromTranscript, extractVoice } from "~/lib/ai/service";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { reassessPatient } from "~/server/services/assess";

/** ~45 s of 16 kHz mono WAV is ~1.4 MB, ~1.9 MB as base64. Stay well under Vercel's 4.5 MB body limit. */
const MAX_AUDIO_BASE64 = 3_000_000;

/** Highlight danger signs the words mention but the AI left empty (never sets values). */
const withSafetyNet = <T extends { value: VoiceExtraction }>(r: T): T => ({
  ...r,
  value: {
    ...r.value,
    unclearFields: flagMissedDangerSigns(
      r.value.transcriptBn,
      r.value.symptoms,
      r.value.unclearFields,
    ),
  },
});

const aiError = (err: unknown) =>
  new TRPCError({
    code: "SERVICE_UNAVAILABLE",
    message: "AI এখন সাড়া দিচ্ছে না। নিচের ফর্ম দিয়ে উপসর্গ দিন।",
    cause: err,
  });

export const checkinRouter = createTRPCRouter({
  /** Step 1a: voice clip -> extracted symptoms (not saved yet; the user confirms first). */
  extractVoice: publicProcedure
    .input(
      z.object({
        audioBase64: z.string().max(MAX_AUDIO_BASE64),
        mimeType: z.string().default("audio/wav"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return withSafetyNet(
          await extractVoice(input.audioBase64, input.mimeType),
        );
      } catch (err) {
        throw aiError(err);
      }
    }),

  /** Step 1b: text from browser speech recognition (or typed) -> extracted symptoms. */
  extractText: publicProcedure
    .input(z.object({ transcript: z.string().min(1).max(2000) }))
    .mutation(async ({ input }) => {
      try {
        return withSafetyNet(await extractFromTranscript(input.transcript));
      } catch (err) {
        throw aiError(err);
      }
    }),

  /** Step 2: save confirmed symptoms and re-run the risk engine. */
  save: publicProcedure
    .input(
      z.object({
        patientId: z.string(),
        source: z.enum(["VOICE", "FORM"]),
        transcript: z.string().optional(),
        symptoms: symptomsSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.checkIn.create({ data: input });
      return reassessPatient(input.patientId);
    }),
});
