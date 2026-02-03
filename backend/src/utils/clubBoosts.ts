/**
 * Club Boosts calculation utility
 * Awards bonus meters based on club/chat membership
 *
 * Rules:
 * - Ice Gang: +10m per sticker (max 1000m)
 * - Notkep: +100m per sticker (max 1000m)
 * - Sappy Seals: +70m per sticker (max 500m)
 */

export interface ClubConfig {
  id: string;
  name: string;
  metersPerSticker: number;
  maxMeters: number;
  chatId?: string;
}

/**
 * Club boost configurations
 */
export const CLUB_CONFIGS: Record<string, ClubConfig> = {
  'ice-gang': {
    id: 'ice-gang',
    name: 'Ice Gang',
    metersPerSticker: 10,
    maxMeters: 1000,
  },
  'notcap': {
    id: 'notcap',
    name: 'Not Cap',
    metersPerSticker: 100,
    maxMeters: 1000,
  },
  'sappy-seals': {
    id: 'sappy-seals',
    name: 'Sappy Seals',
    metersPerSticker: 70,
    maxMeters: 500,
  },
};

/**
 * Calculate club boost meters for a user
 * @param clubId - The club identifier
 * @param nftCount - Number of stickers user owns
 * @returns Meters to award (capped at max)
 */
export function calculateClubBoost(clubId: string, nftCount: number): number {
  const config = CLUB_CONFIGS[clubId];
  if (!config) return 0;

  const rawBoost = nftCount * config.metersPerSticker;
  return Math.min(rawBoost, config.maxMeters);
}

/**
 * Calculate total club boosts for all memberships
 * @param memberClubIds - Array of club IDs user is member of
 * @param nftCount - Number of stickers user owns
 * @returns Total meters from all club boosts
 */
export function calculateTotalClubBoosts(memberClubIds: string[], nftCount: number): number {
  return memberClubIds.reduce((total, clubId) => {
    return total + calculateClubBoost(clubId, nftCount);
  }, 0);
}

/**
 * Get club boost info for display
 */
export interface ClubBoostInfo {
  clubId: string;
  clubName: string;
  metersPerSticker: number;
  maxMeters: number;
  currentBoost: number;
  isMaxed: boolean;
  isMember: boolean;
}

/**
 * Get detailed club boost information
 * @param clubId - The club identifier
 * @param nftCount - Number of stickers user owns
 * @param isMember - Whether user is a member
 * @returns Detailed club boost info
 */
export function getClubBoostInfo(clubId: string, nftCount: number, isMember: boolean): ClubBoostInfo | null {
  const config = CLUB_CONFIGS[clubId];
  if (!config) return null;

  const currentBoost = isMember ? calculateClubBoost(clubId, nftCount) : 0;
  const potentialBoost = calculateClubBoost(clubId, nftCount);

  return {
    clubId: config.id,
    clubName: config.name,
    metersPerSticker: config.metersPerSticker,
    maxMeters: config.maxMeters,
    currentBoost,
    isMaxed: potentialBoost >= config.maxMeters,
    isMember,
  };
}

/**
 * Get all club boost info for a user
 * @param memberClubIds - Array of club IDs user is member of
 * @param nftCount - Number of stickers user owns
 * @returns Array of club boost info
 */
export function getAllClubBoostsInfo(memberClubIds: string[], nftCount: number): ClubBoostInfo[] {
  return Object.keys(CLUB_CONFIGS).map(clubId => {
    const isMember = memberClubIds.includes(clubId);
    return getClubBoostInfo(clubId, nftCount, isMember)!;
  });
}
