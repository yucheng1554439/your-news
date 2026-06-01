import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/AuthShell";
import { clerkAuthAppearance } from "@/lib/clerk-appearance";

export default function SignInPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to resume your personalized briefing — daily events, weekly patterns, and a feed tuned to how you read."
      alternateHref="/sign-up"
      alternateLabel="New to Your News?"
    >
      <SignIn
        appearance={clerkAuthAppearance}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
      />
    </AuthShell>
  );
}
