import { DashboardView } from "./dashboard-view";

export default function DashboardPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">হাসপাতাল ও উপজেলা ড্যাশবোর্ড</h1>
          <p className="text-slate-600">বাসায় থাকা ডেঙ্গু রোগীদের বেনামি চিত্র: কোন এলাকা থেকে গুরুতর রোগী আসছে, আগেভাগে জানুন</p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">প্রোটোটাইপ: কৃত্রিম (synthetic) ডেটা</span>
      </header>
      <DashboardView />
    </main>
  );
}
