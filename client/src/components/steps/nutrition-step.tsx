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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Energy */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-slate-200 rounded-lg">
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Energy</h3>
            </div>
            <div>
              <FormField
                control={form.control}
                name="energy.kj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>kJ per 100g</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          field.onChange(value);
                          handleFieldChange("energy", value, "kj");
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="text-sm text-slate-600 flex items-end pb-2">
              {calculatePerServing(watchedValues.energy.kj)} kJ per {servingSize}g
            </div>

            <div></div>
            <div>
              <FormField
                control={form.control}
                name="energy.kcal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>kcal per 100g</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          field.onChange(value);
                          handleFieldChange("energy", value, "kcal");
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="text-sm text-slate-600 flex items-end pb-2">
              {calculatePerServing(watchedValues.energy.kcal)} kcal per {servingSize}g
            </div>
          </div>

          {/* Macronutrients */}
          {[
            { key: 'fat', label: 'Fat', unit: 'g' },
            { key: 'saturatedFat', label: 'Saturated Fat', unit: 'g' },
            { key: 'carbohydrates', label: 'Carbohydrates', unit: 'g' },
            { key: 'sugars', label: 'Sugars', unit: 'g' },
            { key: 'fiber', label: 'Fiber', unit: 'g' },
            { key: 'protein', label: 'Protein', unit: 'g' },
            { key: 'salt', label: 'Salt', unit: 'g' },
          ].map((nutrient) => (
            <div key={nutrient.key} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-slate-200 rounded-lg">
              <div>
                <h3 className="font-medium text-slate-900">{nutrient.label}</h3>
              </div>
              <div>
                <FormField
                  control={form.control}
                  name={nutrient.key as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{nutrient.unit} per 100g</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            field.onChange(value);
                            handleFieldChange(nutrient.key, value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="text-sm text-slate-600 flex items-end pb-2">
                {calculatePerServing(watchedValues[nutrient.key as keyof typeof watchedValues] as number)} {nutrient.unit} per {servingSize}g
              </div>
            </div>
          ))}

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
