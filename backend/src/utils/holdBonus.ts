/**
 * Hold Bonus calculation utility
 * Awards bonus multiplier based on how long user holds NFT on their WALLET (blockchain)
 *
 * IMPORTANT: All calculations use ownedSince (actual blockchain ownership date),
 * NOT detectedAt (when we first saw the NFT in our system).
 *
 * Rules:
 * - +10% per month of holding NFT on wallet (rounded down)
 * - Diamond Hands: 6 month hold = +500m one time bonus
 */

// Days per month (average)
const DAYS_PER_MONTH = 30;

// Diamond Hands milestone: 6 months
export const DIAMOND_HANDS_DAYS = 180;
export const DIAMOND_HANDS_BONUS = 500; // +500 meters one-time

// Monthly hold bonus percentage
export const MONTHLY_HOLD_BONUS_PERCENT = 10;

/**
 * Calculate hold days from blockchain ownership date
 * @param ownedSince - Date when NFT was acquired on wallet (from blockchain)
 * @returns Number of days holding on wallet
 */
export function calculateHoldDays(ownedSince: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - ownedSince.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate hold months from days (rounded down)
 * @param holdDays - Number of days holding
 * @returns Number of full months
 */
export function calculateHoldMonths(holdDays: number): number {
  return Math.floor(holdDays / DAYS_PER_MONTH);
}

/**
 * Get hold bonus multiplier based on days holding
 * +10% per month (rounded down)
 * @param holdDays - Number of days holding the NFT
 * @returns Multiplier (1.0, 1.1, 1.2, etc.)
 */
export function getHoldMultiplier(holdDays: number): number {
  if (holdDays < 0) return 1.0;
  const months = calculateHoldMonths(holdDays);
  return 1.0 + (months * (MONTHLY_HOLD_BONUS_PERCENT / 100));
}

/**
 * Get hold bonus percentage based on days holding
 * @param holdDays - Number of days holding the NFT
 * @returns Bonus percentage (0, 10, 20, 30, etc.)
 */
export function getHoldBonusPercent(holdDays: number): number {
  if (holdDays < 0) return 0;
  const months = calculateHoldMonths(holdDays);
  return months * MONTHLY_HOLD_BONUS_PERCENT;
}

/**
 * Check if user qualifies for Diamond Hands bonus
 * @param holdDays - Number of days holding
 * @returns True if 6+ months
 */
export function isDiamondHands(holdDays: number): boolean {
  return holdDays >= DIAMOND_HANDS_DAYS;
}

/**
 * Get hold tier name for display
 * @param holdDays - Number of days holding the NFT
 * @returns Tier name string
 */
export function getHoldTierName(holdDays: number): string {
  if (holdDays >= 180) return 'Diamond Hands';
  const months = calculateHoldMonths(holdDays);
  if (months >= 3) return `${months} Month Holder`;
  if (months >= 1) return `${months} Month Holder`;
  return 'New Holder';
}

/**
 * Calculate total meters with hold bonus applied (rounded down)
 * @param baseMeters - Base meters from supply tier
 * @param ownedSince - Date when NFT was acquired on wallet (from blockchain)
 * @returns Total meters with hold bonus
 */
export function applyHoldBonus(baseMeters: number, ownedSince: Date): number {
  const holdDays = calculateHoldDays(ownedSince);
  const multiplier = getHoldMultiplier(holdDays);
  // Round down as per requirements
  return Math.floor(baseMeters * multiplier);
}

/**
 * Get detailed hold bonus info for UI display
 */
export interface HoldBonusInfo {
  holdDays: number;
  holdMonths: number;
  multiplier: number;
  bonusPercent: number;
  tierName: string;
  isDiamondHands: boolean;
  daysUntilDiamond: number | null;
  daysUntilNextMonth: number | null;
}

/**
 * Get comprehensive hold bonus information
 * @param ownedSince - Date when NFT was acquired on wallet (from blockchain)
 * @returns Detailed hold bonus info
 */
export function getHoldBonusInfo(ownedSince: Date): HoldBonusInfo {
  const holdDays = calculateHoldDays(ownedSince);
  const holdMonths = calculateHoldMonths(holdDays);
  const multiplier = getHoldMultiplier(holdDays);
  const bonusPercent = getHoldBonusPercent(holdDays);
  const tierName = getHoldTierName(holdDays);
  const diamond = isDiamondHands(holdDays);

  // Days until Diamond Hands (6 months)
  const daysUntilDiamond = diamond ? null : DIAMOND_HANDS_DAYS - holdDays;

  // Days until next month bonus
  const nextMonthDays = (holdMonths + 1) * DAYS_PER_MONTH;
  const daysUntilNextMonth = nextMonthDays - holdDays;

  return {
    holdDays,
    holdMonths,
    multiplier,
    bonusPercent,
    tierName,
    isDiamondHands: diamond,
    daysUntilDiamond,
    daysUntilNextMonth
  };
}
