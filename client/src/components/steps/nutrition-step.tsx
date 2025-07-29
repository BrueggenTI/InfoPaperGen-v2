import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ProductInfo } from "@shared/schema";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  // Calculate per serving values
  const calculatePerServing = (per100g: number) => {
    return (per100g * servingSize / 100).toFixed(1);
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
          [field]: {
            ...(formData.nutrition?.[field as keyof typeof formData.nutrition] as any),
            [nestedField]: value,
          },
        },
      };
    } else {
      updateData = {
        nutrition: {
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
