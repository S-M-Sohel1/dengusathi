import "server-only";
import { GoogleGenAI } from "@google/genai";
import { type z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { env } from "~/env";

let client: GoogleGenAI | null = null;
function getClient() {
  client ??= new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
    // Fail fast: the SDK otherwise retries 5x with backoff, which can stall a request for minutes
    // when the model is overloaded. Our own chain (fallback Gemini model -> Groq) handles retries.
    httpOptions: { timeout: 25_000, retryOptions: { attempts: 1 } },
  });
  return client;
}

export interface InlineFile {
  /** base64 without the data: prefix */
  data: string;
  mimeType: string;
}

/**
 * One Gemini call that returns JSON validated against a zod schema.
 * Supports text plus inline audio/image parts (inline limit is ~20 MB per request).
 */
export async function geminiJson<T extends z.ZodTypeAny>(opts: {
  prompt: string;
  schema: T;
  files?: InlineFile[];
  temperature?: number;
}): Promise<z.infer<T>> {
  const jsonSchema = zodToJsonSchema(opts.schema, { $refStrategy: "none" });
  delete (jsonSchema as Record<string, unknown>).$schema;

  const models = [env.GEMINI_MODEL, env.GEMINI_FALLBACK_MODEL].filter(
    (m): m is string => !!m,
  );
  let lastErr: unknown;
  for (const model of models) {
    // "High demand" 503 spikes on the free tier usually clear within a second, so give each
    // model one quick retry before moving on. Quota errors (429) are not retried on the same model.
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await callModel(model, opts, jsonSchema);
      } catch (err) {
        lastErr = err;
        // Only overload / rate-limit errors are worth retrying.
        if (!isRetryable(err)) throw err;
        const overloaded = /\b503\b|UNAVAILABLE|high demand/i.test(
          String((err as Error)?.message ?? err),
        );
        if (attempt === 1 && overloaded) {
          console.warn(`[gemini] ${model} overloaded, retrying once`);
          await new Promise((r) => setTimeout(r, 900));
          continue;
        }
        console.warn(`[gemini] ${model} unavailable, trying next model`);
        break;
      }
    }
  }
  throw lastErr;
}

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === 429 || status === 500 || status === 503 || status === 504)
    return true;
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /"code":\s*(429|500|503|504)|RESOURCE_EXHAUSTED|UNAVAILABLE|DEADLINE|high demand|timeout|timed out|abort/i.test(
    msg,
  );
}

async function callModel<T extends z.ZodTypeAny>(
  model: string,
  opts: {
    prompt: string;
    schema: T;
    files?: InlineFile[];
    temperature?: number;
  },
  jsonSchema: unknown,
): Promise<z.infer<T>> {
  const res = await getClient().models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          ...(opts.files ?? []).map((f) => ({
            inlineData: { data: f.data, mimeType: f.mimeType },
          })),
          { text: opts.prompt },
        ],
      },
    ],
    config: {
      temperature: opts.temperature ?? 0.1,
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema,
    },
  });

  const text = res.text;
  if (!text) throw new Error("Gemini returned an empty response");
  return opts.schema.parse(JSON.parse(text)) as z.infer<T>;
}
