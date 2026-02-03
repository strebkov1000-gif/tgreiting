/**
 * Supply to Meters conversion utility
 * Converts NFT collection supply to base points (meters)
 *
 * Rarity tiers: lower supply = higher points (rarer)
 */

interface SupplyTier {
  minSupply: number;
  maxSupply: number;
  meters: number;
}

/**
 * Supply tiers configuration from specification
 * Sorted from highest to lowest supply for efficient lookup
 */
const SUPPLY_TIERS: SupplyTier[] = [
  { minSupply: 10000, maxSupply: Infinity, meters: 2 },
  { minSupply: 9000, maxSupply: 9999, meters: 5 },
  { minSupply: 8000, maxSupply: 8999, meters: 20 },
  { minSupply: 7000, maxSupply: 7999, meters: 30 },
  { minSupply: 6000, maxSupply: 6999, meters: 40 },
  { minSupply: 5000, maxSupply: 5999, meters: 50 },
  { minSupply: 4000, maxSupply: 4999, meters: 60 },
  { minSupply: 3000, maxSupply: 3999, meters: 70 },
  { minSupply: 2000, maxSupply: 2999, meters: 80 },
  { minSupply: 1000, maxSupply: 1999, meters: 90 },
  { minSupply: 900, maxSupply: 999, meters: 100 },
  { minSupply: 800, maxSupply: 899, meters: 110 },
  { minSupply: 700, maxSupply: 799, meters: 120 },
  { minSupply: 600, maxSupply: 699, meters: 130 },
  { minSupply: 500, maxSupply: 599, meters: 140 },
  { minSupply: 400, maxSupply: 499, meters: 150 },
  { minSupply: 300, maxSupply: 399, meters: 160 },
  { minSupply: 200, maxSupply: 299, meters: 170 },
  { minSupply: 100, maxSupply: 199, meters: 200 },
  { minSupply: 0, maxSupply: 99, meters: 250 },
];

/**
 * Convert NFT collection supply to meters (base points)
 * @param supply - Total supply of the NFT collection
 * @returns Number of meters (points) for this supply tier
 */
export function supplyToMeters(supply: number): number {
  // Handle edge cases
  if (supply == null || supply < 0) {
    return 2; // Default to lowest tier for invalid values
  }

  for (const tier of SUPPLY_TIERS) {
    if (supply >= tier.minSupply && supply <= tier.maxSupply) {
      return tier.meters;
    }
  }

  // Fallback (should not reach here)
  return 2;
}

/**
 * Get tier name based on supply
 * @param supply - Total supply of the NFT collection
 * @returns Tier name: 'legendary', 'epic', 'rare', 'uncommon', 'common'
 */
export function getTierName(supply: number): string {
  const meters = supplyToMeters(supply);

  if (meters >= 200) return 'legendary';
  if (meters >= 140) return 'epic';
  if (meters >= 100) return 'rare';
  if (meters >= 50) return 'uncommon';
  return 'common';
}

/**
 * Get tier color for UI display
 * @param supply - Total supply of the NFT collection
 * @returns CSS color string
 */
export function getTierColor(supply: number): string {
  const tier = getTierName(supply);

  switch (tier) {
    case 'legendary': return '#FFD700'; // Gold
    case 'epic': return '#9B59B6';      // Purple
    case 'rare': return '#3498DB';      // Blue
    case 'uncommon': return '#2ECC71';  // Green
    default: return '#95A5A6';          // Gray
  }
}

export { SUPPLY_TIERS };
