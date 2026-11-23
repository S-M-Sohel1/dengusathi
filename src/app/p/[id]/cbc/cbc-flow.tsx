"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Steps } from "~/app/_components/steps";
import { compressImage } from "~/lib/image/compress";
import { api } from "~/trpc/react";
import {
  Camera,
  Check,
  FileText,
  FlaskConical,
  PenLine,
  ScanLine,
} from "lucide-react";

interface Sample {
  id: string;
  title: string;
}

type Values = {
  plateletUl: string;
  hctPct: string;
  wbcUl: string;
  hbGdl: string;
};
const EMPTY: Values = { plateletUl: "", hctPct: "", wbcUl: "", hbGdl: "" };

const FIELDS: {
  key: keyof Values;
  label: string;
  unit: string;
  min: number;
  max: number;
  hint: string;
  reject: string;
}[] = [
  {
    key: "plateletUl",
    label: "প্লাটিলেট",
    unit: "/µL",
    min: 1_000,
    max: 1_500_000,
    hint: "যেমন ১৫০০০০",
    reject: "platelet",
  },
  {
    key: "hctPct",
    label: "হেমাটোক্রিট (HCT/PCV)",
    unit: "%",
    min: 10,
    max: 70,
    hint: "যেমন ৪০",
    reject: "hematocrit",
  },
  {
    key: "wbcUl",
    label: "WBC",
    unit: "/µL",
    min: 300,
    max: 100_000,
    hint: "যেমন ৫০০০",
    reject: "wbc",
  },
  {
    key: "hbGdl",
    label: "হিমোগ্লোবিন",
    unit: "g/dL",
    min: 3,
    max: 22,
    hint: "যেমন ১৩",
    reject: "hemoglobin",
  },
];

const todayIso = () =>
  new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 10);

