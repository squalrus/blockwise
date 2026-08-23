import type { Metadata } from "next";
import Link from "next/link";
import { APP_URL } from "@/lib/appUrl";
import { LegalLayout, LegalSection } from "../LegalLayout";

export const metadata: Metadata = {
  title: "FAQ — Spored",
  description: "Answers to common questions about Spored — neighborhoods, check-ins, events, and businesses.",
  alternates: { canonical: "/faq" },
};

const UPDATED = "August 22, 2026";

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
        <Question q="How do I report a bug or request a feature?">
          Open your account menu (tap your avatar) and choose &ldquo;Send feedback.&rdquo; Pick Bug report or
          Feature idea and describe it in a few sentences — we read every submission. Submitting one earns a
          Feedback Giver badge, and if it&apos;s implemented you&apos;ll earn a Contributor badge too.
        </Question>
        <Question q="Can I install Spored on my phone?">
          Yes. On Android/Chrome, an &ldquo;Install&rdquo; banner appears — tap it to add Spored to your home
          screen. On iPhone, tap the Share button in Safari, then &ldquo;Add to Home Screen&rdquo; (iOS
          doesn&apos;t offer an automatic install prompt). Either way, Spored opens full-screen like a regular
          app. You can also turn on push notifications from Account settings; on iPhone, notifications only work
          once Spored is installed to your home screen.
        </Question>
      </LegalSection>

      <LegalSection title="Check-ins, points, and badges">
        <Question q="How do check-ins work?">
          Walk into a participating business or spot, open Spored, and tap to check in — no scanning or extra
          steps required.
        </Question>
        <Question q="What do points, badges, and the leaderboard do?">
          Every check-in earns you points. Points unlock badges as you explore, and your running total puts
          you on your neighborhood&apos;s leaderboard (lifetime points, resets each season) — a different
          ranking from Top Caps below, which tracks recent visit frequency rather than points.
        </Question>
        <Question q="What are the mushrooms on a business, POI, or neighborhood page, and what are Top Caps?">
          Each place and neighborhood grows its own little mushroom patch — one mushroom per distinct visitor
          over the last 60 days, sized by how often they&apos;ve checked in. A neighborhood page also shows
          &ldquo;Top Caps&rdquo;: badges naming its 3 most frequent recent visitors and how many times each
          checked in. A business or point of interest page instead shows just its single most frequent
          visitor, as a &ldquo;Top Cap&rdquo; sign next to the patch. Either way, only public profiles are
          named.
        </Question>
        <Question q="What is the Collection tab?">
          Every venue you check into, every neighborhood you join, and every neighbor you connect with has its
          own unique mushroom &ldquo;species,&rdquo; discovered the first time you check in, join, or connect.
          Your account&apos;s Collection tab shows every species you&apos;ve found so far — revisiting a place,
          rejoining a neighborhood, or reconnecting with someone bumps that entry&apos;s count instead of
          adding a duplicate.
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
        <Question q="Can businesses post coupons?">
          Yes. A claimed business can post a limited-quantity coupon with a start and end date. Followers unlock
          a copy by checking in at the venue, then redeem it in person by showing staff their phone and sliding
          to confirm — no scanning required. Once redeemed, a coupon can&apos;t be reused.
        </Question>
      </LegalSection>

      <LegalSection title="Privacy and your account">
        <Question q="Can other users see my check-ins or activity?">
          Only if your profile is public. New accounts default to public (badges, check-in count, neighbor
          count, and — if you&apos;re among the most frequent recent visitors somewhere — a &ldquo;Top
          Cap&rdquo; sign or &ldquo;Top Caps&rdquo; badge are visible to others), but you can switch to
          private at any time from Account settings. See our{" "}
          <Link href="/privacy" className="font-bold">
            Privacy Policy
          </Link>{" "}
          for details.
        </Question>
        <Question q="How do I delete my account?">
          You can delete your account at any time from Account settings. See our{" "}
          <Link href="/privacy" className="font-bold">
            Privacy Policy
          </Link>{" "}
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
