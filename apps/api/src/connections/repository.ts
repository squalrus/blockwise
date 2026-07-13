import type { AvatarStyle } from "@blockwise/types";

// BACKLOG.md Ref 14/33 "Connect with other users" / "Friends/neighbors on
// profile" -- mirrors ConnectionStatus in @blockwise/types (no "declined"
// state: declining/cancelling/removing are all a hard delete, see
// connections.ts).
export type ConnectionStatus = "pending" | "accepted";

export interface UserConnectionRecord {
  id: string;
  requesterId: string;
  recipientId: string;
  status: ConnectionStatus;
  createdAt: string;
  respondedAt: string | null;
}

export interface ConnectionUserSummary {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  avatarStyle: AvatarStyle;
}

// GET /me/connections listing (My account page's Neighbors section) -- the
// other party's display info plus which side of the request the caller is
// on, mirroring FavoriteVenue's venue-joined shape in favorites/repository.ts.
export interface ConnectionListItem {
  id: string;
  status: ConnectionStatus;
  direction: "incoming" | "outgoing";
  createdAt: string;
  user: ConnectionUserSummary;
}

// Abstracts persistence so sendConnectionRequest/acceptConnectionRequest/
// removeConnection (connections.ts) can be tested against an in-memory fake,
// mirroring favorites/repository.ts.
export interface ConnectionRepository {
  // Self-contained lookup against app_user, mirroring how FavoriteRepository
  // owns venueExists rather than depending on AuthRepository.
  getUserIdByUsername(username: string): Promise<string | null>;
  // Looks up a row in either direction between the two users -- requester/
  // recipient order isn't known by the caller until it finds one.
  findConnectionBetween(userIdA: string, userIdB: string): Promise<UserConnectionRecord | null>;
  getConnectionById(id: string): Promise<UserConnectionRecord | null>;
  createConnectionRequest(requesterId: string, recipientId: string): Promise<UserConnectionRecord>;
  acceptConnectionRequest(id: string): Promise<UserConnectionRecord>;
  deleteConnection(id: string): Promise<void>;
  listConnectionsForUser(userId: string, status?: ConnectionStatus): Promise<ConnectionListItem[]>;
  countAcceptedConnectionsForUser(userId: string): Promise<number>;
}
