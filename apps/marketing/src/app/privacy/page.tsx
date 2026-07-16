import type { Metadata } from "next";
import { LegalLayout, LegalSection } from "../LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy — Spored",
  description: "How Spored collects, uses, and protects your information.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "July 16, 2026";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated={UPDATED}>
      <p>
        This Privacy Policy explains what information Spored collects, how we use it, and the choices you have. It
        applies to our website and app (together, the "Service").
      </p>

      <LegalSection title="1. Information we collect">
        <p>
          <strong>Account information.</strong> When you sign up, we collect an email address and password, or —
          if you sign in with Google — the name, email, and profile photo Google shares with us. You can also set a
          username, display name, and avatar.
        </p>
        <p>
          <strong>Location data.</strong> Checking in at a business or point of interest requires your device's GPS
          location at that moment, so we can confirm you're physically there. We don't track your location
          continuously or in the background — only at the moment you initiate a check-in.
        </p>
        <p>
          <strong>Usage data.</strong> We use Google Analytics (GA4) on both our marketing site and the app to
          understand aggregate traffic and feature usage — pageviews and, in the app, key actions like check-ins,
          favorites, and coupon redemptions. This is separate from and doesn't include your precise check-in GPS
          coordinates.
        </p>
        <p>
          <strong>Content you provide.</strong> Anything you add directly — profile details, business
          announcements/events (if you manage a claimed business), coupon redemptions, and connections with other
          users.
        </p>
      </LegalSection>

      <LegalSection title="2. How we use this information">
        <ul className="list-disc pl-5">
          <li>To operate core features: check-ins, favorites, badges, challenges, and leaderboards;</li>
          <li>To personalize your experience, like showing nearby businesses and neighborhoods;</li>
          <li>To verify business claims and check-in authenticity;</li>
          <li>To understand aggregate usage so we can improve the Service; and</li>
          <li>To communicate with you about your account or the Service.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Who we share it with">
        <p>
          We don't sell your personal information. We share data with service providers who help us run Spored,
          under obligations to protect it — including Supabase (authentication and database hosting), Google
          (sign-in and Analytics), and Netlify (hosting). Other users can see information tied to your profile
          according to your visibility setting (public or private) — for example, a public profile's badges,
          check-in count, and neighbor count are visible to others; private profiles are not. New accounts default
          to public; you can switch to private at any time from Account settings.
        </p>
      </LegalSection>

      <LegalSection title="4. Cookies and similar technologies">
        <p>
          We use cookies/local storage to keep you signed in, remember preferences (like light/dark theme), and
          via Google Analytics, to distinguish visitors for aggregate usage reporting. You can control cookies
          through your browser settings, though some features may not work correctly without them.
        </p>
      </LegalSection>

      <LegalSection title="5. Data retention">
        <p>
          We keep your account information for as long as your account is active. If you delete your account, we
          delete or anonymize your personal information, except where we need to retain it to comply with law or
          resolve disputes.
        </p>
      </LegalSection>

      <LegalSection title="6. Your choices">
        <ul className="list-disc pl-5">
          <li>Edit your profile information or change your visibility setting at any time from Account settings;</li>
          <li>Delete your account, which removes your personal information as described above; and</li>
          <li>Decline location permission, though this means you won't be able to check in.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Children's privacy">
        <p>
          Spored isn't directed at children under 13, and we don't knowingly collect personal information from
          them. If you believe a child has provided us with personal information, contact us and we'll remove it.
        </p>
      </LegalSection>

      <LegalSection title="8. Security">
        <p>
          We use reasonable technical and organizational measures to protect your information. No method of
          transmission or storage is completely secure, so we can't guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. If we make material changes, we'll update the date
          at the top of this page.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          Questions about this policy? Reach us at{" "}
          <a href="mailto:hello@tryspored.com" className="font-bold">
            hello@tryspored.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
