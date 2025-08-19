import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductInfo } from "@shared/schema";
import { ChevronLeft, ChevronRight, Upload, Camera, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { calculateNutriScore, getNutriScoreColor, getNutriScoreImage, formatNutriScoreDetails } from "@/lib/nutri-score";
import { calculateClaims, getValidClaims } from "@/lib/claims-calculator";

const nutritionSchema = z.object({
  energy: z.object({
    kj: z.number().min(0, "Energy (kJ) must be positive"),
    kcal: z.number().min(0, "Energy (kcal) must be positive"),
  }),
  fat: z.number().min(0, "Fat must be positive"),
  saturatedFat: z.number().min(0, "Saturated fat must be positive"),
  carbohydrates: z.number().min(0, "Carbohydrates must be positive"),
  sugars: z.number().min(0, "Sugars must be positive"),
  fiber: z.number().min(0, "Fiber must be positive"),
  protein: z.number().min(0, "Protein must be positive"),
  salt: z.number().min(0, "Salt must be positive"),
  fruitVegLegumeContent: z.number().min(0, "Fruit/Veg/Legume content must be positive").max(100, "Percentage cannot exceed 100%"),
});

interface NutritionStepProps {
  formData: ProductInfo;
  onUpdate: (data: Partial<ProductInfo>) => void;
  onNext: () => void;
  onPrev: () => void;
  isLoading?: boolean;
}

export default function NutritionStep({
  formData,
  onUpdate,
  onNext,
  onPrev,
  isLoading = false,
}: NutritionStepProps) {
  const { toast } = useToast();
  const nutritionImageInputRef = useRef<HTMLInputElement>(null);
  const [nutritionImage, setNutritionImage] = useState<string | null>(null);
  const servingSize = parseFloat(formData.servingSize?.replace(/[^\d.]/g, '') || '40');

  const form = useForm<z.infer<typeof nutritionSchema>>({
    resolver: zodResolver(nutritionSchema),
    defaultValues: formData.nutrition || {
      energy: { kj: 0, kcal: 0 },
      fat: 0,
      saturatedFat: 0,
      carbohydrates: 0,
      sugars: 0,
      fiber: 0,
      protein: 0,
      salt: 0,
      fruitVegLegumeContent: 0,
    },
  });

  const watchedValues = form.watch();

  // AI nutrition extraction mutation
  const extractNutritionMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const res = await apiRequest("POST", "/api/extract-nutrition", { 
        image: imageData.split(',')[1] // Remove data:image/jpeg;base64, prefix
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data && data.nutrition) {
        // Update form with extracted nutrition values
        const nutritionWithDefaults = {
          ...data.nutrition,
          fruitVegLegumeContent: data.nutrition.fruitVegLegumeContent || 0
        };
        form.reset(nutritionWithDefaults);
        onUpdate({ nutrition: nutritionWithDefaults });
        toast({
          title: "Nutrition values extracted",
          description: "Nutrition values have been successfully extracted from the image.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Extraction error",
        description: "Nutrition values could not be extracted from the image. Please enter them manually.",
        variant: "destructive",
      });
    },
  });

  // Calculate per serving values
  const calculatePerServing = (per100g: number) => {
    return (per100g * servingSize / 100).toFixed(1);
  };

  const handleNutritionImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file under 10MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setNutritionImage(base64);
      extractNutritionMutation.mutate(base64);
    };
    reader.readAsDataURL(file);
  };

  const removeNutritionImage = () => {
    setNutritionImage(null);
    if (nutritionImageInputRef.current) {
      nutritionImageInputRef.current.value = '';
    }
  };

  const onSubmit = (values: z.infer<typeof nutritionSchema>) => {
    onUpdate({ nutrition: values });
    onNext();
  };

  // Performance: Memoize field change handler  
  const handleFieldChange = useCallback((field: string, value: number, nestedField?: string) => {
    let updateData;
    if (nestedField) {
      updateData = {
        nutrition: {
          ...formData.nutrition,
          energy: formData.nutrition?.energy || { kj: 0, kcal: 0 },
          fat: formData.nutrition?.fat || 0,
          saturatedFat: formData.nutrition?.saturatedFat || 0,
          carbohydrates: formData.nutrition?.carbohydrates || 0,
          sugars: formData.nutrition?.sugars || 0,
          fiber: formData.nutrition?.fiber || 0,
          protein: formData.nutrition?.protein || 0,
          salt: formData.nutrition?.salt || 0,
          fruitVegLegumeContent: formData.nutrition?.fruitVegLegumeContent || 0,
          [field]: {
            ...(formData.nutrition?.[field as keyof typeof formData.nutrition] as any),
            [nestedField]: value,
          },
        },
      };
    } else {
      updateData = {
        nutrition: {
          energy: formData.nutrition?.energy || { kj: 0, kcal: 0 },
          fat: formData.nutrition?.fat || 0,
          saturatedFat: formData.nutrition?.saturatedFat || 0,
          carbohydrates: formData.nutrition?.carbohydrates || 0,
          sugars: formData.nutrition?.sugars || 0,
          fiber: formData.nutrition?.fiber || 0,
          protein: formData.nutrition?.protein || 0,
          salt: formData.nutrition?.salt || 0,
          fruitVegLegumeContent: formData.nutrition?.fruitVegLegumeContent || 0,
          ...formData.nutrition,
          [field]: value,
        },
      };
    }
    onUpdate(updateData);
  }, [formData.nutrition, onUpdate]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-primary mb-2">Nutritional Information</h2>
        <p className="text-muted-foreground">
          Review and edit the extracted nutritional values per 100g. Values per {servingSize}g serving will be calculated automatically.
        </p>
      </div>

      {/* Nutrition Image Upload */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="w-5 h-5" />
            <span>Upload Nutrition Table</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
            <input
              ref={nutritionImageInputRef}
              type="file"
              accept="image/*"
              onChange={handleNutritionImageUpload}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-2">
              Upload an image of the nutrition table to automatically extract values
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                nutritionImageInputRef.current?.click();
              }}
              disabled={isLoading || extractNutritionMutation.isPending}
              data-testid="button-upload-nutrition"
            >
              {extractNutritionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting nutrition values...
                </>
              ) : (
                "Upload Nutrition Table"
              )}
            </Button>
          </div>

          {nutritionImage && (
            <div className="relative">
              <img
                src={nutritionImage}
                alt="Nutrition Label"
                className="w-full max-w-md mx-auto rounded-lg shadow-sm"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={removeNutritionImage}
                className="absolute top-2 right-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nutritional Table - Same format as Live Preview */}
      <div className="bg-white border border-slate-300 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Average nutritional value:</h3>
        <table className="w-full border-collapse border border-slate-400 text-sm">
          <thead>
            <tr>
              <th className="border border-slate-400 p-2 text-left font-semibold">
                {/* Nutrient names column */}
              </th>
              <th className="border border-slate-400 p-2 text-center font-semibold">
                per 100 g of product
              </th>
              <th className="border border-slate-400 p-2 text-center font-semibold">
                per {servingSize} g of product
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-400 p-1">Energy</td>
              <td className="border border-slate-400 p-1 text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={watchedValues.energy?.kj || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      form.setValue('energy.kj', value);
                      handleFieldChange("energy", value, "kj");
                    }}
                    className="w-16 h-8 text-xs text-center p-1"
                  />
                  <span className="text-xs">kJ /</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={watchedValues.energy?.kcal || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      form.setValue('energy.kcal', value);
                      handleFieldChange("energy", value, "kcal");
                    }}
                    className="w-16 h-8 text-xs text-center p-1"
                  />
                  <span className="text-xs">kcal</span>
                </div>
              </td>
              <td className="border border-slate-400 p-1 text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={calculatePerServing(watchedValues.energy?.kj) || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      const per100g = (value * 100) / servingSize;
                      form.setValue('energy.kj', per100g);
                      handleFieldChange("energy", per100g, "kj");
                    }}
                    className="w-16 h-8 text-xs text-center p-1"
                  />
                  <span className="text-xs">kJ /</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={calculatePerServing(watchedValues.energy?.kcal) || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      const per100g = (value * 100) / servingSize;
                      form.setValue('energy.kcal', per100g);
                      handleFieldChange("energy", per100g, "kcal");
                    }}
                    className="w-16 h-8 text-xs text-center p-1"
                  />
                  <span className="text-xs">kcal</span>
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-1">Fat</td>
              <td className="border border-slate-400 p-1 text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={watchedValues.fat || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      form.setValue('fat', value);
                      handleFieldChange("fat", value);
                    }}
                    className="w-16 h-8 text-xs text-center p-1"
                  />
                  <span className="text-xs">g</span>
                </div>
              </td>
              <td className="border border-slate-400 p-1 text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={calculatePerServing(watchedValues.fat) || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      const per100g = (value * 100) / servingSize;
                      form.setValue('fat', per100g);
                      handleFieldChange("fat", per100g);
                    }}
                    className="w-16 h-8 text-xs text-center p-1"
                  />
                  <span className="text-xs">g</span>
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-1">of which saturates</td>
              <td className="border border-slate-400 p-1 text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={watchedValues.saturatedFat || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      form.setValue('saturatedFat', value);
                      handleFieldChange("saturatedFat", value);
                    }}
                    className="w-16 h-8 text-xs text-center p-1"
                  />
                  <span className="text-xs">g</span>
                </div>
              </td>
              <td className="border border-slate-400 p-1 text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={calculatePerServing(watchedValues.saturatedFat) || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      const per100g = (value * 100) / servingSize;
                      form.setValue('saturatedFat', per100g);
                      handleFieldChange("saturatedFat", per100g);
                    }}
                    className="w-16 h-8 text-xs text-center p-1"
                  />
                  <span className="text-xs">g</span>
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-1">Carbohydrates</td>
              <td className="border border-slate-400 p-1 text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={watchedValues.carbohydrates || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      form.setValue('carbohydrates', value);
                      handleFieldChange("carbohydrates", value);
                    }}
                    className="w-16 h-8 text-xs text-center p-1"
                  />
                  <span className="text-xs">g</span>
                </div>
              </td>
              <td className="border border-slate-400 p-1 text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={calculatePerServing(watchedValues.carbohydrates) || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      const per100g = (value * 100) / servingSize;
                      form.setValue('carbohydrates', per100g);
                      handleFieldChange("carbohydrates", per100g);
                    }}
                    className="w-16 h-8 text-xs text-center p-1"
                  />
                  <span className="text-xs">g</span>
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-1">of which sugars</td>
              <td className="border border-slate-400 p-1 text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={watchedValues.sugars || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      form.setValue('sugars', value);
                      handleFieldChange("sugars", value);
                    }}
                    className="w-16 h-8 text-xs text-center p-1"
                  />
                  <span className="text-xs">g</span>
                </div>
              </td>
              <td className="border border-slate-400 p-1 text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={calculatePerServing(watchedValues.sugars) || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      const per100g = (value * 100) / servingSize;
                      form.setValue('sugars', per100g);
                      handleFieldChange("sugars", per100g);
                    }}
                    className="w-16 h-8 text-xs text-center p-1"
                  />
                  <span className="text-xs">g</span>
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-1">Fibre</td>
              <td className="border border-slate-400 p-1 text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={watchedValues.fiber || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      form.setValue('fiber', value);
                      handleFieldChange("fiber", value);
                    }}
                    className="w-16 h-8 text-xs text-center p-1"
                  />
                  <span className="text-xs">g</span>
                </div>
              </td>
              <td className="border border-slate-400 p-1 text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={calculatePerServing(watchedValues.fiber) || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      const per100g = (value * 100) / servingSize;
                      form.setValue('fiber', per100g);
                      handleFieldChange("fiber", per100g);
                    }}
                    className="w-16 h-8 text-xs text-center p-1"
                  />
                  <span className="text-xs">g</span>
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-1">Protein</td>
              <td className="border border-slate-400 p-1 text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={watchedValues.protein || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      form.setValue('protein', value);
                      handleFieldChange("protein", value);
                    }}
                    className="w-16 h-8 text-xs text-center p-1"
                  />
                  <span className="text-xs">g</span>
                </div>
              </td>
              <td className="border border-slate-400 p-1 text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={calculatePerServing(watchedValues.protein) || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      const per100g = (value * 100) / servingSize;
                      form.setValue('protein', per100g);
                      handleFieldChange("protein", per100g);
                    }}
                    className="w-16 h-8 text-xs text-center p-1"
                  />
                  <span className="text-xs">g</span>
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-1">Salt</td>
              <td className="border border-slate-400 p-1 text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={watchedValues.salt || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      form.setValue('salt', value);
                      handleFieldChange("salt", value);
                    }}
                    className="w-16 h-8 text-xs text-center p-1"
                  />
                  <span className="text-xs">g</span>
                </div>
              </td>
              <td className="border border-slate-400 p-1 text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={calculatePerServing(watchedValues.salt) || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      const per100g = (value * 100) / servingSize;
                      form.setValue('salt', per100g);
                      handleFieldChange("salt", per100g);
                    }}
                    className="w-16 h-8 text-xs text-center p-1"
                  />
                  <span className="text-xs">g</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Fruit/Veg/Legume Content Input */}
      <Form {...form}>
        <div className="bg-white border border-slate-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Fruit/Vegetable/Legume Content</h3>
          <p className="text-sm text-slate-600 mb-3">
            Enter the percentage of fruits, vegetables, nuts and legumes for accurate Nutri-Score calculation.
          </p>
          <FormField
            control={form.control}
            name="fruitVegLegumeContent"
            render={({ field }) => (
              <FormItem className="w-48">
                <FormLabel>Fruit/Veg/Legume Content (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="0"
                    {...field}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      field.onChange(value);
                      handleFieldChange("fruitVegLegumeContent", value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>

      {/* Nutri-Score Calculation */}
      {(() => {
        const nutriScoreResult = calculateNutriScore({
          energy: watchedValues.energy || { kj: 0, kcal: 0 },
          fat: watchedValues.fat || 0,
          saturatedFat: watchedValues.saturatedFat || 0,
          carbohydrates: watchedValues.carbohydrates || 0,
          sugars: watchedValues.sugars || 0,
          fiber: watchedValues.fiber || 0,
          protein: watchedValues.protein || 0,
          salt: watchedValues.salt || 0,
          fruitVegLegumeContent: watchedValues.fruitVegLegumeContent || 0
        });

        const claimsResult = calculateClaims({
          protein: watchedValues.protein || 0,
          fiber: watchedValues.fiber || 0,
          salt: watchedValues.salt || 0,
          sugars: watchedValues.sugars || 0,
          fat: watchedValues.fat || 0,
          saturatedFat: watchedValues.saturatedFat || 0
        });

        const validClaims = getValidClaims({
          protein: watchedValues.protein || 0,
          fiber: watchedValues.fiber || 0,
          salt: watchedValues.salt || 0,
          sugars: watchedValues.sugars || 0,
          fat: watchedValues.fat || 0,
          saturatedFat: watchedValues.saturatedFat || 0
        });

        return (
          <div className="space-y-6">
            {/* Nutri-Score Section */}
            <div className="bg-white border border-slate-300 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Nutri-Score Calculation</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Malus Score */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-red-600">Malus Score (Negative Nutrients)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Energy Score:</span>
                      <span className="font-mono">{nutriScoreResult.energyScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Saturated Fat Score:</span>
                      <span className="font-mono">{nutriScoreResult.saturatedFatScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sugar Score:</span>
                      <span className="font-mono">{nutriScoreResult.sugarScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Salt Score:</span>
                      <span className="font-mono">{nutriScoreResult.saltScore}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Total Malus:</span>
                      <span className="font-mono text-red-600">{nutriScoreResult.malusScore}</span>
                    </div>
                  </div>
                </div>

                {/* Bonus Score */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-green-600">Bonus Score (Positive Nutrients)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Fruit/Veg/Legume Score:</span>
                      <span className="font-mono">{nutriScoreResult.fruitVegLegumeScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fiber Score:</span>
                      <span className="font-mono">{nutriScoreResult.fiberScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Protein Score:</span>
                      <span className="font-mono">{nutriScoreResult.proteinScore}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Total Bonus:</span>
                      <span className="font-mono text-green-600">{nutriScoreResult.bonusScore}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Final Result */}
              <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold mb-1">Final Nutri-Score</h4>
                    <p className="text-sm text-slate-600">
                      {nutriScoreResult.malusScore} (malus) - {nutriScoreResult.bonusScore} (bonus) = {nutriScoreResult.finalScore}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <img 
                      src={getNutriScoreImage(nutriScoreResult.nutriGrade)} 
                      alt={`Nutri-Score ${nutriScoreResult.nutriGrade}`}
                      className="h-8 w-auto"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Claims Calculation Section */}
            <div className="bg-white border border-slate-300 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Nutrient Claims Analysis</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Positive Claims */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-green-600">Positive Claims</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Protein:</span>
                      <span className={`font-medium ${claimsResult.protein.bestClaim ? 'text-green-600' : 'text-slate-400'}`}>
                        {claimsResult.protein.bestClaim || "No claim"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fiber:</span>
                      <span className={`font-medium ${claimsResult.fiber.bestClaim ? 'text-green-600' : 'text-slate-400'}`}>
                        {claimsResult.fiber.bestClaim || "No claim"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Negative Claims (Low/Free) */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-blue-600">Low/Free Claims</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Salt:</span>
                      <span className={`font-medium ${claimsResult.salt.bestClaim ? 'text-blue-600' : 'text-slate-400'}`}>
                        {claimsResult.salt.bestClaim || "No claim"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sugar:</span>
                      <span className={`font-medium ${claimsResult.sugar.bestClaim ? 'text-blue-600' : 'text-slate-400'}`}>
                        {claimsResult.sugar.bestClaim || "No claim"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fat:</span>
                      <span className={`font-medium ${claimsResult.fat.bestClaim ? 'text-blue-600' : 'text-slate-400'}`}>
                        {claimsResult.fat.bestClaim || "No claim"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Saturated Fat:</span>
                      <span className={`font-medium ${claimsResult.saturatedFat.bestClaim ? 'text-blue-600' : 'text-slate-400'}`}>
                        {claimsResult.saturatedFat.bestClaim || "No claim"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary of Valid Claims */}
              {validClaims.length > 0 && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold mb-2 text-green-800">Valid Claims for Product Labeling</h4>
                  <div className="flex flex-wrap gap-2">
                    {validClaims.map((claim, index) => (
                      <span key={index} className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm font-medium">
                        {claim}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {validClaims.length === 0 && (
                <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                  <p className="text-slate-600 text-sm">No nutrient claims can be made for this product based on current nutrition values.</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          <div className="flex justify-between mt-8">
            <Button 
              type="button"
              variant="outline" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPrev();
              }}
              disabled={isLoading}
              className="flex items-center space-x-2"
              data-testid="button-previous-nutrition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            
            <Button 
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2"
              data-testid="button-next-nutrition"
            >
              <span>Continue to Storage & Preparation</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
