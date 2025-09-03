import { ProductInfo } from "@shared/schema";

interface SubIngredient {
  name: string;
  percentage: number;
}

interface Ingredient {
  name: string;
  percentage?: number | null;
  origin?: string;
  isMarkedAsBase?: boolean;
  isWholegrain?: boolean;
  subIngredients?: SubIngredient[];
}

const calculateWholeProductPercentage = (basePercentage: number, markedIngredientPercentage: number) => {
  if (!basePercentage || !markedIngredientPercentage) return 0;
  return +((basePercentage * markedIngredientPercentage) / 100).toFixed(1);
};

const getMarkedIngredientPercentage = (finalIngredients: Ingredient[] = []) => {
  const markedIngredient = finalIngredients.find(ing => ing.isMarkedAsBase);
  return markedIngredient?.percentage || 0;
};


