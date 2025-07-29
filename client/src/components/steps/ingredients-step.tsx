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
  const [finalProductIngredients, setFinalProductIngredients] = useState<Ingredient[]>(
    formData.ingredients || [{ name: "", percentage: undefined, origin: "" }]
  );
  const [baseProductIngredients, setBaseProductIngredients] = useState<Ingredient[]>(
    formData.baseProductIngredients || [{ name: "", percentage: undefined, origin: "" }]
  );

  useEffect(() => {
    if (formData.ingredients && formData.ingredients.length > 0) {
      setFinalProductIngredients(formData.ingredients);
    }
    if (formData.baseProductIngredients && formData.baseProductIngredients.length > 0) {
      setBaseProductIngredients(formData.baseProductIngredients);
    }
  }, [formData.ingredients, formData.baseProductIngredients]);

  const handleFinalProductIngredientChange = (index: number, field: keyof Ingredient, value: string | number) => {
    const updatedIngredients = finalProductIngredients.map((ingredient, i) => 
      i === index ? { ...ingredient, [field]: value } : ingredient
    );
    setFinalProductIngredients(updatedIngredients);
    onUpdate({ ingredients: updatedIngredients });
  };

  const handleBaseProductIngredientChange = (index: number, field: keyof Ingredient, value: string | number) => {
    const updatedIngredients = baseProductIngredients.map((ingredient, i) => 
      i === index ? { ...ingredient, [field]: value } : ingredient
    );
    setBaseProductIngredients(updatedIngredients);
    onUpdate({ baseProductIngredients: updatedIngredients });
  };

  const addFinalProductIngredient = () => {
    const newIngredients = [...finalProductIngredients, { name: "", percentage: undefined, origin: "" }];
    setFinalProductIngredients(newIngredients);
    onUpdate({ ingredients: newIngredients });
  };

  const addBaseProductIngredient = () => {
    const newIngredients = [...baseProductIngredients, { name: "", percentage: undefined, origin: "" }];
    setBaseProductIngredients(newIngredients);
    onUpdate({ baseProductIngredients: newIngredients });
  };

  const removeFinalProductIngredient = (index: number) => {
    const updatedIngredients = finalProductIngredients.filter((_, i) => i !== index);
    setFinalProductIngredients(updatedIngredients);
    onUpdate({ ingredients: updatedIngredients });
  };

  const removeBaseProductIngredient = (index: number) => {
    const updatedIngredients = baseProductIngredients.filter((_, i) => i !== index);
    setBaseProductIngredients(updatedIngredients);
    onUpdate({ baseProductIngredients: updatedIngredients });
  };

  const handleContinue = () => {
    const validFinalIngredients = finalProductIngredients.filter(ingredient => ingredient.name.trim() !== "");
    const validBaseIngredients = baseProductIngredients.filter(ingredient => ingredient.name.trim() !== "");
    onUpdate({ 
      ingredients: validFinalIngredients,
      baseProductIngredients: validBaseIngredients 
    });
    onNext();
  };

  const hasValidIngredients = finalProductIngredients.some(ingredient => ingredient.name.trim() !== "") ||
                               baseProductIngredients.some(ingredient => ingredient.name.trim() !== "");

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">Ingredients</h2>
        <p className="text-slate-600">
          Review and edit the extracted ingredients. Add country of origin information.
        </p>
      </div>

      <div className="space-y-8">
        {/* Final Product Ingredients */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Final Product Ingredients</h3>
          <p className="text-sm text-slate-600 mb-4">
            Upload SAP screenshot of the final product and list all ingredients.
          </p>
          <div className="space-y-4">
            {finalProductIngredients.map((ingredient, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-slate-200 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ingredient Name *
                  </label>
                  <Input
                    value={ingredient.name}
                    onChange={(e) => handleFinalProductIngredientChange(index, "name", e.target.value)}
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
                    onChange={(e) => handleFinalProductIngredientChange(index, "percentage", e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="e.g., 35"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Country of Origin
                  </label>
                  <Select 
                    onValueChange={(value) => handleFinalProductIngredientChange(index, "origin", value)}
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
                    onClick={() => removeFinalProductIngredient(index)}
                    disabled={isLoading || finalProductIngredients.length === 1}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={addFinalProductIngredient}
            disabled={isLoading}
            className="mt-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Final Product Ingredient
          </Button>
        </div>

        {/* Base Product Ingredients */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Base Product Ingredients</h3>
          <p className="text-sm text-slate-600 mb-4">
            Upload SAP screenshot of the base product. These ingredients are included within the final product.
          </p>
          <div className="space-y-4">
            {baseProductIngredients.map((ingredient, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-slate-200 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ingredient Name *
                  </label>
                  <Input
                    value={ingredient.name}
                    onChange={(e) => handleBaseProductIngredientChange(index, "name", e.target.value)}
                    placeholder="e.g., Wheat flour"
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
                    onChange={(e) => handleBaseProductIngredientChange(index, "percentage", e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="e.g., 15"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Country of Origin
                  </label>
                  <Select 
                    onValueChange={(value) => handleBaseProductIngredientChange(index, "origin", value)}
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
                    onClick={() => removeBaseProductIngredient(index)}
                    disabled={isLoading || baseProductIngredients.length === 1}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={addBaseProductIngredient}
            disabled={isLoading}
            className="mt-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Base Product Ingredient
          </Button>
        </div>
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
