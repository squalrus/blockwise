import type { ConnectionRepository, UserConnectionRecord } from "./repository";

export type SendConnectionRequestResult =
  | { status: "created" | "accepted" | "already_requested" | "already_connected"; connection: UserConnectionRecord }
  | { status: "not_found" }
  | { status: "self" };

// BACKLOG.md Ref 14 "Connect with other users" -- if the recipient already
// has a pending request out to the requester (both wanted to connect before
// either one asked), that's mutual interest, so the existing row is
// accepted immediately rather than leaving two pending rows pointed at each
// other.
export async function sendConnectionRequest(
  requesterId: string,
  recipientUsername: string,
  repository: ConnectionRepository
): Promise<SendConnectionRequestResult> {
  const recipientId = await repository.getUserIdByUsername(recipientUsername);
  if (!recipientId) return { status: "not_found" };
  if (recipientId === requesterId) return { status: "self" };

  const existing = await repository.findConnectionBetween(requesterId, recipientId);
  if (existing) {
    if (existing.status === "accepted") return { status: "already_connected", connection: existing };
    if (existing.requesterId === requesterId) {
      return { status: "already_requested", connection: existing };
    }
    const accepted = await repository.acceptConnectionRequest(existing.id);
    return { status: "accepted", connection: accepted };
  }

  const created = await repository.createConnectionRequest(requesterId, recipientId);
  return { status: "created", connection: created };
}

export type AcceptConnectionRequestResult =
  | { status: "accepted"; connection: UserConnectionRecord }
  | { status: "not_found" }
  | { status: "forbidden" }
  | { status: "not_pending" };

export async function acceptConnectionRequest(
  userId: string,
  connectionId: string,
  repository: ConnectionRepository
): Promise<AcceptConnectionRequestResult> {
  const connection = await repository.getConnectionById(connectionId);
  if (!connection) return { status: "not_found" };
  if (connection.recipientId !== userId) return { status: "forbidden" };
  if (connection.status !== "pending") return { status: "not_pending" };

  const accepted = await repository.acceptConnectionRequest(connectionId);
  return { status: "accepted", connection: accepted };
}

export type RemoveConnectionResult = { status: "removed" | "not_found" | "forbidden" };

// Handles all three "negative" actions on a connection -- declining a
// pending incoming request, cancelling a pending outgoing request, or
// removing an already-accepted connection -- since all three are the same
// hard delete from either party's perspective.
export async function removeConnection(
  userId: string,
  connectionId: string,
  repository: ConnectionRepository
): Promise<RemoveConnectionResult> {
  const connection = await repository.getConnectionById(connectionId);
  if (!connection) return { status: "not_found" };
  if (connection.requesterId !== userId && connection.recipientId !== userId) {
    return { status: "forbidden" };
  }

  await repository.deleteConnection(connectionId);
  return { status: "removed" };
}
