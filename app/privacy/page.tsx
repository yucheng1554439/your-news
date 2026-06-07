import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { LEGAL } from "@/lib/legal/site";

export const metadata: Metadata = {
  title: "Privacy Policy — Your News",
  description:
    "How Your News collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      <p>
        {LEGAL.companyName} (&quot;Your News,&quot; &quot;we,&quot; &quot;us&quot;)
        respects your privacy. This policy describes what we collect when you use
        our website and mobile applications, how we use it, and your choices.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account information</strong> — email address, name, and
          authentication identifiers provided through our identity provider
          (Clerk), including when you sign in with email, Google, or Sign in
          with Apple.
        </li>
        <li>
          <strong>Profile and preferences</strong> — onboarding selections
          (interests, career, reading preferences), topic boosts and mutes, and
          saved stories you choose to bookmark.
        </li>
        <li>
          <strong>Usage data</strong> — in-app interactions used to personalize
          your intelligence feed (e.g., stories saved, topics adjusted). We do
          not sell this data.
        </li>
        <li>
          <strong>Device information</strong> — standard mobile device
          identifiers and app version required to deliver the service and
          authenticate API requests.
        </li>
      </ul>

      <h2>Information we do not collect</h2>
      <ul>
        <li>
          We do <strong>not</strong> currently integrate third-party advertising
          or analytics SDKs (e.g., Firebase Analytics, Meta SDK) in the mobile
          app.
        </li>
        <li>
          We do <strong>not</strong> collect precise location, contacts, photos,
          microphone, or camera data.
        </li>
        <li>
          We do <strong>not</strong> collect payment information — the app has
          no in-app purchases at this time.
        </li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>Authenticate you and maintain your account</li>
        <li>Generate personalized intelligence briefings and feed rankings</li>
        <li>Sync saved stories and preferences across devices</li>
        <li>Improve product quality, security, and reliability</li>
        <li>Respond to support requests</li>
      </ul>

      <h2>AI processing</h2>
      <p>
        News content is processed server-side using AI providers (Anthropic
        Claude and, optionally, OpenAI) to generate briefings and summaries. Your
        profile preferences inform personalization. We do not use your data to
        train public foundation models; processing is limited to delivering the
        service under our agreements with AI providers.
      </p>

      <h2>Third-party services</h2>
      <ul>
        <li>
          <strong>Clerk</strong> — authentication (
          <a href="https://clerk.com/privacy">clerk.com/privacy</a>)
        </li>
        <li>
          <strong>Upstash / Vercel KV</strong> — encrypted persistence for
          profiles and intelligence snapshots
        </li>
        <li>
          <strong>Vercel</strong> — application hosting
        </li>
        <li>
          <strong>NewsAPI</strong> — server-side news ingestion (your device does
          not contact NewsAPI directly)
        </li>
        <li>
          <strong>Anthropic / OpenAI</strong> — AI intelligence generation
          (server-side only)
        </li>
        <li>
          <strong>Apple / Google</strong> — only when you choose Sign in with
          Apple or Google; governed by their respective policies
        </li>
      </ul>

      <h2>Data retention</h2>
      <p>
        We retain account and profile data while your account is active. When you
        delete your account (in Settings), we delete your user profile and
        intelligence snapshots from our persistence layer and remove your Clerk
        authentication record.
      </p>

      <h2>Account deletion</h2>
      <p>
        You may delete your account at any time from{" "}
        <strong>Settings → Delete account</strong> in the mobile app or web
        settings. Deletion is permanent and removes your stored preferences,
        saved stories, and personalized intelligence profile.
      </p>

      <h2>Children</h2>
      <p>
        Your News is not directed to children under 13. We do not knowingly
        collect personal information from children under 13.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on your jurisdiction, you may have rights to access, correct,
        or delete personal data. Contact us at{" "}
        <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a> to
        exercise these rights.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy. Material changes will be reflected by updating
        the &quot;Last updated&quot; date above.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy inquiries:{" "}
        <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>
        <br />
        Support:{" "}
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>
      </p>
    </LegalPageShell>
  );
}
