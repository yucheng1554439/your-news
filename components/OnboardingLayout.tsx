import Link from "next/link";

interface OnboardingLayoutProps {
  children: React.ReactNode;
  step: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  backHref?: string;
}

export function OnboardingLayout({
  children,
  step,
  totalSteps,
  title,
  subtitle,
  backHref,
}: OnboardingLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-900/50 via-zinc-950 to-zinc-950"
          aria-hidden
        />

        <div className="relative w-full max-w-lg space-y-8">
          <div className="space-y-2 text-center">
            <Link
              href="/"
              className="font-serif text-lg text-white/80 transition-opacity hover:opacity-100"
            >
              Your News
            </Link>
            <div className="flex justify-center gap-1.5 pt-4">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1 w-8 rounded-full transition-colors ${
                    i < step ? "bg-white/60" : "bg-white/10"
                  }`}
                />
              ))}
            </div>
            <h1 className="font-serif text-2xl text-white sm:text-3xl">
              {title}
            </h1>
            <p className="text-sm text-zinc-400">{subtitle}</p>
          </div>

          {children}

          {backHref && (
            <div className="text-center">
              <Link
                href={backHref}
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Back
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
