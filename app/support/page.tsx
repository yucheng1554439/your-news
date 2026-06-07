import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { LEGAL } from "@/lib/legal/site";

export const metadata: Metadata = {
  title: "Support — Your News",
  description: "Get help with Your News.",
};

export default function SupportPage() {
  return (
    <LegalPageShell title="Support">
      <p>
        Need help with Your News? We&apos;re here to assist with account access,
        briefings, and technical issues.
      </p>

      <h2>Contact</h2>
      <p>
        Email:{" "}
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>
        <br />
        We aim to respond within 2 business days.
      </p>

      <h2>Common questions</h2>

      <h3>How do I refresh my intelligence briefing?</h3>
      <p>
        Open <strong>Settings → Intelligence</strong> (mobile) or Settings on
        web, then tap <strong>Refresh Intelligence</strong>. This may take a few
        minutes.
      </p>

      <h3>How do I delete my account?</h3>
      <p>
        Go to <strong>Settings → Delete account</strong> in the app or web.
        Deletion is permanent and removes your profile, saved stories, and
        personalized data.
      </p>

      <h3>Why does Sign in with Apple / Google not work?</h3>
      <p>
        Ensure you have a network connection and the latest app version. If
        problems persist, try email sign-in or contact support with your device
        model and iOS version.
      </p>

      <h3>Is my data used for advertising?</h3>
      <p>
        No. We do not serve ads or use third-party analytics SDKs. See our{" "}
        <Link href="/privacy">Privacy Policy</Link> for details.
      </p>

      <h2>App Store review</h2>
      <p>
        For Apple App Review, a demo account can be provided in App Store
        Connect App Review Information. Contact{" "}
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> if you
        are a reviewer needing assistance.
      </p>
    </LegalPageShell>
  );
}