export function CbcFlow({
  patientId,
  feverStartIso,
  samples,
}: {
  patientId: string;
  feverStartIso: string;
  samples: Sample[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [values, setValues] = useState<Values | null>(null);
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState<{
    rejected: string[];
    lowConfidence: boolean;
    notCbc: boolean;
    lab: string | null;
  }>({
    rejected: [],
    lowConfidence: false,
    notCbc: false,
    lab: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [showSamples, setShowSamples] = useState(false);

  const extract = api.cbc.extract.useMutation({
    onSuccess: ({ raw, values: v }) => {
      if (!raw.isCbcReport) {
        setNotes({
          rejected: [],
          lowConfidence: false,
          notCbc: true,
          lab: raw.labName,
        });
        setValues(null);
        return;
      }
      setValues({
        plateletUl: v.plateletUl?.toString() ?? "",
        hctPct: v.hctPct?.toString() ?? "",
        wbcUl: v.wbcUl?.toString() ?? "",
        hbGdl: v.hbGdl?.toString() ?? "",
      });
      setNotes({
        rejected: v.rejected,
        lowConfidence: raw.confidence === "low",
        notCbc: false,
        lab: raw.labName,
      });
      // Use the printed report date only if it fits this illness (not before the fever, not in the future).
      if (
        raw.reportDate &&
        raw.reportDate >= feverStartIso.slice(0, 10) &&
        raw.reportDate <= todayIso()
      )
        setDate(raw.reportDate);
    },
    onError: (e) => {
      setError(e.message);
      setValues(EMPTY);
    },
  });

  const save = api.cbc.save.useMutation({
    onSuccess: () => {
      router.push(`/p/${patientId}?updated=1`);
      router.refresh();
    },
    onError: (e) => setError(e.message),
  });

  const handleFile = async (file: File) => {
    setError(null);
    setValues(null);
    setNotes({ rejected: [], lowConfidence: false, notCbc: false, lab: null });
    try {
      const { base64, mimeType } = await compressImage(file);
      setPreview(`data:${mimeType};base64,${base64}`);
      extract.mutate({ imageBase64: base64, mimeType });
    } catch {
      setError("ছবিটি খোলা যায়নি। অন্য ছবি দিন।");
    }
  };

  const loadSample = async (id: string) => {
    setShowSamples(false);
    const res = await fetch(`/samples/cbc/${id}-photo.png`);
    const blob = await res.blob();
    await handleFile(new File([blob], `${id}.png`, { type: blob.type }));
  };

  const fieldError = (f: (typeof FIELDS)[number], v: string) => {
    if (v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= f.min && n <= f.max
      ? null
      : `${f.min.toLocaleString("en-IN")} থেকে ${f.max.toLocaleString("en-IN")} এর মধ্যে হতে হবে`;
  };
  const anyValue = values && Object.values(values).some((v) => v !== "");
  const anyError = values && FIELDS.some((f) => fieldError(f, values[f.key]));

  return (
    <div className="flex flex-col gap-4">
      <Steps
        steps={["ছবি দিন", "মিলিয়ে নিন", "ফলাফল"]}
        current={values ? 1 : 0}
      />
      {!preview && !values && (
        <div className="card flex flex-col items-center gap-4 py-8 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <FlaskConical className="size-10" aria-hidden />
          </span>
          <p className="text-lg text-slate-600">
            CBC রিপোর্টটি সমান জায়গায় রেখে, আলোতে, পুরো কাগজের ছবি তুলুন।
          </p>
          <button
            className="btn-primary w-full"
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="size-5" aria-hidden /> ছবি তুলুন / গ্যালারি থেকে দিন
          </button>
          <div className="grid w-full grid-cols-2 gap-3">
            <button
              className="btn-outline"
              onClick={() => setShowSamples((v) => !v)}
            >
              <FileText className="size-5" aria-hidden /> নমুনা রিপোর্ট
            </button>
            <button className="btn-outline" onClick={() => setValues(EMPTY)}>
              <PenLine className="size-5" aria-hidden /> হাতে লিখুন
            </button>
          </div>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />

      {showSamples && (
        <div className="card fade-up">
          <p className="mb-3 text-sm text-slate-600">
            ডেমোর জন্য বানানো নমুনা রিপোর্ট (কাল্পনিক ল্যাব ও রোগী)
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {samples.map((s) => (
              <button
                key={s.id}
                onClick={() => void loadSample(s.id)}
                className="overflow-hidden rounded-xl text-left ring-1 ring-slate-200 hover:ring-2 hover:ring-teal-600"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/samples/cbc/${s.id}-photo.png`}
                  alt={s.title}
                  className="h-32 w-full object-cover object-top"
                />
                <p className="p-2 text-xs leading-snug">{s.title}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {preview && (
        <div className="card relative overflow-hidden !p-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="রিপোর্টের ছবি"
            className={`max-h-72 w-full object-contain ${extract.isPending ? "opacity-60" : ""}`}
          />
          {extract.isPending && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/60">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-200 border-t-teal-700" />
              <p className="text-lg font-bold text-teal-800">
                <ScanLine className="inline size-5 align-[-3px]" aria-hidden />{" "}
                AI রিপোর্ট পড়ছে...
              </p>
            </div>
          )}
        </div>
      )}

      {notes.notCbc && (
        <div className="card bg-yellow-50 ring-yellow-300">
          <p className="font-bold text-yellow-900">
            এটি CBC রিপোর্ট মনে হচ্ছে না।
          </p>
          <p className="text-yellow-900">
            প্লাটিলেট ও হেমাটোক্রিট আছে এমন রক্ত পরীক্ষার (CBC) রিপোর্টের ছবি দিন।
          </p>
          <button
            className="btn-outline mt-3"
            onClick={() => {
              setPreview(null);
              setNotes({ ...notes, notCbc: false });
            }}
          >
            অন্য ছবি দিন
          </button>
        </div>
      )}

      {values && (
        <div className="card fade-up flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-bold">
              {preview ? "AI যা পড়েছে, মিলিয়ে নিন" : "রিপোর্ট থেকে মানগুলো লিখুন"}
            </h2>
            {notes.lab && (
              <p className="text-sm text-slate-500">ল্যাব: {notes.lab}</p>
            )}
            {notes.lowConfidence && (
              <p className="mt-1 rounded-lg bg-yellow-50 p-2 text-sm text-yellow-900">
                ছবিটি পুরো পরিষ্কার নয়। প্রতিটি সংখ্যা রিপোর্টের সাথে মিলিয়ে নিন।
              </p>
            )}
          </div>
          {FIELDS.map((f) => {
            const err = fieldError(f, values[f.key]);
            const rejected = notes.rejected.includes(f.reject);
            return (
              <label key={f.key} className="flex flex-col gap-1">
                <span className="font-semibold">
                  {f.label}{" "}
                  <span className="font-normal text-slate-500">({f.unit})</span>
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={values[f.key]}
                  placeholder={f.hint}
                  onChange={(e) =>
                    setValues({ ...values, [f.key]: e.target.value })
                  }
                  className={`input ${err || rejected ? "border-red-500" : ""}`}
                />
                {f.key === "plateletUl" && values.plateletUl && !err && (
                  <span className="text-sm text-slate-600">
                    ={" "}
                    {(Number(values.plateletUl) / 1000).toLocaleString("bn-BD")}{" "}
                    হাজার
                  </span>
                )}
                {err && <span className="text-sm text-red-600">{err}</span>}
                {rejected && !values[f.key] && (
                  <span className="text-sm text-red-600">
                    AI যে সংখ্যা পড়েছে তা অসম্ভব মনে হচ্ছে। রিপোর্ট দেখে লিখুন।
                  </span>
                )}
              </label>
            );
          })}
          <label className="flex flex-col gap-1">
            <span className="font-semibold">রিপোর্টের তারিখ</span>
            <input
              type="date"
              value={date}
              min={feverStartIso.slice(0, 10)}
              max={todayIso()}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </label>
          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>
          )}
          <button
            className="btn-primary"
            disabled={!anyValue || !!anyError || save.isPending}
            onClick={() => {
              const num = (v: string) => (v === "" ? null : Number(v));
              const takenAt =
                date === todayIso()
                  ? new Date()
                  : new Date(`${date}T10:00:00+06:00`);
              save.mutate({
                patientId,
                takenAt,
                plateletUl:
                  num(values.plateletUl) != null
                    ? Math.round(num(values.plateletUl)!)
                    : null,
                hctPct: num(values.hctPct),
                wbcUl:
                  num(values.wbcUl) != null
                    ? Math.round(num(values.wbcUl)!)
                    : null,
                hbGdl: num(values.hbGdl),
              });
            }}
          >
            {save.isPending ? (
              "ঝুঁকি যাচাই হচ্ছে..."
            ) : (
              <>
                <Check className="size-5" aria-hidden /> নিশ্চিত করুন ও ফলাফল দেখুন
              </>
            )}
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              setPreview(null);
              setValues(null);
              setError(null);
            }}
          >
            অন্য ছবি দিন
          </button>
        </div>
      )}

      {error && !values && (
        <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>
      )}
      <p className="text-center text-xs text-slate-500">
        রিপোর্টের ছবি সংরক্ষণ করা হয় না, শুধু সংখ্যাগুলো রাখা হয়।
      </p>
      <Link
        href={`/p/${patientId}`}
        className="text-center text-slate-500 underline"
      >
        বাতিল
      </Link>
    </div>
  );
}
