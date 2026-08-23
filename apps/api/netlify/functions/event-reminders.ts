import type { Config } from "@netlify/functions";
import { SupabaseAuthRepository } from "../../src/auth/supabaseRepository";
import { sendEventStartReminders } from "../../src/eventFollows/eventReminders";
import { SupabaseEventFollowRepository } from "../../src/eventFollows/supabaseRepository";
import { SupabasePushSubscriptionRepository } from "../../src/pushSubscriptions/supabaseRepository";
import { WebPushSender } from "../../src/pushSubscriptions/webPushSender";
import { getSupabaseClient } from "../../src/supabase";

// BACKLOG.md Ref 102: the repo's first scheduled (time-based, not
// request-driven) function -- see netlify.toml's `schedule` config for this
// function's cron. Every run's window overlaps the previous run's (see
// EVENT_REMINDER_LEAD_TIME_MS/EVENT_REMINDER_GRACE_MS in eventReminders.ts),
// so a slow or skipped run doesn't drop anyone -- notified_at is what
// prevents double-sends, not the schedule's own precision.
export default async () => {
  const supabase = getSupabaseClient();
  const summary = await sendEventStartReminders(
    new SupabaseEventFollowRepository(supabase),
    new SupabasePushSubscriptionRepository(supabase),
    new WebPushSender(),
    new SupabaseAuthRepository(supabase)
  );
  console.log(
    `event-reminders: ${summary.eventsNotified} event(s), ${summary.sent} sent, ${summary.pruned} pruned, ${summary.failed} failed`
  );
};

export const config: Config = {
  schedule: "*/5 * * * *",
};
