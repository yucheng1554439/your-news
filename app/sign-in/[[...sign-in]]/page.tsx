import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/AuthShell";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignInPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your intelligence briefing"
      alternateHref="/sign-up"
      alternateLabel="New to Your News?"
    >
      <SignIn
        appearance={clerkAppearance}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
      />
    </AuthShell>
  );
}
