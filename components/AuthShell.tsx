import Link from "next/link";

const VALUE_PROPS = [
  {
    title: "Personal intelligence",
    detail: "For You and Global strategic briefings — not headline noise.",
  },
  {
    title: "Personal relevance",
    detail: "Ranked for your career, interests, and reading behavior.",
  },
  {
    title: "Corroborated coverage",
    detail: "Synthesized across major outlets with source transparency.",
  },
];

interface AuthShellProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  alternateHref: string;
  alternateLabel: string;
}

export function AuthShell({
  children,
  title,
  subtitle,
  alternateHref,
  alternateLabel,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen bg-zinc-950">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,120,120,0.15),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-[44%_1fr]">
        {/* Brand panel — entire block centered vertically */}
        <aside className="flex items-center justify-center border-b border-white/10 px-6 py-12 lg:border-b-0 lg:border-r lg:px-10 lg:py-0">
          <div className="auth-marketing-panel w-full max-w-md">
            <Link
              href="/"
              className="inline-block font-serif text-2xl tracking-tight text-white transition-opacity hover:opacity-80"
            >
              Your News
            </Link>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              Personal intelligence desk
            </p>
            <h1 className="mt-8 font-serif text-3xl leading-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
              {title}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-zinc-400">
              {subtitle}
            </p>

            <ul className="mt-10 space-y-5">
              {VALUE_PROPS.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/80"
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-500">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-10 text-xs text-zinc-600">
              Trusted by professionals who need signal, not scroll.
            </p>
          </div>
        </aside>

        {/* Auth panel — centered vertically to match left column */}
        <main className="flex items-center justify-center px-6 py-12 lg:px-12 lg:py-0">
          <div className="auth-form-panel relative z-10 w-full max-w-[420px] space-y-6">
            <div className="auth-clerk-root">{children}</div>

            <p className="text-center text-sm text-zinc-400">
              {alternateLabel}{" "}
              <Link
                href={alternateHref}
                className="font-medium text-zinc-200 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                Continue here
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
