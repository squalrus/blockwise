import type { AuthRepository } from "../auth/repository";
import type { GamificationRepository } from "./repository";

// Easter egg (mirroring founderBadge.ts's one-off-award pattern rather than
// the generic badge_rule engine, since this is keyed to one specific
// username rather than a threshold): connecting with @squalrus -- Spored's
// answer to Tom, everyone's default first friend on Myspace -- earns this
// badge for whichever side of the connection isn't @squalrus.
export const SQUALRUS_BADGE_CODE = "squalrus_connection";
const SQUALRUS_USERNAME = "squalrus";

export async function awardSqualrusConnectionBadge(
  userId: string,
  otherUserId: string,
  authRepository: AuthRepository,
  gamificationRepository: GamificationRepository
): Promise<void> {
  const squalrus = await authRepository.getByUsername(SQUALRUS_USERNAME);
  if (!squalrus || squalrus.id !== otherUserId) return;

  await gamificationRepository.awardBadgeByCode(userId, SQUALRUS_BADGE_CODE);
}
