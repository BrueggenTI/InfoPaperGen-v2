// Claims calculation utility based on EU nutrition thresholds

export interface ClaimsResult {
  protein: {
    canClaimSource: boolean;
    canClaimHigh: boolean;
    bestClaim: string | null;
  };
  fiber: {
    canClaimSource: boolean;
    canClaimHigh: boolean;
    bestClaim: string | null;
  };
  salt: {
    canClaimLow: boolean;
    canClaimVeryLow: boolean;
    canClaimFree: boolean;
    bestClaim: string | null;
  };
  sugar: {
    canClaimLow: boolean;
    canClaimFree: boolean;
    bestClaim: string | null;
  };
  fat: {
    canClaimLow: boolean;
    canClaimFree: boolean;
    bestClaim: string | null;
  };
  saturatedFat: {
    canClaimLow: boolean;
    bestClaim: string | null;
  };
}

// Protein claim thresholds (g/100g)
const PROTEIN_THRESHOLDS = {
  SOURCE: 2.8,
  HIGH: 5.6
} as const;

// Fiber claim thresholds (g/100g)
const FIBER_THRESHOLDS = {
  SOURCE: 1.75,
  HIGH: 3.5
} as const;

// Salt claim thresholds (g/100g)
const SALT_THRESHOLDS = {
  LOW: 0.3,
  VERY_LOW: 0.1,
  FREE: 0.01
} as const;

// Sugar claim thresholds (g/100g)
const SUGAR_THRESHOLDS = {
  LOW: 5,
  FREE: 0.5
} as const;

// Fat claim thresholds (g/100g)
const FAT_THRESHOLDS = {
  LOW: 3,
  FREE: 0.5
} as const;

// Saturated fat claim thresholds (g/100g)
const SATURATED_FAT_THRESHOLDS = {
  LOW: 1.5
} as const;

export interface NutritionValues {
  protein: number;
  fiber: number;
  salt: number;
  sugars: number;
  fat: number;
  saturatedFat: number;
}

/**
 * Calculate all possible claims based on nutrition values
 */
export function calculateClaims(nutrition: NutritionValues): ClaimsResult {
  // Protein claims
  const proteinCanClaimSource = nutrition.protein >= PROTEIN_THRESHOLDS.SOURCE;
  const proteinCanClaimHigh = nutrition.protein >= PROTEIN_THRESHOLDS.HIGH;
  const proteinBestClaim = proteinCanClaimHigh ? "High in protein" : 
                          proteinCanClaimSource ? "Source of protein" : null;

  // Fiber claims
  const fiberCanClaimSource = nutrition.fiber >= FIBER_THRESHOLDS.SOURCE;
  const fiberCanClaimHigh = nutrition.fiber >= FIBER_THRESHOLDS.HIGH;
  const fiberBestClaim = fiberCanClaimHigh ? "High in fiber" : 
                        fiberCanClaimSource ? "Source of fiber" : null;

  // Salt claims (lower is better)
  const saltCanClaimLow = nutrition.salt <= SALT_THRESHOLDS.LOW;
  const saltCanClaimVeryLow = nutrition.salt <= SALT_THRESHOLDS.VERY_LOW;
  const saltCanClaimFree = nutrition.salt <= SALT_THRESHOLDS.FREE;
  const saltBestClaim = saltCanClaimFree ? "Salt-free" :
                       saltCanClaimVeryLow ? "Very low salt" :
                       saltCanClaimLow ? "Low salt" : null;

  // Sugar claims (lower is better)
  const sugarCanClaimLow = nutrition.sugars <= SUGAR_THRESHOLDS.LOW;
  const sugarCanClaimFree = nutrition.sugars <= SUGAR_THRESHOLDS.FREE;
  const sugarBestClaim = sugarCanClaimFree ? "Sugar-free" :
                        sugarCanClaimLow ? "Low sugar" : null;

  // Fat claims (lower is better)
  const fatCanClaimLow = nutrition.fat <= FAT_THRESHOLDS.LOW;
  const fatCanClaimFree = nutrition.fat <= FAT_THRESHOLDS.FREE;
  const fatBestClaim = fatCanClaimFree ? "Fat-free" :
                      fatCanClaimLow ? "Low fat" : null;

  // Saturated fat claims (lower is better)
  const saturatedFatCanClaimLow = nutrition.saturatedFat <= SATURATED_FAT_THRESHOLDS.LOW;
  const saturatedFatBestClaim = saturatedFatCanClaimLow ? "Low saturated fat" : null;

  return {
    protein: {
      canClaimSource: proteinCanClaimSource,
      canClaimHigh: proteinCanClaimHigh,
      bestClaim: proteinBestClaim
    },
    fiber: {
      canClaimSource: fiberCanClaimSource,
      canClaimHigh: fiberCanClaimHigh,
      bestClaim: fiberBestClaim
    },
    salt: {
      canClaimLow: saltCanClaimLow,
      canClaimVeryLow: saltCanClaimVeryLow,
      canClaimFree: saltCanClaimFree,
      bestClaim: saltBestClaim
    },
    sugar: {
      canClaimLow: sugarCanClaimLow,
      canClaimFree: sugarCanClaimFree,
      bestClaim: sugarBestClaim
    },
    fat: {
      canClaimLow: fatCanClaimLow,
      canClaimFree: fatCanClaimFree,
      bestClaim: fatBestClaim
    },
    saturatedFat: {
      canClaimLow: saturatedFatCanClaimLow,
      bestClaim: saturatedFatBestClaim
    }
  };
}

/**
 * Get all valid claims as a simple array of strings
 */
export function getValidClaims(nutrition: NutritionValues): string[] {
  const claims = calculateClaims(nutrition);
  const validClaims: string[] = [];

  if (claims.protein.bestClaim) validClaims.push(claims.protein.bestClaim);
  if (claims.fiber.bestClaim) validClaims.push(claims.fiber.bestClaim);
  if (claims.salt.bestClaim) validClaims.push(claims.salt.bestClaim);
  if (claims.sugar.bestClaim) validClaims.push(claims.sugar.bestClaim);
  if (claims.fat.bestClaim) validClaims.push(claims.fat.bestClaim);
  if (claims.saturatedFat.bestClaim) validClaims.push(claims.saturatedFat.bestClaim);

  return validClaims;
}

/**
 * Format claims result for display
 */
export function formatClaimsDetails(claims: ClaimsResult): string {
  const sections = [
    `Protein: ${claims.protein.bestClaim || "No claims available"}`,
    `Fiber: ${claims.fiber.bestClaim || "No claims available"}`,
    `Salt: ${claims.salt.bestClaim || "No claims available"}`,
    `Sugar: ${claims.sugar.bestClaim || "No claims available"}`,
    `Fat: ${claims.fat.bestClaim || "No claims available"}`,
    `Saturated Fat: ${claims.saturatedFat.bestClaim || "No claims available"}`
  ];
  
  return sections.join('\n');
}