import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/AuthShell";
import { clerkAuthAppearance } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Begin your briefing"
      subtitle="Create an account to unlock a personal intelligence desk — ranked stories, advisor-style analysis, and briefings built for your role."
      alternateHref="/sign-in"
      alternateLabel="Already have an account?"
    >
      <SignUp
        appearance={clerkAuthAppearance}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/onboarding/interests"
      />
    </AuthShell>
  );
}
