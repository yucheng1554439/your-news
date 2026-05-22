import Link from "next/link";

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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-900/40 via-zinc-950 to-zinc-950"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-zinc-800/20 blur-3xl"
        aria-hidden
      />

      <div className="relative w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <Link
            href="/"
            className="font-serif text-xl text-white transition-opacity hover:opacity-80"
          >
            Your News
          </Link>
          <h1 className="font-serif text-2xl text-white sm:text-3xl">{title}</h1>
          <p className="text-sm text-zinc-400">{subtitle}</p>
        </div>

        {children}

        <p className="text-center text-sm text-zinc-500">
          {alternateLabel}{" "}
          <Link
            href={alternateHref}
            className="text-zinc-300 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            Continue here
          </Link>
        </p>
      </div>
    </div>
  );
}
