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

export const generateIngredientsTable = (
  formData: Pick<ProductInfo, 'ingredients' | 'baseProductIngredients'>
): Array<{ name: string, percentage: number, origin: string, isFinalProduct: boolean, isWholegrain: boolean, level: 'main' | 'sub' | 'base' }> => {
  const finalIngredients = [...(formData.ingredients || [])];
  const baseIngredients = [...(formData.baseProductIngredients || [])];

  if (finalIngredients.length === 0) {
    return [];
  }

  const markedIngredientPercentage = getMarkedIngredientPercentage(finalIngredients);

  const finalTable: Array<{ name: string, percentage: number, origin: string, isFinalProduct: boolean, isWholegrain: boolean, level: 'main' | 'sub' | 'base' }> = [];

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
        level: 'main',
      });

      // Add sub-ingredients if they exist
      if (ing.subIngredients && ing.subIngredients.length > 0) {
        ing.subIngredients.forEach(subIng => {
          finalTable.push({
            name: subIng.name,
            percentage: calculateWholeProductPercentage(subIng.percentage, ing.percentage || 0),
            origin: "", // Sub-ingredients do not have origin
            isFinalProduct: true, // Belongs to the final product
            isWholegrain: false, // Sub-ingredients are not wholegrain
            level: 'sub',
          });
        });
      }

      if (ing.isMarkedAsBase && markedIngredientPercentage > 0) {
        sortedBaseIngredients.forEach(baseIng => {
          if (baseIng.name.trim()) {
            finalTable.push({
              name: baseIng.name,
              percentage: baseIng.wholeProductPercentage,
              origin: baseIng.origin || "",
              isFinalProduct: false,
              isWholegrain: baseIng.isWholegrain || false,
              level: 'base',
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
      let ingredientText;

      if (ing.subIngredients && ing.subIngredients.length > 0) {
        const subIngredientString = ing.subIngredients
          .map(sub => `${sub.name} ${sub.percentage.toFixed(1)}%`)
          .join(', ');
        ingredientText = `**${ing.name}** (${subIngredientString})`;
      } else {
        const percentage = ing.percentage ? ` **(${ing.percentage.toFixed(1)}%)**` : '';
        ingredientText = `**${ing.name}${percentage}**`;
      }

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
