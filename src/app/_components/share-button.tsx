"use client";

import { useEffect, useState } from "react";
import { STORAGE_KEY } from "~/app/_components/new-patient-form";

/** Copy the patient link so another family member can open the same patient. Also remembers it on this phone. */
export function ShareButton({ patientId }: { patientId: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, patientId);
  }, [patientId]);

  const share = async () => {
    const url = `${location.origin}/p/${patientId}`;
    if (navigator.share) {
      await navigator.share({ title: "ডেঙ্গুসাথী", text: "রোগীর অবস্থা দেখুন", url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={share} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-200">
      {copied ? "✓ লিংক কপি হয়েছে" : "🔗 পরিবারের সাথে শেয়ার"}
    </button>
  );
}
