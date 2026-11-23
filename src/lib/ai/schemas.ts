import { z } from "zod";

/**
 * Symptoms extracted from a Bangla voice check-in (or entered via the tap form).
 * `null` means "not mentioned / unknown". The rule engine treats unknown as not-present,
 * and the UI asks follow-up questions for anything listed in `unclearFields`.
 */
export const symptomsSchema = z.object({
  fever: z.boolean().nullable(),
  temperatureF: z.number().nullable(),
  feverJustDropped: z.boolean().nullable(),
  vomitingCount24h: z.number().int().nullable(),
  abdominalPain: z.enum(["none", "mild", "severe"]).nullable(),
  bleedingGums: z.boolean().nullable(),
  bleedingNose: z.boolean().nullable(),
  vomitBlood: z.boolean().nullable(),
  blackStool: z.boolean().nullable(),
  skinSpots: z.boolean().nullable(),
  heavyMenstrualBleeding: z.boolean().nullable(),
  /** No urine for 6 hours or more */
  noUrine6h: z.boolean().nullable(),
  drowsyOrRestless: z.boolean().nullable(),
  coldClammyHands: z.boolean().nullable(),
  canDrinkFluids: z.boolean().nullable(),
  fluidIntakeLitres: z.number().nullable(),
  breathingDifficulty: z.boolean().nullable(),
  dizzyOnStanding: z.boolean().nullable(),
});
export type Symptoms = z.infer<typeof symptomsSchema>;

export const emptySymptoms: Symptoms = {
  fever: null,
  temperatureF: null,
  feverJustDropped: null,
  vomitingCount24h: null,
  abdominalPain: null,
  bleedingGums: null,
  bleedingNose: null,
  vomitBlood: null,
  blackStool: null,
  skinSpots: null,
  heavyMenstrualBleeding: null,
  noUrine6h: null,
  drowsyOrRestless: null,
  coldClammyHands: null,
  canDrinkFluids: null,
  fluidIntakeLitres: null,
  breathingDifficulty: null,
  dizzyOnStanding: null,
};

export const voiceExtractionSchema = z.object({
  transcriptBn: z.string(),
  symptoms: symptomsSchema,
  unclearFields: z.array(z.string()),
});
export type VoiceExtraction = z.infer<typeof voiceExtractionSchema>;

/** Raw values the vision model reads from a CBC photo. Units are normalised in code. */
export const cbcExtractionSchema = z.object({
  isCbcReport: z.boolean(),
  plateletRaw: z.string().nullable(),
  plateletUnit: z.string().nullable(),
  hematocritPct: z.number().nullable(),
  wbcRaw: z.string().nullable(),
  wbcUnit: z.string().nullable(),
  hemoglobinGdl: z.number().nullable(),
  reportDate: z.string().nullable(),
  labName: z.string().nullable(),
  confidence: z.enum(["high", "low"]),
});
export type CbcExtraction = z.infer<typeof cbcExtractionSchema>;

/** The AI's second opinion on the timeline. It may only raise the rule-based status. */
export const aiRiskSchema = z.object({
  status: z.enum(["GREEN", "YELLOW", "RED"]),
  reasonsBn: z.array(z.string()),
  adviceBn: z.string(),
});
export type AiRisk = z.infer<typeof aiRiskSchema>;
