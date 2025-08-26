import { useState, useRef, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProductInfo } from "@shared/schema";
import { ChevronLeft, ChevronRight, Upload, Camera, X, Loader2, Zap, Calculator, CheckCircle, AlertCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { calculateNutriScore, getNutriScoreColor } from "@/lib/nutri-score";
import { calculateClaims } from "@/lib/claims-calculator";

// Enhanced nutrition schema with German validation messages
const nutritionSchema = z.object({
  energy: z.object({
    kj: z.number().min(0, "Energie (kJ) muss positiv sein").max(10000, "Wert zu hoch"),
    kcal: z.number().min(0, "Energie (kcal) muss positiv sein").max(2500, "Wert zu hoch"),
  }),
  fat: z.number().min(0, "Fett muss positiv sein").max(100, "Wert zu hoch"),
  saturatedFat: z.number().min(0, "Gesättigte Fettsäuren müssen positiv sein").max(100, "Wert zu hoch"),
  carbohydrates: z.number().min(0, "Kohlenhydrate müssen positiv sein").max(100, "Wert zu hoch"),
  sugars: z.number().min(0, "Zucker muss positiv sein").max(100, "Wert zu hoch"),
  fiber: z.number().min(0, "Ballaststoffe müssen positiv sein").max(50, "Wert zu hoch"),
  protein: z.number().min(0, "Protein muss positiv sein").max(100, "Wert zu hoch"),
  salt: z.number().min(0, "Salz muss positiv sein").max(20, "Wert zu hoch"),
  fruitVegLegumeContent: z.number().min(0, "Obst-/Gemüse-/Hülsenfrucht-Anteil muss positiv sein").max(100, "Prozent darf 100% nicht überschreiten"),
});

interface NutritionStepProps {
  formData: ProductInfo;
  onUpdate: (data: Partial<ProductInfo>) => void;
  onNext: () => void;
  onPrev: () => void;
  isLoading?: boolean;
}

type NutritionData = z.infer<typeof nutritionSchema>;

// AI Status Component
const AIExtractionStatus = ({ 
  isExtracting, 
  error, 
  onRetry 
}: { 
  isExtracting: boolean; 
  error: string | null; 
  onRetry: () => void; 
}) => {
  if (isExtracting) {
    return (
      <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <div className="text-blue-800 dark:text-blue-200">
          <div className="font-medium">KI analysiert Nährwerttabelle...</div>
          <div className="text-sm opacity-80">Dies kann einige Sekunden dauern</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
          <AlertCircle className="w-5 h-5" />
          <div>
            <div className="font-medium">Extraktion fehlgeschlagen</div>
            <div className="text-sm opacity-80">{error}</div>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onRetry} className="shrink-0">
          Erneut versuchen
        </Button>
      </div>
    );
  }

  return null;
};

