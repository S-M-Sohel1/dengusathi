"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { STORAGE_KEY } from "~/app/_components/new-patient-form";

/** Shows "continue with your patient" when this phone already has one. */
export function ContinueCard() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => setId(localStorage.getItem(STORAGE_KEY)), []);
  if (!id) return null;
  return (
    <Link href={`/p/${id}`} className="card flex items-center gap-3 ring-2 ring-teal-600 hover:bg-teal-50">
      <span className="text-3xl">👤</span>
      <span className="flex-1">
        <span className="block font-bold">আপনার রোগীর পাতা</span>
        <span className="block text-sm text-slate-600">আজকের আপডেট দিতে এখানে চাপুন</span>
      </span>
      <span className="text-2xl text-teal-700">→</span>
    </Link>
  );
}
