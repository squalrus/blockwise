import type { Metadata } from "next";
import { APP_URL } from "@/lib/appUrl";
import { LegalLayout, LegalSection } from "../LegalLayout";

export const metadata: Metadata = {
  title: "FAQ — Spored",
  description: "Answers to common questions about Spored — neighborhoods, check-ins, events, and businesses.",
  alternates: { canonical: "/faq" },
};

const UPDATED = "July 17, 2026";

function Question({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-bold" style={{ color: "#2B1B12" }}>
        {q}
      </p>
      <p className="mt-1.5">{children}</p>
    </div>
  );
}

export default function FaqPage() {
  return (
    <LegalLayout title="Frequently asked questions" updated={UPDATED}>
      <LegalSection title="General">
        <Question q="What is Spored?">
          Spored is a neighborhood exploration and connection app. Check in at local spots, earn points and
          badges, and see what&apos;s happening around you — a fun, lighthearted mycelial network that grows
          as your neighborhood does.
        </Question>
        <Question q="Is Spored free?">
          Yes. Creating an account and using the core app — check-ins, badges, challenges, and browsing
          neighborhoods and events — is completely free.
        </Question>
        <Question q="What neighborhoods does Spored cover?">
          Spored is growing one neighborhood at a time. Browse{" "}
          <a href={`${APP_URL}/neighborhoods`} className="font-bold">
            all neighborhoods
          </a>{" "}
          to see what&apos;s live near you, or reach out if you&apos;d like to start one for your own block.
        </Question>
      </LegalSection>

      <LegalSection title="Check-ins, points, and badges">
        <Question q="How do check-ins work?">
          Walk into a participating business or spot, open Spored, and tap to check in — no scanning or extra
          steps required.
        </Question>
        <Question q="What do points, badges, and the leaderboard do?">
          Every check-in earns you points. Points unlock badges as you explore, and your running total puts
          you on your neighborhood&apos;s leaderboard, which resets each season.
        </Question>
      </LegalSection>

      <LegalSection title="Events">
        <Question q="Does Spored show local events?">
          Yes. Neighborhoods and businesses publish events — block parties, farmers markets, specials — either
          entered directly or synced from an external calendar feed. Your neighborhood page shows what&apos;s
          happening today and what&apos;s coming up.
        </Question>
        <Question q="Can I save an event to find it later?">
          Yes. Tap &ldquo;Follow&rdquo; on any event to save it to your account&apos;s Favorites tab. Events
          you&apos;re following that are happening today are also highlighted at the top of your Spore Feed.
        </Question>
      </LegalSection>

      <LegalSection title="For businesses">
        <Question q="How do I claim my business listing?">
          Find your business on Spored, tap &ldquo;Own this business?&rdquo; on its page, and submit a claim
          with your name. Once verified, you can manage your listing and see who&apos;s checking in.
        </Question>
        <Question q="Is claiming a listing free?">
          Yes, claiming and managing your basic listing on Spored is free.
        </Question>
      </LegalSection>

      <LegalSection title="Privacy and your account">
        <Question q="Can other users see my check-ins or activity?">
          Only if your profile is public. New accounts default to public (badges, check-in count, and
          neighbor count are visible to others), but you can switch to private at any time from Account
          settings. See our{" "}
          <a href="/privacy" className="font-bold">
            Privacy Policy
          </a>{" "}
          for details.
        </Question>
        <Question q="How do I delete my account?">
          You can delete your account at any time from Account settings. See our{" "}
          <a href="/privacy" className="font-bold">
            Privacy Policy
          </a>{" "}
          for what happens to your data.
        </Question>
        <Question q="I have another question — how do I reach you?">
          Email us at{" "}
          <a href="mailto:hello@tryspored.com" className="font-bold">
            hello@tryspored.com
          </a>
          .
        </Question>
      </LegalSection>
    </LegalLayout>
  );
}
