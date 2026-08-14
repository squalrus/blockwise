import type { PushSubscriptionKeys } from "@blockwise/types";

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
  createdAt: string;
}

// Abstracts persistence so pushSubscriptions.ts's subscribe/unsubscribe logic
// can be tested against an in-memory fake, mirroring feedback/repository.ts.
export interface PushSubscriptionRepository {
  // Upserts on endpoint so re-subscribing the same browser (e.g. after a
  // permission reset) replaces the stale row instead of accumulating dupes.
  upsertSubscription(input: {
    userId: string;
    endpoint: string;
    keys: PushSubscriptionKeys;
  }): Promise<PushSubscriptionRecord>;
  getSubscription(id: string): Promise<PushSubscriptionRecord | null>;
  deleteSubscription(id: string): Promise<void>;
  listForUser(userId: string): Promise<PushSubscriptionRecord[]>;
  listForUsers(userIds: string[]): Promise<PushSubscriptionRecord[]>;
}
