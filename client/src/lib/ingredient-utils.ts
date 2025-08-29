import { ProductInfo } from "@shared/schema";

// Define the structure of an ingredient, reusing the interface from the step component
// to ensure consistency.
interface Ingredient {
  name: string;
  percentage?: number | null;
  origin?: string;
  isMarkedAsBase?: boolean;
  isWholegrain?: boolean;
}

// Helper to calculate the percentage of a base ingredient relative to the whole product.
const calculateWholeProductPercentage = (basePercentage: number, markedIngredientPercentage: number) => {
  if (!basePercentage || !markedIngredientPercentage) return 0;
  return +((basePercentage * markedIngredientPercentage) / 100).toFixed(1);
};

// Helper to find the percentage of the final ingredient that is marked as the base.
const getMarkedIngredientPercentage = (finalIngredients: Ingredient[] = []) => {
  const markedIngredient = finalIngredients.find(ing => ing.isMarkedAsBase);
  return markedIngredient?.percentage || 0;
};

/**
 * Generates a sorted and structured list of ingredients for table display.
 * - Final ingredients are sorted by percentage (desc).
 * - Base ingredients are nested under the marked final ingredient, also sorted by percentage (desc).
 * @param formData - The main product information object.
 * @returns An array of ingredient objects for rendering in a table.
 */
export const generateIngredientsTable = (
  formData: Pick<ProductInfo, 'ingredients' | 'baseProductIngredients'>
): Array<{ name: string, percentage: number, origin: string, isFinalProduct: boolean, isWholegrain: boolean }> => {
  const finalIngredients = [...(formData.ingredients || [])];
  const baseIngredients = [...(formData.baseProductIngredients || [])];
  const tableIngredients: Array<{ name: string, percentage: number, origin: string, isFinalProduct: boolean, isWholegrain: boolean }> = [];

  if (finalIngredients.length === 0) {
    return [];
  }

  // Sort final ingredients by percentage in descending order
  finalIngredients.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

  // Sort base ingredients by percentage in descending order
  baseIngredients.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

  const markedIngredientPercentage = getMarkedIngredientPercentage(formData.ingredients);

  finalIngredients.forEach(ing => {
    if (ing.name.trim()) {
      // Add the final ingredient
      tableIngredients.push({
        name: ing.name,
        percentage: ing.percentage || 0,
        origin: ing.origin || "",
        isFinalProduct: true,
        isWholegrain: ing.isWholegrain || false,
      });

      // If this ingredient is the marked base, add its sorted sub-ingredients
      if (ing.isMarkedAsBase && markedIngredientPercentage > 0) {
        baseIngredients.forEach(baseIng => {
          if (baseIng.name.trim()) {
            const wholeProductPercentage = baseIng.percentage
              ? calculateWholeProductPercentage(baseIng.percentage, markedIngredientPercentage)
              : 0;
            tableIngredients.push({
              name: baseIng.name,
              percentage: wholeProductPercentage,
              origin: baseIng.origin || "",
              isFinalProduct: false,
              isWholegrain: baseIng.isWholegrain || false,
            });
          }
        });
      }
    }
  });

  return tableIngredients;
};

/**
 * Generates a sorted string representation of the combined ingredients for display.
 * The sorting logic mirrors `generateIngredientsTable`.
 * @param formData - The main product information object.
 * @returns A formatted string of ingredients.
 */
export const formatCombinedIngredients = (
  formData: Pick<ProductInfo, 'ingredients' | 'baseProductIngredients'>
): string => {
  const finalIngredients = [...(formData.ingredients || [])];
  const baseIngredients = [...(formData.baseProductIngredients || [])];

  if (finalIngredients.length === 0) {
      return "No ingredients extracted yet...";
  }

  // Sort both lists by percentage, descending
  finalIngredients.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
  baseIngredients.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

  // Format base ingredients first
  const baseFormatted = baseIngredients
    .filter(ing => ing.name.trim())
    .map(ing => {
      const percentage = ing.percentage ? ` ${ing.percentage.toFixed(1)}%*` : '';
      return `${ing.name}${percentage}`;
    })
    .join(', ');

  // Format final ingredients, inserting the base list where appropriate
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
