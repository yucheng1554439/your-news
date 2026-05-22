import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/AuthShell";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Begin your briefing"
      subtitle="Create an account to personalize your intelligence feed"
      alternateHref="/sign-in"
      alternateLabel="Already have an account?"
    >
      <SignUp
        appearance={clerkAppearance}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/onboarding/interests"
      />
    </AuthShell>
  );
}
