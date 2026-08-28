import webpush from "web-push";
import type { PushSubscriptionKeys } from "@blockwise/types";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export type SendResult = { status: "sent" } | { status: "gone" } | { status: "error"; message: string };

// Abstracts the actual web-push send so pushSubscriptions.ts's fan-out logic
// (which subscriptions to prune on failure) can be tested against a fake,
// mirroring the GeoapifyPlacesClient/GeoapifyPlaceDetailsClient split for syncPlaces.
export interface PushSender {
  send(subscription: { endpoint: string; keys: PushSubscriptionKeys }, payload: PushPayload): Promise<SendResult>;
}

export class WebPushSender implements PushSender {
  constructor() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (!publicKey || !privateKey || !subject) {
      throw new Error("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT must be set in the environment");
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
  }

  async send(
    subscription: { endpoint: string; keys: PushSubscriptionKeys },
    payload: PushPayload
  ): Promise<SendResult> {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      return { status: "sent" };
    } catch (err) {
      // 404/410 means the browser/OS has invalidated this endpoint (uninstall,
      // permission revoked, subscription expired) -- the caller should prune
      // it rather than treat it as a transient failure worth retrying.
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        return { status: "gone" };
      }
      return { status: "error", message: err instanceof Error ? err.message : String(err) };
    }
  }
}
