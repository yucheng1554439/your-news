"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { getOnboardingProfile, resetOnboarding } from "@/lib/onboarding";
import { useOnboardingSync } from "@/hooks/use-onboarding-sync";

const careerLabels: Record<string, string> = {
  engineer: "Software Engineer",
  investor: "Investor",
  founder: "Founder",
  executive: "Executive",
  researcher: "Researcher",
};

function SettingsContent({ userId }: { userId: string }) {
  const router = useRouter();
  const { user } = useUser();
  const profile = getOnboardingProfile(userId);

  const handleReset = async () => {
    resetOnboarding(userId);
    await user?.reload();
    router.push("/onboarding/interests");
  };

  return (
    <section className="mt-10 space-y-6">
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
        <h2 className="font-serif text-lg text-white">Account</h2>
        {user ? (
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-zinc-500">Name</dt>
              <dd className="mt-1 text-zinc-200">{user.fullName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Email</dt>
              <dd className="mt-1 text-zinc-200">
                {user.primaryEmailAddress?.emailAddress ?? "—"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">Loading account…</p>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
        <h2 className="font-serif text-lg text-white">Personalization</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-zinc-500">Interests</dt>
            <dd className="mt-1 capitalize text-zinc-200">
              {profile.interests.length > 0
                ? profile.interests.join(", ")
                : "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Career</dt>
            <dd className="mt-1 text-zinc-200">
              {profile.career ? careerLabels[profile.career] : "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Focus</dt>
            <dd className="mt-1 capitalize text-zinc-200">
              {profile.focusType ?? "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Tone</dt>
            <dd className="mt-1 capitalize text-zinc-200">
              {profile.tone ?? "Not set"}
            </dd>
          </div>
        </dl>
        <Button
          variant="outline"
          className="mt-6 rounded-full border-white/10 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white"
          onClick={() => router.push("/settings/personalize/interests")}
        >
          Edit personalization
        </Button>
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
        <h2 className="font-serif text-lg text-white">Saved stories</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Your bookmarked intelligence — synced to your account.
        </p>
        <Button
          variant="outline"
          className="mt-4 rounded-full border-white/10 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white"
          onClick={() => router.push("/saved")}
        >
          View saved stories
        </Button>
      </div>

      <Button
        variant="ghost"
        className="text-zinc-500 hover:text-zinc-300"
        onClick={() => void handleReset()}
      >
        Reset onboarding
      </Button>
    </section>
  );
}

export default function SettingsPage() {
  const { synced, userId } = useOnboardingSync();

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-serif text-3xl text-white">Settings</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Account, profile, and personalization
        </p>

        {!synced || !userId ? (
          <p className="mt-10 text-sm text-zinc-500">Loading…</p>
        ) : (
          <SettingsContent key={userId} userId={userId} />
        )}
      </main>
    </div>
  );
}
