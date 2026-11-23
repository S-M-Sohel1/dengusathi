import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <span className="text-6xl">🔍</span>
      <h1 className="text-2xl font-bold">পাতাটি পাওয়া যায়নি</h1>
      <p className="text-slate-600">লিংকটি ভুল হতে পারে, অথবা রোগীর তথ্য মুছে ফেলা হয়েছে।</p>
      <Link href="/" className="btn-primary">হোমে ফিরুন</Link>
    </main>
  );
}
