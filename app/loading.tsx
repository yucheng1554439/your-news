import { Navbar } from "@/components/Navbar";

export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="space-y-8">
          <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-zinc-900/50" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/2] animate-pulse rounded-xl border border-white/10 bg-zinc-900/50"
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
