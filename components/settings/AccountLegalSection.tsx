"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteAccountAction } from "@/app/actions/delete-account";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { privacyPolicyUrl, supportUrl, termsOfServiceUrl } from "@/lib/legal/site";

export function AccountLegalSection() {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
      <h2 className="font-serif text-lg text-white">Legal & support</h2>
      <ul className="mt-4 space-y-2 text-sm">
        <li>
          <Link href="/privacy" className="text-zinc-300 underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
          <span className="text-zinc-600"> — {privacyPolicyUrl()}</span>
        </li>
        <li>
          <Link href="/terms" className="text-zinc-300 underline-offset-2 hover:underline">
            Terms of Service
          </Link>
        </li>
        <li>
          <Link href="/support" className="text-zinc-300 underline-offset-2 hover:underline">
            Support
          </Link>
          <span className="text-zinc-600"> — {supportUrl()}</span>
        </li>
      </ul>
    </div>
  );
}

export function DeleteAccountSection() {
  const router = useRouter();
  const { signOut } = useClerk();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDelete = async () => {
    const confirmed = window.confirm(
      "Delete your account permanently? This removes your profile, saved stories, and personalized intelligence. This cannot be undone."
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    const result = await deleteAccountAction();
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    await signOut();
    router.push("/sign-in");
  };

  return (
    <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-6">
      <h2 className="font-serif text-lg text-white">Delete account</h2>
      <p className="mt-2 text-sm text-zinc-400">
        Permanently delete your account and all associated data stored by Your
        News.
      </p>
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      <Button
        variant="destructive"
        className="mt-4 rounded-full"
        disabled={loading}
        onClick={() => void onDelete()}
      >
        {loading ? "Deleting…" : "Delete my account"}
      </Button>
    </div>
  );
}
