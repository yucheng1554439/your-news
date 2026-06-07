import Link from "next/link";
import { LEGAL } from "@/lib/legal/site";

export function LegalPageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <header className="border-b border-white/10 px-6 py-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link href="/" className="font-serif text-xl text-white">
            Your News
          </Link>
          <nav className="flex gap-4 text-sm text-zinc-400">
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/support" className="hover:text-white">
              Support
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-serif text-3xl text-white">{title}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Last updated: {LEGAL.lastUpdated}
        </p>
        <article className="prose prose-invert mt-8 max-w-none prose-p:text-zinc-300 prose-headings:font-serif prose-headings:text-white prose-li:text-zinc-300">
          {children}
        </article>
      </main>
    </div>
  );
}
