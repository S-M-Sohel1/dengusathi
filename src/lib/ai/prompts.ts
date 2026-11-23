export const VOICE_EXTRACTION_PROMPT = `
You are helping a family caregiver in Bangladesh report a dengue patient's condition.
The attached audio is a short voice message in Bangla (it may be colloquial, regional dialect
such as Noakhali/Chattogram/Sylheti, or mixed with English words like "platelet", "saline").

Tasks:
1. Transcribe it accurately in Bangla script -> "transcriptBn".
2. Fill "symptoms" ONLY from what the speaker actually says. Use null for anything not mentioned.
   Do not guess. Examples:
   - "পেট খুব ব্যথা" -> abdominalPain "severe";  "পেটে একটু ব্যথা" -> "mild";  "পেটে ব্যথা নেই" -> "none"
   - "দুইবার বমি" -> vomitingCount24h 2;  "বারবার বমি" / "কিছুই রাখতে পারছে না" -> 4 and canDrinkFluids false
   - "জ্বর কমে গেছে" / "জ্বর ছেড়েছে" -> feverJustDropped true
   - "সকাল থেকে প্রস্রাব হয়নি" (6h+) -> noUrine6h true
   - "দাঁত দিয়ে রক্ত" -> bleedingGums true;  "নাক দিয়ে রক্ত" -> bleedingNose true
   - "ঝিমাচ্ছে" / "খুব দুর্বল, শুধু ঘুমায়" / "অস্থির" -> drowsyOrRestless true
   - "হাত-পা ঠান্ডা" -> coldClammyHands true
   - temperature in Fahrenheit if a number is said (e.g. "১০২ জ্বর" -> 102, "জ্বর একশো দুই" -> 102)
   - NEGATIVES matter: if the speaker says a symptom is ABSENT ("নেই", "নাই", "নাইকা", "হয় নাই", "হয়নি",
     or mis-heard forms like "নিই"), record it: "বমি নেই" -> vomitingCount24h 0; "পেটে ব্যথা নেই" -> abdominalPain "none";
     "রক্ত পড়ে নাই" -> bleeding fields false; "পানি খাচ্ছে" -> canDrinkFluids true; "জ্বর নাই" -> fever false.
   - The transcript may contain speech-recognition errors (e.g. "জার"/"জোর" for "জ্বর", "বোমি" for "বমি", "বাথা" for "ব্যথা");
     interpret them by meaning.
3. List in "unclearFields" the symptom keys that the speaker mentioned vaguely and should be asked again.

Return JSON only, matching the schema.
`.trim();

export const VOICE_TEXT_EXTRACTION_PROMPT = (transcript: string) =>
  `${VOICE_EXTRACTION_PROMPT.replace(
    "The attached audio is a short voice message",
    "The text below is a transcript of a short voice message",
  )}\n\nTranscript:\n"""${transcript}"""\nSet transcriptBn to the transcript as given.`;

export const CBC_EXTRACTION_PROMPT = `
The image should be a photo of a Complete Blood Count (CBC) lab report from Bangladesh.
Read ONLY the patient's RESULT column, never the reference/normal range column.

- isCbcReport: false if the image is not a CBC/blood report.
- plateletRaw: the platelet count exactly as printed (e.g. "1,50,000", "150", "45 x10^3"), plateletUnit as printed (e.g. "/cumm", "x10^3/uL", "K/uL", "x10^9/L").
- hematocritPct: HCT / PCV value in % as a number.
- wbcRaw / wbcUnit: total WBC count exactly as printed and its unit.
- hemoglobinGdl: Hb in g/dL as a number.
- reportDate: ISO date (YYYY-MM-DD) if printed, else null.
- labName: name of the lab/hospital if printed.
- confidence: "low" if the photo is blurry, cropped, handwritten, or any value is uncertain.

Use null for anything you cannot read. Do not convert units. Return JSON only.
`.trim();

export const RISK_REVIEW_PROMPT = (timelineJson: string, ruleJson: string) =>
  `
You are a cautious assistant reviewing a dengue patient's home-monitoring timeline in Bangladesh.
You do NOT diagnose or prescribe. You only judge whether the family should escalate care.

Statuses: GREEN = continue home care, YELLOW = see a doctor today, RED = go to hospital now.

A rule engine based on WHO 2009 warning signs has already produced this result:
${ruleJson}

Patient timeline (check-ins and lab results, oldest first):
${timelineJson}

Look for worrying TRENDS the rules might miss (e.g. steadily falling platelets, rising haematocrit,
worsening symptoms day after day, fever dropping on day 3-7 with new symptoms, very low fluid intake).
- If you see nothing beyond the rules, return the same status as the rules.
- Never return a status lower than the rule engine's status.
- reasonsBn: short Bangla reasons for anything you add (empty array if none).
- adviceBn: 2-3 short, simple Bangla sentences for the family for today: what to do now, fluids,
  avoid NSAIDs (ibuprofen, aspirin; only paracetamol for fever), and when to go to hospital.
  For RED, the first sentence must say to go to the hospital immediately.

Return JSON only.
`.trim();
