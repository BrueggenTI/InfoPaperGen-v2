import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductInfo } from "@shared/schema";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

interface Ingredient {
  name: string;
  percentage?: number;
  origin?: string;
}

interface IngredientsStepProps {
  formData: ProductInfo;
  onUpdate: (data: Partial<ProductInfo>) => void;
  onNext: () => void;
  onPrev: () => void;
  isLoading?: boolean;
}

export default function IngredientsStep({
  formData,
  onUpdate,
  onNext,
  onPrev,
  isLoading = false,
}: IngredientsStepProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    formData.ingredients || [{ name: "", percentage: undefined, origin: "" }]
  );

  useEffect(() => {
    if (formData.ingredients && formData.ingredients.length > 0) {
      setIngredients(formData.ingredients);
    }
  }, [formData.ingredients]);

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string | number) => {
    const updatedIngredients = ingredients.map((ingredient, i) => 
      i === index ? { ...ingredient, [field]: value } : ingredient
    );
    setIngredients(updatedIngredients);
    onUpdate({ ingredients: updatedIngredients });
  };

  const addIngredient = () => {
    const newIngredients = [...ingredients, { name: "", percentage: undefined, origin: "" }];
    setIngredients(newIngredients);
    onUpdate({ ingredients: newIngredients });
  };

  const removeIngredient = (index: number) => {
    const updatedIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(updatedIngredients);
    onUpdate({ ingredients: updatedIngredients });
  };

  const handleContinue = () => {
    const validIngredients = ingredients.filter(ingredient => ingredient.name.trim() !== "");
    onUpdate({ ingredients: validIngredients });
    onNext();
  };

  const hasValidIngredients = ingredients.some(ingredient => ingredient.name.trim() !== "");

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">Ingredients</h2>
        <p className="text-slate-600">
          Review and edit the extracted ingredients. Add country of origin information.
        </p>
      </div>

      <div className="space-y-4">
        {ingredients.map((ingredient, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-slate-200 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ingredient Name *
              </label>
              <Input
                value={ingredient.name}
                onChange={(e) => handleIngredientChange(index, "name", e.target.value)}
                placeholder="e.g., Oats"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Percentage (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={ingredient.percentage || ""}
                onChange={(e) => handleIngredientChange(index, "percentage", e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="e.g., 35"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Country of Origin
              </label>
              <Select 
                onValueChange={(value) => handleIngredientChange(index, "origin", value)}
                value={ingredient.origin}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="germany">Germany</SelectItem>
                  <SelectItem value="poland">Poland</SelectItem>
                  <SelectItem value="france">France</SelectItem>
                  <SelectItem value="italy">Italy</SelectItem>
                  <SelectItem value="spain">Spain</SelectItem>
                  <SelectItem value="netherlands">Netherlands</SelectItem>
                  <SelectItem value="belgium">Belgium</SelectItem>
                  <SelectItem value="austria">Austria</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeIngredient(index)}
                disabled={isLoading || ingredients.length === 1}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          onClick={addIngredient}
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Ingredient</span>
        </Button>
      </div>

      <div className="flex justify-between mt-8">
        <Button 
          variant="outline" 
          onClick={onPrev}
          disabled={isLoading}
          className="flex items-center space-x-2"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>
        
        <Button 
          onClick={handleContinue}
          disabled={isLoading || !hasValidIngredients}
          className="flex items-center space-x-2"
        >
          <span>Continue to Nutrition</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
