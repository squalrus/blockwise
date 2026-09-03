import type { Metadata } from "next";
import { LegalLayout, LegalSection } from "../LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy — Spored",
  description: "How Spored collects, uses, and protects your information.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "September 2, 2026";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated={UPDATED}>
      <p>
        This Privacy Policy explains what information Spored collects, how we use it, and the choices you have. It
        applies to our website and app (together, the &quot;Service&quot;).
      </p>

      <LegalSection title="1. Information we collect">
        <p>
          <strong>Account information.</strong> When you sign up, we collect an email address and password, or —
          if you sign in with Google or Microsoft — the name, email, and profile photo that provider shares with
          us. You can also set a username, display name, and avatar.
        </p>
        <p>
          <strong>Location data.</strong> Checking in at a business or point of interest requires your device&apos;s GPS
          location at that moment, so we can confirm you&apos;re physically there. We don&apos;t track your location
          continuously or in the background — only at the moment you initiate a check-in.
        </p>
        <p>
          <strong>Usage data.</strong> We use Google Analytics (GA4) on both our marketing site and the app to
          understand aggregate traffic and feature usage — pageviews and, in the app, key actions like check-ins,
          favorites, and coupon redemptions. This is separate from and doesn&apos;t include your precise check-in GPS
          coordinates.
        </p>
        <p>
          <strong>Content you provide.</strong> Anything you add directly — profile details, business
          coupons/events (if you manage a claimed business), coupon claims and redemptions, connections with
          other users, and any bug report or feature request you submit through the app (tied to your account so
          we can follow up if needed).
        </p>
        <p>
          <strong>Push notification subscriptions.</strong> If you enable notifications, your browser generates a
          push subscription (an endpoint URL and encryption keys) for your device, which we store so we can send
          you notifications. Disabling notifications or clearing your browsing data removes it.
        </p>
        <p>
          <strong>Error diagnostics.</strong> If the app or website encounters an unexpected error, we log a
          technical description of it — the error message, a stack trace, and the page URL where it happened — so
          we can find and fix it. This diagnostic log isn&apos;t linked to your account.
        </p>
      </LegalSection>

      <LegalSection title="2. How we use this information">
        <ul className="list-disc pl-5">
          <li>To operate core features: check-ins, favorites, event follows, badges, challenges, and leaderboards;</li>
          <li>To personalize your experience, like showing nearby businesses and neighborhoods;</li>
          <li>To verify business claims and check-in authenticity;</li>
          <li>To understand aggregate usage so we can improve the Service; and</li>
          <li>To communicate with you about your account or the Service.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Who we share it with">
        <p>
          We don&apos;t sell your personal information. We share data with service providers who help us run Spored,
          under obligations to protect it — including Supabase (authentication and database hosting), Google
          (sign-in, Analytics, and delivering push notifications to Chrome/Android devices via Firebase Cloud
          Messaging), Microsoft (sign-in), Apple (delivering push notifications to Safari/iOS devices), Geoapify
          (business/place data and map tiles, sourced from OpenStreetMap), and Netlify (hosting). These push
          delivery services see the encrypted notification envelope and your device&apos;s push endpoint, not your
          account details. Other users can see information tied to your profile
          according to your visibility setting (public or private) — for example, a public profile&apos;s badges,
          check-in count, and neighbor count are visible to others; private profiles are not. New accounts default
          to public; you can switch to private at any time from Account settings.
        </p>
        <p>
          If your profile is public and you&apos;re among the 3 most frequent recent visitors (within a rolling
          60-day window) to a business, point of interest, or neighborhood, your username and visit count are
          shown to other users on that place&apos;s &quot;Top Caps&quot; badges. A business or point of interest
          page&apos;s Leaderboard tab shows this same ranking further down the list (up to 10 visitors). Private
          profiles are never named this way.
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
          <li>Delete your account, which removes your personal information as described above;</li>
          <li>Disable push notifications at any time from Account settings, which removes your subscription; and</li>
          <li>Decline location permission, though this means you won&apos;t be able to check in.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Children's privacy">
        <p>
          Spored isn&apos;t directed at children under 13, and we don&apos;t knowingly collect personal information from
          them. If you believe a child has provided us with personal information, contact us and we&apos;ll remove it.
        </p>
      </LegalSection>

      <LegalSection title="8. Security">
        <p>
          We use reasonable technical and organizational measures to protect your information. No method of
          transmission or storage is completely secure, so we can&apos;t guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. If we make material changes, we&apos;ll update the date
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
