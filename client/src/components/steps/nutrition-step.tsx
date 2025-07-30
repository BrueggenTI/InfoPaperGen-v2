import { useState, useEffect, useRef } from "react";
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
        form.reset(data.nutrition);
        onUpdate({ nutrition: data.nutrition });
        toast({
          title: "Nährwerte extrahiert",
          description: "Die Nährwerte wurden erfolgreich aus dem Bild extrahiert.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Fehler bei der Extraktion",
        description: "Die Nährwerte konnten nicht aus dem Bild extrahiert werden. Bitte geben Sie sie manuell ein.",
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
        title: "Datei zu groß",
        description: "Bitte wählen Sie eine Datei unter 10MB.",
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

  const handleFieldChange = (field: string, value: number, nestedField?: string) => {
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
          ...formData.nutrition,
          [field]: value,
        },
      };
    }
    onUpdate(updateData);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">Nutritional Information</h2>
        <p className="text-slate-600">
          Review and edit the extracted nutritional values per 100g. Values per {servingSize}g serving will be calculated automatically.
        </p>
      </div>

      {/* Nutrition Image Upload */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="w-5 h-5" />
            <span>Nährwerttabelle hochladen</span>
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
              Laden Sie ein Bild der Nährwerttabelle hoch, um die Werte automatisch zu extrahieren
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => nutritionImageInputRef.current?.click()}
              disabled={isLoading || extractNutritionMutation.isPending}
            >
              {extractNutritionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extrahiere Nährwerte...
                </>
              ) : (
                "Nährwerttabelle hochladen"
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
          <tbody>
            <tr>
              <td className="border border-slate-400 p-2 text-center font-semibold">
                per 100 g of product
              </td>
              <td className="border border-slate-400 p-2 text-center font-semibold">
                per {servingSize} g of product
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-1">Energy</td>
              <td className="border border-slate-400 p-1 text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={watchedValues.energy.kj || ''}
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
                    value={watchedValues.energy.kcal || ''}
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
                    value={calculatePerServing(watchedValues.energy.kj) || ''}
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
                    value={calculatePerServing(watchedValues.energy.kcal) || ''}
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          <div className="flex justify-between mt-8">
            <Button 
              type="button"
              variant="outline" 
              onClick={onPrev}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            
            <Button 
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <span>Continue to Review</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
