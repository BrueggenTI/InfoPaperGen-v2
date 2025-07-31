import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ProductInfo } from "@shared/schema";

interface ConditionsStepProps {
  formData: Partial<ProductInfo>;
  onUpdate: (data: Partial<ProductInfo>) => void;
  onNext: () => void;
  onPrev: () => void;
  isLoading?: boolean;
}

const conditionsSchema = z.object({
  productType: z.string().optional(),
  shelfLifeMonths: z.number().optional(),
  storageConditions: z.string().optional(),
  allergyAdvice: z.string().optional(),
  preparationType: z.string().optional(),
  preparation: z.string().optional(),
});

// Product types with their shelf life in months
const PRODUCT_SHELF_LIFE = {
  "Cornflakes": 14,
  "Cornflakes with cacao": 12,
  "Crunchy flakes (peanut honey)": 14,
  "Oat flakes (toasted)": 10,
  "Rice flakes (toasted)": 12,
  "Multigrain flakes": 12,
  "Puffed wheat/barley/rye/rice": 12,
  "Swietwiet (puffed wheat with honey)": 14,
  "Extruded products": 14,
  "Extruded oat products": 10,
  "Bransticks": 9,
  "Muesli": 12,
  "Crunchy muesli with sunflower oil": 9,
  "Muesli bars": 12,
  "Bars without sugar": 10,
  "Fruit bars": 9,
  "Wheat flakes": 15,
  "Nutriments (sago, pearl, etc.)": 15,
  "Porridge (incl. protein porridge)": 12,
  "Puddings (incl. protein pudding)": 12,
  "Probiotic products (e.g., Lactobacillus)": 8,
} as const;

// Default allergy advice text
const DEFAULT_ALLERGY_ADVICE = "Product contains allergen ingredients according to ingredient list and will be produced in an environment, where the following allergens are present: cereals containing gluten, milk products, nuts, peanuts, sesame seeds and soya products.";

// Preparation types and their corresponding text
const PREPARATION_TYPES = {
  "Porridge": "1) Open the lid\n2) Pour with 150 ml hot water and mix thoroughly\n3) Wait for 3 minutes and it's ready",
  "Other Product": "Dont Apply"
} as const;

export function ConditionsStep({ formData, onUpdate, onNext, onPrev, isLoading }: ConditionsStepProps) {
  const form = useForm<z.infer<typeof conditionsSchema>>({
    resolver: zodResolver(conditionsSchema),
    defaultValues: {
      productType: formData.productType || "",
      shelfLifeMonths: formData.shelfLifeMonths || undefined,
      storageConditions: formData.storageConditions || "",
      allergyAdvice: formData.allergyAdvice || DEFAULT_ALLERGY_ADVICE,
      preparationType: formData.preparationType || "",
      preparation: formData.preparation || "",
    },
  });

  const generateStorageConditions = (months: number): string => {
    return `${months}* months in original packaging unit at about 20°C and relative humidity below 60%.\n* To confirm on the storage test.`;
  };

  const handleProductTypeChange = (productType: string) => {
    const shelfLife = PRODUCT_SHELF_LIFE[productType as keyof typeof PRODUCT_SHELF_LIFE];
    if (shelfLife) {
      form.setValue('shelfLifeMonths', shelfLife);
      const storageText = generateStorageConditions(shelfLife);
      form.setValue('storageConditions', storageText);
      
      onUpdate({
        productType,
        shelfLifeMonths: shelfLife,
        storageConditions: storageText,
      });
    }
  };

  const handlePreparationTypeChange = (preparationType: string) => {
    const preparationText = PREPARATION_TYPES[preparationType as keyof typeof PREPARATION_TYPES];
    if (preparationText) {
      form.setValue('preparation', preparationText);
      
      onUpdate({
        preparationType,
        preparation: preparationText,
      });
    }
  };

  const onSubmit = (values: z.infer<typeof conditionsSchema>) => {
    onUpdate(values);
    onNext();
  };

  const handleFieldChange = (field: keyof z.infer<typeof conditionsSchema>, value: any) => {
    onUpdate({ [field]: value });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-primary mb-2">Conditions & Notes</h2>
        <p className="text-muted-foreground">
          Select the product type and add storage conditions, allergy advice, and preparation instructions.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Storage Conditions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Storage Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Type</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleProductTypeChange(value);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.keys(PRODUCT_SHELF_LIFE).map((productType) => (
                          <SelectItem key={productType} value={productType}>
                            {productType} ({PRODUCT_SHELF_LIFE[productType as keyof typeof PRODUCT_SHELF_LIFE]} months)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('shelfLifeMonths') && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">
                    Shelf Life: {form.watch('shelfLifeMonths')} months
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Storage conditions have been automatically generated below.
                  </p>
                </div>
              )}

              <FormField
                control={form.control}
                name="storageConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage Conditions Text</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Storage conditions will be automatically generated when you select a product type..."
                        className="min-h-[100px]"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          handleFieldChange('storageConditions', e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Allergy Advice Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Allergy Advice</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="allergyAdvice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allergy Information</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter allergy information and warnings..."
                        className="min-h-[120px]"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          handleFieldChange('allergyAdvice', e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Preparations Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preparations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="preparationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preparation Type</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        handlePreparationTypeChange(value);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select preparation type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Porridge">Porridge</SelectItem>
                        <SelectItem value="Other Product">Other Product</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preparation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preparation Instructions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Preparation instructions will be automatically generated when you select a preparation type..."
                        className="min-h-[100px]"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          handleFieldChange('preparation', e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onPrev}
            >
              Previous
            </Button>
            <Button type="submit" disabled={isLoading}>
              Complete
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}