// Nutrition Field Component
const NutritionField = ({
  label,
  unit,
  value,
  onChange,
  servingValue,
  error
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (value: number) => void;
  servingValue?: string;
  error?: string;
}) => (
  <div className="grid grid-cols-12 gap-4 items-center py-2">
    <div className="col-span-4">
      <label className="text-sm font-medium">{label}</label>
    </div>
    <div className="col-span-3">
      <div className="relative">
        <Input
          type="number"
          step="0.1"
          min="0"
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={`text-center ${error ? 'border-red-500' : ''}`}
          data-testid={`input-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
        />
        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
    <div className="col-span-2 text-center text-sm text-muted-foreground">
      {servingValue || '0'}
    </div>
    <div className="col-span-3 text-xs text-muted-foreground">
      je Portion ({parseFloat('40')}g)
    </div>
  </div>
);

export default function NutritionStep({
  formData,
  onUpdate,
  onNext,
  onPrev,
  isLoading = false,
}: NutritionStepProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  
  const servingSize = parseFloat(formData.servingSize?.replace(/[^\d.]/g, '') || '40');

  const form = useForm<NutritionData>({
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

  // AI Extraction Mutation
  const extractionMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/extract/nutrition', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: 'Netzwerkfehler aufgetreten'
        }));
        throw new Error(errorData.userFriendlyMessage || errorData.message || 'API-Fehler');
      }

      return response.json();
    },
    onSuccess: (data) => {
      const nutritionData = data.nutrition || data;
      
      if (nutritionData && (nutritionData.energy || nutritionData.fat || nutritionData.protein)) {
        const processedData: NutritionData = {
          energy: nutritionData.energy || { kj: 0, kcal: 0 },
          fat: Number(nutritionData.fat) || 0,
          saturatedFat: Number(nutritionData.saturatedFat) || 0,
          carbohydrates: Number(nutritionData.carbohydrates) || 0,
          sugars: Number(nutritionData.sugars) || 0,
          fiber: Number(nutritionData.fiber) || 0,
          protein: Number(nutritionData.protein) || 0,
          salt: Number(nutritionData.salt) || 0,
          fruitVegLegumeContent: Number(nutritionData.fruitVegLegumeContent) || 0,
        };

        form.reset(processedData);
        onUpdate({ nutrition: processedData });
        setExtractionError(null);

        toast({
          title: "Erfolgreich extrahiert",
          description: "Nährwerte wurden aus dem Bild erkannt und eingetragen",
        });
      } else {
        throw new Error('Keine Nährwerte im Bild erkannt');
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Extraktion fehlgeschlagen';
      setExtractionError(errorMessage);
      toast({
        title: "Extraktion fehlgeschlagen",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Datei zu groß",
        description: "Bitte wählen Sie eine Datei unter 10MB",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Start extraction
    extractionMutation.mutate(file);
  };

  const removeImage = () => {
    setUploadedImage(null);
    setExtractionError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const retryExtraction = () => {
    if (fileInputRef.current?.files?.[0]) {
      extractionMutation.mutate(fileInputRef.current.files[0]);
    }
  };

  // Calculate per serving values
  const calculatePerServing = (per100g: number) => {
    return ((per100g * servingSize) / 100).toFixed(1);
  };

  // Handle form submission
  const onSubmit = (values: NutritionData) => {
    onUpdate({ nutrition: values });
    onNext();
  };

  // Auto-save on value changes
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (Object.values(values).some(v => v !== 0 && v !== null && v !== undefined)) {
        onUpdate({ nutrition: values as NutritionData });
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onUpdate]);

  // --- Safe Calculation Logic ---
  // Create a safe, default nutrition object to prevent crashes on first render
  const defaultNutrition = {
    energy: { kj: 0, kcal: 0 }, fat: 0, saturatedFat: 0, carbohydrates: 0,
    sugars: 0, fiber: 0, protein: 0, salt: 0, fruitVegLegumeContent: 0,
  };

  // Use watchedValues from the form if available, otherwise fall back to the safe default
  const nutrition = watchedValues && Object.keys(watchedValues).length > 1 ? watchedValues : defaultNutrition;

  // Calculate Nutri-Score and claims for display, always using a valid nutrition object
  const nutriScore = calculateNutriScore(nutrition);
  const claimsResult = calculateClaims(nutrition);
  const validClaims = getValidClaims(nutrition);

  const currentDeclarations = formData.declarations || {};

  // Memoize threshold calculations based on the safe nutrition object
  const thresholds = useMemo(() => {
    return {
      sourceOfProtein: claimsResult.protein.canClaimSource,
      highInProtein: claimsResult.protein.canClaimHigh,
      sourceOfFiber: claimsResult.fiber.canClaimSource,
      highInFiber: claimsResult.fiber.canClaimHigh,
    };
  }, [claimsResult]);

  const toggleStandardClaim = (claim: keyof Omit<ProductInfo['declarations'], 'manualClaims'>) => {
    const newDeclarations = {
      ...currentDeclarations,
      [claim]: !currentDeclarations[claim],
    };
    onUpdate({ declarations: newDeclarations });
  };

  return (
    <div className="w-full space-y-6" data-testid="nutrition-step">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Nährwertangaben</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Laden Sie ein Bild der Nährwerttabelle hoch oder geben Sie die Werte manuell ein
          </p>
        </div>
        {nutriScore && (
          <Badge 
            variant="outline" 
            className={`text-white font-bold px-3 py-1`}
            style={{ backgroundColor: getNutriScoreColor(nutriScore.nutriGrade) }}
            data-testid="nutri-score-badge"
          >
            Nutri-Score: {nutriScore.nutriGrade}
          </Badge>
        )}
      </div>

      {/* AI Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            KI-gestützte Nährwert-Extraktion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => fileInputRef.current?.click()}
              disabled={extractionMutation.isPending}
              className="flex items-center gap-2"
              data-testid="button-upload-nutrition"
            >
              {extractionMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Nährwerttabelle hochladen
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              data-testid="input-nutrition-image"
            />

            {validClaims.length > 0 && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">{validClaims.length} gültige Auslobung(en)</span>
              </div>
            )}
          </div>

          {uploadedImage && (
            <div className="relative inline-block">
              <img 
                src={uploadedImage} 
                alt="Hochgeladene Nährwerttabelle" 
                className="max-w-xs max-h-48 object-contain border rounded-lg"
              />
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                onClick={removeImage}
                data-testid="button-remove-nutrition-image"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          <AIExtractionStatus
            isExtracting={extractionMutation.isPending}
            error={extractionError}
            onRetry={retryExtraction}
          />
        </CardContent>
      </Card>

      {/* Manual Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-green-600" />
            Nährwerte (pro 100g)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Table Headers */}
              <div className="grid grid-cols-12 gap-4 pb-2 border-b font-medium text-sm">
                <div className="col-span-4">Nährwert</div>
                <div className="col-span-3 text-center">pro 100g</div>
                <div className="col-span-2 text-center">pro Portion</div>
                <div className="col-span-3"></div>
              </div>

              {/* Energy Fields */}
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="energy.kj"
                  render={({ field }) => (
                    <FormItem>
                      <NutritionField
                        label="Energie"
                        unit="kJ"
                        value={field.value}
                        onChange={field.onChange}
                        servingValue={calculatePerServing(field.value)}
                        error={form.formState.errors.energy?.kj?.message}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="energy.kcal"
                  render={({ field }) => (
                    <FormItem>
                      <NutritionField
                        label=""
                        unit="kcal"
                        value={field.value}
                        onChange={field.onChange}
                        servingValue={calculatePerServing(field.value)}
                        error={form.formState.errors.energy?.kcal?.message}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Other Nutrition Fields */}
              {[
                { name: 'fat' as const, label: 'Fett', unit: 'g' },
                { name: 'saturatedFat' as const, label: '  davon gesättigte Fettsäuren', unit: 'g' },
                { name: 'carbohydrates' as const, label: 'Kohlenhydrate', unit: 'g' },
                { name: 'sugars' as const, label: '  davon Zucker', unit: 'g' },
                { name: 'fiber' as const, label: 'Ballaststoffe', unit: 'g' },
                { name: 'protein' as const, label: 'Eiweiß', unit: 'g' },
                { name: 'salt' as const, label: 'Salz', unit: 'g' },
              ].map(({ name, label, unit }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <NutritionField
                        label={label}
                        unit={unit}
                        value={field.value}
                        onChange={field.onChange}
                        servingValue={calculatePerServing(field.value)}
                        error={form.formState.errors[name]?.message}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              <Separator />

              {/* Fruit/Veg/Legume Content */}
              <FormField
                control={form.control}
                name="fruitVegLegumeContent"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-12 gap-4 items-center py-2">
                      <div className="col-span-4">
                        <FormLabel className="text-sm font-medium">
                          Obst-/Gemüse-/Hülsenfrucht-Anteil
                        </FormLabel>
                      </div>
                      <div className="col-span-3">
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              className="text-center"
                              data-testid="input-fruit-veg-legume"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                              %
                            </span>
                          </div>
                        </FormControl>
                      </div>
                      <div className="col-span-5 text-xs text-muted-foreground">
                        Für Nutri-Score Berechnung (optional)
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onPrev}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                  data-testid="button-previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Zurück
                </Button>
                
                <Button
                  type="submit"
                  disabled={isLoading || !form.formState.isValid}
                  className="flex items-center gap-2"
                  data-testid="button-next"
                >
                  Weiter
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Declarations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-teal-600" />
            Deklarationen (Auslobungen)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Standard-Auslobungen</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Source of Protein */}
            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                currentDeclarations?.sourceOfProtein
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-gray-200 hover:border-blue-200'
              }`}
              onClick={() => toggleStandardClaim('sourceOfProtein')}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={Boolean(currentDeclarations?.sourceOfProtein)}
                  data-testid="checkbox-source-protein"
                  className="mt-0.5 pointer-events-none"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">Source of protein</div>
                  <div className="text-xs text-gray-500 mt-1">Requires ≥12g per 100g</div>
                  <div className="text-xs mt-1">
                    {thresholds.sourceOfProtein ? (
                      <span className="text-green-600">✓ Requirements met ({nutrition.protein}g)</span>
                    ) : (
                      <span className="text-orange-500">⚠ Requirements not met ({nutrition.protein}g) - Can still be selected</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* High Protein */}
            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                currentDeclarations?.highInProtein
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-gray-200 hover:border-blue-200'
              }`}
              onClick={() => toggleStandardClaim('highInProtein')}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={Boolean(currentDeclarations?.highInProtein)}
                  data-testid="checkbox-high-protein"
                  className="mt-0.5 pointer-events-none"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">High protein</div>
                  <div className="text-xs text-gray-500 mt-1">Requires ≥20g per 100g</div>
                  <div className="text-xs mt-1">
                    {thresholds.highInProtein ? (
                      <span className="text-green-600">✓ Requirements met ({nutrition.protein}g)</span>
                    ) : (
                      <span className="text-orange-500">⚠ Requirements not met ({nutrition.protein}g) - Can still be selected</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Source of Fibre */}
            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                currentDeclarations?.sourceOfFiber
                  ? 'bg-green-50 border-green-300'
                  : 'bg-white border-gray-200 hover:border-green-200'
              }`}
              onClick={() => toggleStandardClaim('sourceOfFiber')}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={Boolean(currentDeclarations?.sourceOfFiber)}
                  data-testid="checkbox-source-fiber"
                  className="mt-0.5 pointer-events-none"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">Source of fibre</div>
                  <div className="text-xs text-gray-500 mt-1">Requires ≥3g per 100g</div>
                  <div className="text-xs mt-1">
                    {thresholds.sourceOfFiber ? (
                      <span className="text-green-600">✓ Requirements met ({nutrition.fiber}g)</span>
                    ) : (
                      <span className="text-orange-500">⚠ Requirements not met ({nutrition.fiber}g) - Can still be selected</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* High Fibre */}
            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                currentDeclarations?.highInFiber
                  ? 'bg-green-50 border-green-300'
                  : 'bg-white border-gray-200 hover:border-green-200'
              }`}
              onClick={() => toggleStandardClaim('highInFiber')}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={Boolean(currentDeclarations?.highInFiber)}
                  data-testid="checkbox-high-fiber"
                  className="mt-0.5 pointer-events-none"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">High fibre</div>
                  <div className="text-xs text-gray-500 mt-1">Requires ≥6g per 100g</div>
                  <div className="text-xs mt-1">
                    {thresholds.highInFiber ? (
                      <span className="text-green-600">✓ Requirements met ({nutrition.fiber}g)</span>
                    ) : (
                      <span className="text-orange-500">⚠ Requirements not met ({nutrition.fiber}g) - Can still be selected</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content of wholegrain */}
            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-sm md:col-span-2 ${
                currentDeclarations?.wholegrain
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-white border-gray-200 hover:border-amber-200'
              }`}
              onClick={() => toggleStandardClaim('wholegrain')}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={Boolean(currentDeclarations?.wholegrain)}
                  data-testid="checkbox-wholegrain"
                  className="mt-0.5 pointer-events-none"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">Content of wholegrain</div>
                  <div className="text-xs text-gray-500 mt-1">Manual selection. Check if the product contains wholegrain.</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Section */}
      {nutriScore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-600" />
              Zusammenfassung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-secondary/20 rounded-lg">
                <div className="text-2xl font-bold" style={{ color: getNutriScoreColor(nutriScore.nutriGrade) }}>
                  {nutriScore.nutriGrade}
                </div>
                <div className="text-sm text-muted-foreground">Nutri-Score</div>
              </div>
              
              <div className="text-center p-4 bg-secondary/20 rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {validClaims.length}
                </div>
                <div className="text-sm text-muted-foreground">Gültige Auslobungen</div>
              </div>
              
              <div className="text-center p-4 bg-secondary/20 rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {watchedValues.energy.kcal}
                </div>
                <div className="text-sm text-muted-foreground">kcal pro 100g</div>
              </div>
            </div>

            {validClaims.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Mögliche Auslobungen:</h4>
                <div className="flex flex-wrap gap-2">
                  {validClaims.map((claim: any, index: number) => (
                    <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                      {claim.text}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}