import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { LEGAL } from "@/lib/legal/site";

export const metadata: Metadata = {
  title: "Terms of Service — Your News",
  description: "Terms governing use of the Your News platform.",
};

export default function TermsOfServicePage() {
  return (
    <LegalPageShell title="Terms of Service">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use
        of {LEGAL.companyName} (&quot;Your News&quot;) website, mobile
        applications, and related services (collectively, the
        &quot;Service&quot;). By creating an account or using the Service, you
        agree to these Terms.
      </p>

      <h2>Eligibility</h2>
      <p>
        You must be at least 13 years old (or the minimum age in your
        jurisdiction) to use the Service. You are responsible for maintaining
        the confidentiality of your account credentials.
      </p>

      <h2>The Service</h2>
      <p>
        Your News provides AI-generated intelligence briefings and personalized
        news analysis based on publicly available news sources. Content is for
        informational purposes only and does not constitute financial, legal, or
        professional advice.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for unlawful purposes</li>
        <li>Attempt to access other users&apos; accounts or data</li>
        <li>Reverse engineer, scrape, or overload our systems</li>
        <li>Misrepresent AI-generated content as human journalism</li>
      </ul>

      <h2>Intellectual property</h2>
      <p>
        The Service, including its design, software, and branding, is owned by
        Your News. News article metadata and summaries may be subject to
        third-party rights. You retain ownership of content you provide (e.g.,
        preferences); you grant us a license to use it to operate the Service.
      </p>

      <h2>AI-generated content</h2>
      <p>
        Briefings and summaries are generated automatically and may contain
        errors or omissions. You should verify important information from
        primary sources before making decisions.
      </p>

      <h2>Account termination</h2>
      <p>
        You may delete your account at any time through in-app or web settings.
        We may suspend or terminate accounts that violate these Terms or pose
        security risks.
      </p>

      <h2>Disclaimer</h2>
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND.
        WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY
        AND FITNESS FOR A PARTICULAR PURPOSE.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, YOUR NEWS SHALL NOT BE LIABLE
        FOR INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM
        YOUR USE OF THE SERVICE.
      </p>

      <h2>Governing law</h2>
      <p>
        These Terms are governed by the laws of the State of Delaware, United
        States, without regard to conflict-of-law principles. Update this
        section to match your entity&apos;s jurisdiction before launch.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms:{" "}
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>
      </p>
    </LegalPageShell>
  );
}
