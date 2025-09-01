import { ProductInfo } from "@shared/schema";

interface Ingredient {
  name: string;
  percentage?: number | null;
  origin?: string;
  isMarkedAsBase?: boolean;
  isWholegrain?: boolean;
}

const calculateWholeProductPercentage = (basePercentage: number, markedIngredientPercentage: number) => {
  if (!basePercentage || !markedIngredientPercentage) return 0;
  return +((basePercentage * markedIngredientPercentage) / 100).toFixed(1);
};

const getMarkedIngredientPercentage = (finalIngredients: Ingredient[] = []) => {
  const markedIngredient = finalIngredients.find(ing => ing.isMarkedAsBase);
  return markedIngredient?.percentage || 0;
};

export const generateIngredientsTable = (
  formData: Pick<ProductInfo, 'ingredients' | 'baseProductIngredients'>
): Array<{ name: string, percentage: number, origin: string, isFinalProduct: boolean, isWholegrain: boolean }> => {
  const finalIngredients = [...(formData.ingredients || [])];
  const baseIngredients = [...(formData.baseProductIngredients || [])];
  const tableIngredients: Array<{ name: string, percentage: number, origin: string, isFinalProduct: boolean, isWholegrain: boolean }> = [];

  if (finalIngredients.length === 0) {
    return [];
  }

  const markedIngredientPercentage = getMarkedIngredientPercentage(finalIngredients);

  const finalTable: Array<{ name: string, percentage: number, origin: string, isFinalProduct: boolean, isWholegrain: boolean }> = [];

  // Sort final ingredients by percentage
  finalIngredients.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

  // Sort base ingredients based on their contribution to the whole product
  const sortedBaseIngredients = baseIngredients
    .map(ing => ({
      ...ing,
      wholeProductPercentage: calculateWholeProductPercentage(ing.percentage || 0, markedIngredientPercentage)
    }))
    .sort((a, b) => b.wholeProductPercentage - a.wholeProductPercentage);

  finalIngredients.forEach(ing => {
    if (ing.name.trim()) {
      finalTable.push({
        name: ing.name,
        percentage: ing.percentage || 0,
        origin: ing.origin || "",
        isFinalProduct: true,
        isWholegrain: ing.isWholegrain || false,
      });

      if (ing.isMarkedAsBase && markedIngredientPercentage > 0) {
        sortedBaseIngredients.forEach(baseIng => {
          if (baseIng.name.trim()) {
            finalTable.push({
              name: baseIng.name,
              percentage: baseIng.wholeProductPercentage,
              origin: baseIng.origin || "",
              isFinalProduct: false,
              isWholegrain: baseIng.isWholegrain || false,
            });
          }
        });
      }
    }
  });

  return finalTable;
};

export const formatCombinedIngredients = (
  formData: Pick<ProductInfo, 'ingredients' | 'baseProductIngredients'>
): string => {
  const finalIngredients = [...(formData.ingredients || [])];
  const baseIngredients = [...(formData.baseProductIngredients || [])];

  if (finalIngredients.length === 0) {
      return "No ingredients extracted yet...";
  }

  finalIngredients.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

  const markedIngredientPercentage = getMarkedIngredientPercentage(finalIngredients);

  const baseFormatted = baseIngredients
    .filter(ing => ing.name.trim())
    .map(ing => ({
      ...ing,
      // Note: Here we sort by the original percentage within the base recipe,
      // as the final contribution isn't shown in this string format.
      // The visual requirement for this string is just sorted base ingredients.
    }))
    .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
    .map(ing => {
      const percentage = ing.percentage ? ` ${ing.percentage.toFixed(1)}%*` : '';
      return `${ing.name}${percentage}`;
    })
    .join(', ');

  const finalFormatted = finalIngredients
    .filter(ing => ing.name.trim())
    .map(ing => {
      const percentage = ing.percentage ? ` **(${ing.percentage.toFixed(1)}%)**` : '';
      const ingredientText = `**${ing.name}${percentage}**`;

      if (ing.isMarkedAsBase && baseFormatted) {
        return `${ingredientText} [${baseFormatted}]`;
      }
      return ingredientText;
    })
    .join(', ');

  const result = `<strong>Ingredients:</strong> ${(finalFormatted || "No ingredients extracted yet...")
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}`

  return result;
};
