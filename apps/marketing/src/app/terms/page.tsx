import type { Metadata } from "next";
import { LegalLayout, LegalSection } from "../LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service — Spored",
  description: "The terms that govern your use of Spored.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "July 20, 2026";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated={UPDATED}>
      <p>
        These Terms of Service ("Terms") govern your access to and use of Spored, including our website, mobile
        experience, and related services (together, the "Service"). By creating an account or otherwise using the
        Service, you agree to these Terms. If you don't agree, please don't use the Service.
      </p>

      <LegalSection title="1. Who can use Spored">
        <p>
          You must be at least 13 years old to create an account. If you're under the age of majority in your
          jurisdiction, you may only use the Service with the involvement of a parent or guardian.
        </p>
      </LegalSection>

      <LegalSection title="2. Your account">
        <p>
          You can create an account with an email and password or through a third-party sign-in provider (e.g.
          Google). You're responsible for keeping your credentials secure and for all activity under your account.
          Let us know right away if you believe your account has been compromised.
        </p>
      </LegalSection>

      <LegalSection title="3. Check-ins and location data">
        <p>
          Spored's core feature lets you "check in" at neighborhood businesses and points of interest, which
          requires sharing your device's location at the moment of check-in so we can confirm you're actually
          there. Don't attempt to check in from a location you're not physically at, spoof your device's location,
          or otherwise circumvent the check-in verification.
        </p>
      </LegalSection>

      <LegalSection title="4. Business accounts and claims">
        <p>
          If you claim a business listing on behalf of a company, you represent that you're authorized to act on
          that business's behalf. We may verify claims and may reject or revoke a claim at our discretion, including
          if we believe it's fraudulent.
        </p>
      </LegalSection>

      <LegalSection title="5. Content you submit">
        <p>
          You retain ownership of any content you submit to Spored (profile information, business coupons and
          events, and similar). By submitting content, you grant Spored a worldwide, non-exclusive, royalty-free
          license to host, display, and distribute it as part of operating the Service. You're responsible for
          content you submit and confirm you have the right to share it.
        </p>
      </LegalSection>

      <LegalSection title="6. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5">
          <li>Use the Service for any unlawful purpose or in violation of these Terms;</li>
          <li>Impersonate another person or misrepresent your affiliation with a business;</li>
          <li>Interfere with or disrupt the Service, including through scripted or automated access; or</li>
          <li>Attempt to access another user's account or data without authorization.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Points, badges, and rewards">
        <p>
          Points, badges, challenges, and coupons are provided for engagement and have no cash value unless we state
          otherwise. We may adjust point values, retire badges/challenges, or void rewards obtained through
          fraudulent activity (like spoofed check-ins) at any time.
        </p>
      </LegalSection>

      <LegalSection title="8. Termination">
        <p>
          You may stop using the Service and delete your account at any time. We may suspend or terminate your
          access if we reasonably believe you've violated these Terms.
        </p>
      </LegalSection>

      <LegalSection title="9. Disclaimers">
        <p>
          The Service is provided "as is" without warranties of any kind. We don't guarantee that business
          information (hours, offers, availability) displayed through the Service is accurate or current — always
          confirm directly with the business before visiting.
        </p>
      </LegalSection>

      <LegalSection title="10. Limitation of liability">
        <p>
          To the fullest extent permitted by law, Spored won't be liable for any indirect, incidental, or
          consequential damages arising from your use of the Service.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to these Terms">
        <p>
          We may update these Terms from time to time. If we make material changes, we'll update the date at the
          top of this page. Continuing to use the Service after changes take effect means you accept the updated
          Terms.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>
          Questions about these Terms? Reach us at{" "}
          <a href="mailto:hello@tryspored.com" className="font-bold">
            hello@tryspored.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
