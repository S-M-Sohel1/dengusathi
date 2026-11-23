import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // Google AI Studio key (free tier). Primary model for voice, vision and text.
    GEMINI_API_KEY: z.string().min(1),
    // Model IDs change often; list what your key can use with GET /v1beta/models.
    GEMINI_MODEL: z.string().default("gemini-3.5-flash-lite"),
    // Tried when the primary model is overloaded (503) or rate limited (429).
    GEMINI_FALLBACK_MODEL: z.string().optional(),
    // Groq key (free tier). Optional fallback when Gemini fails or is rate limited.
    GROQ_API_KEY: z.string().optional(),
    GROQ_STT_MODEL: z.string().default("whisper-large-v3"),
    GROQ_TEXT_MODEL: z.string().default("openai/gpt-oss-120b"),
    GROQ_VISION_MODEL: z.string().default("qwen/qwen3.8-27b"),
  },

  client: {},

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    NODE_ENV: process.env.NODE_ENV,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    GEMINI_FALLBACK_MODEL: process.env.GEMINI_FALLBACK_MODEL,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_STT_MODEL: process.env.GROQ_STT_MODEL,
    GROQ_TEXT_MODEL: process.env.GROQ_TEXT_MODEL,
    GROQ_VISION_MODEL: process.env.GROQ_VISION_MODEL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
