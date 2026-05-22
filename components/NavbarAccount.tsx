"use client";

import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

const authButtonClass =
  "rounded-full border border-white/10 bg-transparent px-3.5 py-1.5 text-sm text-zinc-300 transition-colors hover:border-white/20 hover:text-white";

const signUpButtonClass =
  "rounded-full border border-white/10 bg-white px-3.5 py-1.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200";

export function NavbarAccount() {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <Show when="signed-out">
        <SignInButton mode="redirect" forceRedirectUrl="/">
          <button type="button" className={authButtonClass}>
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="redirect" forceRedirectUrl="/onboarding/interests">
          <button type="button" className={signUpButtonClass}>
            Sign up
          </button>
        </SignUpButton>
      </Show>

      <Show when="signed-in">
        <UserButton
          appearance={clerkAppearance}
          userProfileMode="navigation"
          userProfileUrl="/settings"
        />
      </Show>
    </div>
  );
}
