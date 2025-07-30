// Nutri-Score calculation utility based on official threshold tables

export interface NutritionData {
  energy: { kj: number; kcal: number };
  fat: number;
  saturatedFat: number;
  carbohydrates: number;
  sugars: number;
  fiber: number;
  protein: number;
  salt: number;
  fruitVegLegumeContent?: number; // percentage
}

export interface NutriScoreResult {
  energyScore: number;
  saturatedFatScore: number;
  sugarScore: number;
  saltScore: number;
  malusScore: number;
  fruitVegLegumeScore: number;
  fiberScore: number;
  proteinScore: number;
  bonusScore: number;
  finalScore: number;
  nutriGrade: 'A' | 'B' | 'C' | 'D' | 'E';
}

// Malus (negative) nutrient thresholds
const ENERGY_THRESHOLDS = [
  [335.0, 0], [335.01, 1], [670.01, 2], [1005.01, 3], [1340.01, 4],
  [1675.01, 5], [2010.01, 6], [2345.01, 7], [2680.01, 8],
  [3015.01, 9], [3350.01, 10]
] as const;

const SATURATED_FAT_THRESHOLDS = [
  [1.0, 0], [1.01, 1], [2.01, 2], [3.01, 3], [4.01, 4],
  [5.01, 5], [6.01, 6], [7.01, 7], [8.01, 8], [9.01, 9], [10.01, 10]
] as const;

const SUGAR_THRESHOLDS = [
  [3.4, 0], [3.41, 1], [6.81, 2], [10.01, 3], [14.01, 4],
  [17.01, 5], [20.01, 6], [24.01, 7], [27.01, 8], [31.01, 9],
  [34.01, 10], [37.01, 11], [41.01, 12], [44.01, 13],
  [48.01, 14], [51.01, 15]
] as const;

const SALT_THRESHOLDS = [
  [0.2, 0], [0.20001, 1], [0.40001, 2], [0.60001, 3], [0.80001, 4],
  [1.0001, 5], [1.20001, 6], [1.40001, 7], [1.60001, 8],
  [1.80001, 9], [2.0001, 10], [2.20001, 11], [2.40001, 12],
  [2.60001, 13], [2.80001, 14], [3.00001, 15], [3.200001, 16],
  [3.40001, 17], [3.60001, 18], [3.80001, 19], [4.0001, 20]
] as const;

// Bonus (positive) nutrient thresholds
const FRUIT_VEG_LEGUME_THRESHOLDS = [
  [40.0, 0], [40.01, 1], [60.01, 2], [80.01, 5]
] as const;

const FIBER_THRESHOLDS = [
  [3.0, 0], [3.01, 1], [4.01, 2], [5.21, 3], [6.31, 4], [7.41, 5]
] as const;

const PROTEIN_THRESHOLDS = [
  [2.4, 0], [2.41, 1], [4.81, 2], [7.21, 3], [9.61, 4],
  [12.01, 5], [14.01, 6], [17.01, 7]
] as const;

// Final Nutri-Score grade thresholds
const NUTRI_GRADE_THRESHOLDS = [
  [-15, 'A'], [1, 'B'], [3, 'C'], [11, 'D'], [19, 'E']
] as const;

/**
 * Calculate score based on value and threshold table
 */
function calculateScore(value: number, thresholds: readonly (readonly [number, number])[]): number {
  for (let i = thresholds.length - 1; i >= 0; i--) {
    const [threshold, score] = thresholds[i];
    if (value >= threshold) {
      return score;
    }
  }
  return 0;
}

/**
 * Calculate Nutri-Score grade based on final score
 */
function calculateNutriGrade(finalScore: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (finalScore <= -15) return 'A';
  if (finalScore <= 1) return 'B';
  if (finalScore <= 3) return 'C';
  if (finalScore <= 11) return 'D';
  return 'E';
}

/**
 * Calculate complete Nutri-Score for given nutrition data
 */
export function calculateNutriScore(nutrition: NutritionData): NutriScoreResult {
  // Calculate malus scores (negative nutrients)
  const energyScore = calculateScore(nutrition.energy.kj, ENERGY_THRESHOLDS);
  const saturatedFatScore = calculateScore(nutrition.saturatedFat, SATURATED_FAT_THRESHOLDS);
  const sugarScore = calculateScore(nutrition.sugars, SUGAR_THRESHOLDS);
  const saltScore = calculateScore(nutrition.salt, SALT_THRESHOLDS);
  
  const malusScore = energyScore + saturatedFatScore + sugarScore + saltScore;

  // Calculate bonus scores (positive nutrients)
  const fruitVegLegumeScore = calculateScore(
    nutrition.fruitVegLegumeContent || 0, 
    FRUIT_VEG_LEGUME_THRESHOLDS
  );
  const fiberScore = calculateScore(nutrition.fiber, FIBER_THRESHOLDS);
  const proteinScore = calculateScore(nutrition.protein, PROTEIN_THRESHOLDS);
  
  const bonusScore = fruitVegLegumeScore + fiberScore + proteinScore;

  // Calculate final score
  const finalScore = malusScore - bonusScore;
  
  // Determine grade
  const nutriGrade = calculateNutriGrade(finalScore);

  return {
    energyScore,
    saturatedFatScore,
    sugarScore,
    saltScore,
    malusScore,
    fruitVegLegumeScore,
    fiberScore,
    proteinScore,
    bonusScore,
    finalScore,
    nutriGrade
  };
}

/**
 * Get color class for Nutri-Score grade
 */
export function getNutriScoreColor(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-green-600 text-white';
    case 'B': return 'bg-lime-500 text-white';
    case 'C': return 'bg-yellow-500 text-black';
    case 'D': return 'bg-orange-500 text-white';
    case 'E': return 'bg-red-600 text-white';
    default: return 'bg-gray-400 text-white';
  }
}

/**
 * Format Nutri-Score result for display
 */
export function formatNutriScoreDetails(result: NutriScoreResult): string {
  return `
Malus Score: ${result.malusScore}
- Energy: ${result.energyScore}
- Saturated Fat: ${result.saturatedFatScore}
- Sugar: ${result.sugarScore}
- Salt: ${result.saltScore}

Bonus Score: ${result.bonusScore}
- Fruit/Veg/Legume: ${result.fruitVegLegumeScore}
- Fiber: ${result.fiberScore}
- Protein: ${result.proteinScore}

Final Score: ${result.finalScore}
Grade: ${result.nutriGrade}
  `.trim();
}