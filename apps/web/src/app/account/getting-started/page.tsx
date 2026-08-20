"use client";

import { useEffect, useState } from "react";
import type { OnboardingChecklist } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { ProgressBar } from "../../ProgressBar";

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "ready"; checklist: OnboardingChecklist };

interface ChecklistStep {
  key: keyof OnboardingChecklist;
  title: string;
  description: string;
  href: string;
  cta: string;
}

// Reached from AccountMenu's "Getting started" entry (only shown there while
// incomplete) -- every step's done/not-done state comes straight from
// GET /me/onboarding, itself a thin read over data that already exists for
// its own reason (neighborhood membership, username, mushroom_customization,
// a checkin row, an accepted connection) rather than a dedicated
// onboarding-progress table. There's nothing to mark "done" here directly --
// each CTA just sends the user to go do the actual thing.
const STEPS: ChecklistStep[] = [
  {
    key: "has_neighborhood",
    title: "Join a neighborhood",
    description: "Pick the neighborhood you want to explore -- everything else starts here.",
    href: "/neighborhoods",
    cta: "Browse neighborhoods",
  },
  {
    key: "has_username",
    title: "Add a username",
    description: "Claim a handle so neighbors can find your profile and connect with you.",
    href: "/account/settings",
    cta: "Go to settings",
  },
  {
    key: "has_customized_mushroom",
    title: "Customize your mushroom",
    description: "Shape, colors, spots -- make the mushroom that represents you your own.",
    href: "/account/settings",
    cta: "Customize",
  },
  {
    key: "has_checkin",
    title: "Check in to your first spot",
    description: "Visit a nearby venue and check in to start earning points.",
    href: "/checkin",
    cta: "Check in",
  },
  {
    key: "has_connection",
    title: "Make a friend",
    description: "Connect with a neighbor to grow your reach in the neighborhood.",
    href: "/account/neighbors",
    cta: "Find neighbors",
  },
];

async function load(setState: (state: State) => void) {
  const user = await getCurrentUser();
  if (!user) {
    setState({ status: "signed_out" });
    return;
  }

  const token = await getAccessToken();
  const res = await fetch(clientApiUrl("/me/onboarding"), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    setState({ status: "error", message: "Failed to load your checklist" });
    return;
  }
  setState({ status: "ready", checklist: await res.json() });
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12l6 6L20 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChecklistRow({ step, index, done }: { step: ChecklistStep; index: number; done: boolean }) {
  return (
    <div className="flex items-start gap-3.5 rounded-2xl bg-card-alt px-4 py-3.5">
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
          done ? "bg-brand-green text-on-accent" : "border-2 border-border text-muted"
        }`}
      >
        {done ? <CheckIcon /> : index + 1}
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <p className={`text-sm font-extrabold ${done ? "text-muted line-through" : "text-foreground"}`}>
          {step.title}
        </p>
        <p className="text-xs text-muted">{step.description}</p>
      </div>
      {!done && (
        <a
          href={step.href}
          className="shrink-0 rounded-full bg-brand-purple px-3 py-1.5 text-xs font-extrabold whitespace-nowrap text-on-accent"
        >
          {step.cta}
        </a>
      )}
    </div>
  );
}

export default function GettingStartedPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    load(setState);
  }, []);

  const checklist = state.status === "ready" ? state.checklist : null;
  const done = checklist ? STEPS.filter((step) => checklist[step.key]).length : 0;
  const allDone = done === STEPS.length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 font-sans sm:p-16">
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-xl font-extrabold text-foreground">Getting started</h1>
        <a href="/account" className="text-sm font-bold text-brand-purple hover:text-brand-orange">
          Back to account
        </a>
      </div>

      {state.status === "loading" && (
        <div className="flex min-h-[30vh] items-center justify-center">
          <MushroomLoader size={72} />
        </div>
      )}

      {state.status === "signed_out" && (
        <p className="text-sm text-muted">
          <a href="/login" className="font-bold text-brand-purple hover:text-brand-orange">
            Log in
          </a>{" "}
          to see your getting-started checklist.
        </p>
      )}

      {state.status === "error" && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}

      {state.status === "ready" && checklist && (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold text-foreground">
              {allDone ? "You've completed every step!" : `${done} of ${STEPS.length} done`}
            </p>
            <ProgressBar percent={(done / STEPS.length) * 100} height={10} />
          </div>

          <div className="flex flex-col gap-2.5">
            {STEPS.map((step, index) => (
              <ChecklistRow key={step.key} step={step} index={index} done={checklist[step.key]} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
