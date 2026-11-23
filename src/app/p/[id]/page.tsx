import Link from "next/link";
import { notFound } from "next/navigation";
import { ShareButton } from "~/app/_components/share-button";
import { StatusCard } from "~/app/_components/status-card";
import { STATUS_META } from "~/lib/status-meta";
import { TrendChart } from "~/app/_components/trend-chart";
import { symptomsSchema } from "~/lib/ai/schemas";
import { areaName } from "~/lib/areas";
import { summarizeSymptoms, toBn } from "~/lib/symptom-labels";
import { dayOfFever, type Reason } from "~/lib/risk/who-rules";
import { api } from "~/trpc/server";
import { FlaskConical, Mic, TriangleAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PatientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string }>;
}) {
  const { id } = await params;
  const { updated } = await searchParams;
  const patient = await api.patient.get({ id });
  if (!patient) notFound();

  const latest = patient.assessments[0];
  const day = dayOfFever(patient.feverStart, new Date());
  const critical = day >= 3 && day <= 7;
  const checkedInToday =
    patient.checkIns[0] &&
    Date.now() - patient.checkIns[0].createdAt.getTime() < 20 * 3600e3;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">{patient.nickname}</h1>
          <p className="text-slate-600">
            {toBn(patient.ageYears)} বছর · {areaName(patient.area)}
          </p>
        </div>
        <ShareButton patientId={patient.id} />
      </header>

      {/* Fever day timeline */}
      <section className="card !p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">
            আজ জ্বরের <span className="text-2xl text-teal-700">{toBn(day)}</span>{" "}
            নম্বর দিন
          </p>
          {critical && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
              <TriangleAlert className="size-4" aria-hidden /> সংকটকাল চলছে
            </span>
          )}
        </div>
        <div className="mt-3 flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((d) => (
            <div
              key={d}
              className={`flex h-10 flex-1 items-center justify-center rounded-lg text-sm font-bold ${
                d === day
                  ? "bg-teal-700 text-white ring-2 ring-teal-300"
                  : d >= 3 && d <= 7
                    ? "bg-red-50 text-red-700"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              {toBn(d)}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          লাল দিনগুলো (৩-৭) সবচেয়ে ঝুঁকির। জ্বর কমলেও এই সময় প্রতিদিন আপডেট দিন।
        </p>
      </section>

      {latest && (
        <StatusCard
          status={latest.status}
          adviceBn={latest.adviceBn}
          reasons={latest.reasons as unknown as Reason[]}
          updatedAt={latest.createdAt}
          hospitalsHref={`/p/${id}/hospitals`}
          autoPlay={!!updated}
        />
      )}

      <nav className="grid grid-cols-2 gap-3">
        <Link
          href={`/p/${id}/checkin`}
          className={`card flex flex-col items-center gap-1 !p-4 text-center hover:bg-teal-50 ${!checkedInToday ? "ring-2 ring-teal-600" : ""}`}
        >
          <Mic className="size-10 text-teal-700" aria-hidden />
          <span className="text-lg font-bold">আজকের আপডেট</span>
          <span className="text-sm text-slate-500">
            {checkedInToday ? "আজ দেওয়া হয়েছে" : "কথা বলে জানান"}
          </span>
        </Link>
        <Link
          href={`/p/${id}/cbc`}
          className="card flex flex-col items-center gap-1 !p-4 text-center hover:bg-teal-50"
        >
          <FlaskConical className="size-10 text-teal-700" aria-hidden />
          <span className="text-lg font-bold">CBC রিপোর্ট</span>
          <span className="text-sm text-slate-500">ছবি তুলে দিন</span>
        </Link>
      </nav>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">রক্ত পরীক্ষার ট্রেন্ড</h2>
        <TrendChart labs={patient.labs} />
        {patient.labs.length > 0 && (
          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1">তারিখ</th>
                <th>প্লাটিলেট</th>
                <th>HCT</th>
                <th>WBC</th>
              </tr>
            </thead>
            <tbody>
              {patient.labs.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="py-1.5">
                    {l.takenAt.toLocaleDateString("bn-BD", {
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                  <td
                    className={
                      l.plateletUl != null && l.plateletUl < 100_000
                        ? "font-bold text-red-600"
                        : ""
                    }
                  >
                    {l.plateletUl?.toLocaleString("en-IN") ?? "-"}
                  </td>
                  <td>{l.hctPct != null ? `${l.hctPct}%` : "-"}</td>
                  <td>{l.wbcUl?.toLocaleString("en-IN") ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">প্রতিদিনের ইতিহাস</h2>
        {patient.checkIns.length === 0 ? (
          <p className="text-slate-500">
            এখনও কোনো আপডেট নেই। উপরের &quot;আজকের আপডেট&quot; চাপুন।
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {patient.checkIns.map((c) => {
              const parsed = symptomsSchema.safeParse(c.symptoms);
              const chips = parsed.success
                ? summarizeSymptoms(parsed.data)
                : [];
              const a = patient.assessments.find(
                (x) =>
                  Math.abs(x.createdAt.getTime() - c.createdAt.getTime()) <
                  5 * 60e3,
              );
              return (
                <li
                  key={c.id}
                  className="flex gap-3 border-l-4 border-slate-200 pl-3"
                  style={
                    a
                      ? {
                          borderColor: {
                            GREEN: "#15803d",
                            YELLOW: "#ca8a04",
                            RED: "#dc2626",
                          }[a.status],
                        }
                      : undefined
                  }
                >
                  <div className="flex-1">
                    <p className="text-sm text-slate-500">
                      জ্বরের {toBn(dayOfFever(patient.feverStart, c.createdAt))}{" "}
                      নম্বর দিন · {c.source === "VOICE" ? "ভয়েস" : "ফর্ম"}
                      {a && (
                        <span
                          className={`ml-2 font-bold ${STATUS_META[a.status].text}`}
                        >
                          {STATUS_META[a.status].title}
                        </span>
                      )}
                    </p>
                    {c.transcript && (
                      <p className="mt-0.5 italic">
                        &ldquo;{c.transcript}&rdquo;
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {chips.length === 0 && (
                        <span className="text-sm text-slate-500">
                          কোনো বিপদচিহ্ন নেই
                        </span>
                      )}
                      {chips.map((ch) => (
                        <span
                          key={ch.text}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${ch.danger ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}
                        >
                          {ch.text}
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}
