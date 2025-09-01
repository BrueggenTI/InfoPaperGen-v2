import { useState, useRef, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductInfo } from "@shared/schema";
import { ChevronLeft, ChevronRight, Upload, X, Loader2, Zap, Calculator, CheckCircle, AlertCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { calculateNutriScore, getNutriScoreColor } from "@/lib/nutri-score";
import { calculateClaims, getValidClaims, PROTEIN_THRESHOLDS, FIBER_THRESHOLDS } from "@/lib/claims-calculator";
import CustomClaims from "@/components/steps/custom-claims";

const nutritionSchema = z.object({
  energy: z.object({
    kj: z.number().min(0, "Energy (kJ) must be positive").max(10000, "Value too high"),
    kcal: z.number().min(0, "Energy (kcal) must be positive").max(2500, "Value too high"),
  }),
  fat: z.number().min(0, "Fat must be positive").max(100, "Value too high"),
  saturatedFat: z.number().min(0, "Saturated fat must be positive").max(100, "Value too high"),
  carbohydrates: z.number().min(0, "Carbohydrates must be positive").max(100, "Value too high"),
  sugars: z.number().min(0, "Sugars must be positive").max(100, "Value too high"),
  fiber: z.number().min(0, "Fiber must be positive").max(50, "Value too high"),
  protein: z.number().min(0, "Protein must be positive").max(100, "Value too high"),
  salt: z.number().min(0, "Salt must be positive").max(20, "Value too high"),
  fruitVegLegumeContent: z.number().min(0, "Fruit/Vegetable/Legume content must be positive").max(100, "Percentage cannot exceed 100%"),
});

interface NutritionStepProps {
  formData: ProductInfo;
  onUpdate: (data: Partial<ProductInfo>) => void;
  onNext: () => void;
  onPrev: () => void;
  isLoading?: boolean;
}

type NutritionData = z.infer<typeof nutritionSchema>;

const AIExtractionStatus = ({ isExtracting, error, onRetry }: { isExtracting: boolean; error: string | null; onRetry: () => void; }) => {
  if (isExtracting) return <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /><div className="text-blue-800"><div className="font-medium">AI is analyzing...</div></div></div>;
  if (error) return <div className="flex items-center justify-between gap-3 p-4 bg-red-50 rounded-lg border border-red-200"><div className="flex items-center gap-2 text-red-800"><AlertCircle className="w-5 h-5" /><div><div className="font-medium">Extraction failed</div><div className="text-sm opacity-80">{error}</div></div></div><Button size="sm" variant="outline" onClick={onRetry}>Retry</Button></div>;
  return null;
};

const NutritionField = ({ label, unit, value, onChange, servingValue, servingSize, error }: { label: string; unit: string; value: number; onChange: (value: number) => void; servingValue?: string; servingSize: number; error?: string; }) => (
  <div className="grid grid-cols-12 gap-4 items-center py-2">
    <div className="col-span-4"><label className="text-sm font-medium">{label}</label></div>
    <div className="col-span-3"><div className="relative"><Input type="number" step="0.1" min="0" value={value || ''} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className={`text-center ${error ? 'border-red-500' : ''}`} /><span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">{unit}</span></div></div>
    <div className="col-span-2 text-center text-sm text-muted-foreground">{servingValue || '0'}</div>
    <div className="col-span-3 text-xs text-muted-foreground">per serving ({servingSize}g)</div>
  </div>
);

const StandardClaim = ({
  claim,
  label,
  isAchieved,
  isChecked,
  onToggle,
  threshold,
  currentValue,
  children,
}: {
  claim: string;
  label: string;
  isAchieved: boolean;
  isChecked: boolean;
  onToggle: () => void;
  threshold?: number;
  currentValue?: number;
  children?: React.ReactNode;
}) => {
  const isWarning = isChecked && !isAchieved;

  return (
    <div
      className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
        isWarning
          ? "bg-red-50 border-destructive"
          : isChecked
          ? "bg-green-50 border-green-300"
          : "bg-white border-gray-200 hover:bg-gray-50"
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start space-x-3">
        <Checkbox
          checked={isChecked}
          className="mt-0.5 pointer-events-none"
          id={`checkbox-${claim}`}
        />
        <div className="flex-1 space-y-2">
          <label htmlFor={`checkbox-${claim}`} className="font-medium text-sm cursor-pointer">
            {label}
          </label>

          {/* Always visible status indicator */}
          <div className="text-xs flex items-center gap-1.5">
            {isAchieved ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-orange-500" />
            )}
            <span className={isAchieved ? "text-green-800" : "text-orange-800"}>
              {isAchieved
                ? "Threshold met"
                : `Threshold not met (requires ${threshold}g)`}
            </span>
          </div>

          {(claim === 'wholegrain' || isChecked) && children}
        </div>
      </div>
    </div>
  );
};

export default function NutritionStep({ formData, onUpdate, onNext, onPrev, isLoading = false }: NutritionStepProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  
  const servingSize = parseFloat(formData.servingSize?.replace(/[^\d.]/g, '') || '40');

  const form = useForm<NutritionData>({
    resolver: zodResolver(nutritionSchema),
    defaultValues: formData.nutrition || { energy: { kj: 0, kcal: 0 }, fat: 0, saturatedFat: 0, carbohydrates: 0, sugars: 0, fiber: 0, protein: 0, salt: 0, fruitVegLegumeContent: 0 },
  });

  const extractionMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch('/api/extract/nutrition', { method: 'POST', body: formData });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network error' }));
        throw new Error(errorData.userFriendlyMessage || errorData.message || 'API error');
      }
      return response.json();
    },
    onSuccess: (data) => {
      const nutritionData = data.nutrition || data;
      if (nutritionData && (nutritionData.energy || nutritionData.fat || nutritionData.protein)) {
        const round = (v: any) => Math.round(Number(v || 0) * 10) / 10;
        const processedData: NutritionData = {
          energy: { kj: round(nutritionData.energy?.kj), kcal: round(nutritionData.energy?.kcal) },
          fat: round(nutritionData.fat), saturatedFat: round(nutritionData.saturatedFat),
          carbohydrates: round(nutritionData.carbohydrates), sugars: round(nutritionData.sugars),
          fiber: round(nutritionData.fiber), protein: round(nutritionData.protein), salt: round(nutritionData.salt),
          fruitVegLegumeContent: round(nutritionData.fruitVegLegumeContent),
        };

        // Reset the local form to be in sync FIRST.
        form.reset(processedData);

        // Then, update the parent component's state.
        // The useEffect that syncs from parent to child will prevent a loop.
        onUpdate({ nutrition: processedData });

        setExtractionError(null);
        toast({ title: "Successfully extracted", description: "Nutrition values recognized." });
      } else {
        // This path should now be protected by the backend validation.
        throw new Error('No nutrition values detected.');
      }
    },
    onError: (error: any) => {
      setExtractionError(error.message || 'Extraction failed');
      toast({ title: "Extraction failed", description: error.message, variant: "destructive" });
    },
  });

  const processNutritionImage = (file: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please select a file under 10MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setUploadedImage(e.target?.result as string);
    reader.readAsDataURL(file);
    extractionMutation.mutate(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => processNutritionImage(event.target.files?.[0] || null);

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          processNutritionImage(new File([blob], "pasted-image.png", { type: imageType }));
          return;
        }
      }
      toast({ title: "No image found", description: "No image was found in your clipboard." });
    } catch (error) {
      console.error("Failed to read from clipboard:", error);
      toast({ title: "Paste failed", description: "Could not read from clipboard.", variant: "destructive" });
    }
  };

  const removeImage = () => {
    setUploadedImage(null);
    setExtractionError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const retryExtraction = () => {
    if (fileInputRef.current?.files?.[0]) extractionMutation.mutate(fileInputRef.current.files[0]);
  };

  const calculatePerServing = (per100g: number) => ((per100g * servingSize) / 100).toFixed(1);
  const onSubmit = (values: NutritionData) => {
    onUpdate({ nutrition: values });
    onNext();
  };

  // Sync form with external data from props
  useEffect(() => {
    if (formData.nutrition) {
      // Create a deep copy for comparison to avoid reference issues
      const currentFormValues = JSON.parse(JSON.stringify(form.getValues()));
      const parentValues = JSON.parse(JSON.stringify(formData.nutrition));

      // Only reset the form if the data from the parent is different
      // from what's currently in the form, to prevent infinite loops.
      if (JSON.stringify(currentFormValues) !== JSON.stringify(parentValues)) {
        form.reset(parentValues);
      }
    }
  }, [formData.nutrition, form]);

  // Watch for form changes and propagate them up to the parent
  useEffect(() => {
    const subscription = form.watch((values) => {
      onUpdate({ nutrition: values as NutritionData });
    });
    return () => subscription.unsubscribe();
  }, [form, onUpdate]);

  const nutrition = form.watch();
  const nutriScore = calculateNutriScore(nutrition);
  const claimsResult = calculateClaims(nutrition);
  const currentDeclarations = formData.declarations || { sourceOfProtein: false, highInProtein: false, sourceOfFiber: false, highInFiber: false, wholegrain: false, isWholegrainPercentageManuallySet: false, manualClaims: [] };
  const thresholds = useMemo(() => ({
    sourceOfProtein: claimsResult.protein.canClaimSource,
    highInProtein: claimsResult.protein.canClaimHigh,
    sourceOfFiber: claimsResult.fiber.canClaimSource,
    highInFiber: claimsResult.fiber.canClaimHigh,
  }), [claimsResult]);
  type StandardClaimKey = keyof typeof thresholds;
  const toggleStandardClaim = (claim: StandardClaimKey) => onUpdate({ declarations: { ...currentDeclarations, [claim]: !currentDeclarations[claim] } });

  return (
    <div className="w-full space-y-6" data-testid="nutrition-step">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Nutrition Values</h2>
          <p className="text-sm text-muted-foreground mt-1">Upload an image of the nutrition table or enter the values manually</p>
        </div>
        {nutriScore && <Badge variant="outline" className={`text-white font-bold px-3 py-1`} style={{ backgroundColor: getNutriScoreColor(nutriScore.nutriGrade) }}>Nutri-Score: {nutriScore.nutriGrade}</Badge>}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-blue-600" />AI-Powered Nutrition Extraction</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button type="button" variant="outline" size="lg" onClick={() => fileInputRef.current?.click()} disabled={extractionMutation.isPending}><Upload className="w-4 h-4 mr-2" />Upload Nutrition Table</Button>
            <Button type="button" variant="secondary" size="lg" onClick={handlePasteFromClipboard} disabled={extractionMutation.isPending}>Paste from clipboard</Button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </div>
          {uploadedImage && <div className="relative inline-block" style={{ aspectRatio: '16/9', width: '200px' }}><img src={uploadedImage} alt="Uploaded nutrition table" className="w-full h-full object-contain border rounded-lg" /><Button type="button" size="sm" variant="destructive" className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0" onClick={removeImage}><X className="w-3 h-3" /></Button></div>}
          <AIExtractionStatus isExtracting={extractionMutation.isPending} error={extractionError} onRetry={retryExtraction} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div className="flex justify-between items-center"><CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5 text-green-600" />Nutrition Values</CardTitle><div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Serving Size:</span><Select value={formData.servingSize || '40g'} onValueChange={(value) => onUpdate({ servingSize: value })}><SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger><SelectContent>{[10, 20, 30, 40, 50, 60, 70, 80, 90].map(size => (<SelectItem key={size} value={`${size}g`}>{size}g</SelectItem>))}</SelectContent></Select></div></div></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-12 gap-4 pb-2 border-b font-medium text-sm">
                <div className="col-span-4">Nutrient</div>
                <div className="col-span-3 text-center">per 100g</div>
                <div className="col-span-2 text-center">per serving</div>
                <div className="col-span-3"></div>
              </div>
              <FormField control={form.control} name="energy.kcal" render={({ field }) => (<NutritionField label="Energy" unit="kcal" value={field.value} onChange={field.onChange} servingSize={servingSize} servingValue={calculatePerServing(field.value)} error={form.formState.errors.energy?.kcal?.message} />)} />
              <FormField control={form.control} name="energy.kj" render={({ field }) => (<NutritionField label="" unit="kJ" value={field.value} onChange={field.onChange} servingSize={servingSize} servingValue={calculatePerServing(field.value)} error={form.formState.errors.energy?.kj?.message} />)} />
              <Separator />
              <FormField control={form.control} name="fat" render={({ field }) => (<NutritionField label="Fat" unit="g" value={field.value} onChange={field.onChange} servingSize={servingSize} servingValue={calculatePerServing(field.value)} error={form.formState.errors.fat?.message} />)} />
              <FormField control={form.control} name="saturatedFat" render={({ field }) => (<NutritionField label="of which saturates" unit="g" value={field.value} onChange={field.onChange} servingSize={servingSize} servingValue={calculatePerServing(field.value)} error={form.formState.errors.saturatedFat?.message} />)} />
              <Separator />
              <FormField control={form.control} name="carbohydrates" render={({ field }) => (<NutritionField label="Carbohydrate" unit="g" value={field.value} onChange={field.onChange} servingSize={servingSize} servingValue={calculatePerServing(field.value)} error={form.formState.errors.carbohydrates?.message} />)} />
              <FormField control={form.control} name="sugars" render={({ field }) => (<NutritionField label="of which sugars" unit="g" value={field.value} onChange={field.onChange} servingSize={servingSize} servingValue={calculatePerServing(field.value)} error={form.formState.errors.sugars?.message} />)} />
              <Separator />
              <FormField control={form.control} name="fiber" render={({ field }) => (<NutritionField label="Fibre" unit="g" value={field.value} onChange={field.onChange} servingSize={servingSize} servingValue={calculatePerServing(field.value)} error={form.formState.errors.fiber?.message} />)} />
              <Separator />
              <FormField control={form.control} name="protein" render={({ field }) => (<NutritionField label="Protein" unit="g" value={field.value} onChange={field.onChange} servingSize={servingSize} servingValue={calculatePerServing(field.value)} error={form.formState.errors.protein?.message} />)} />
              <Separator />
              <FormField control={form.control} name="salt" render={({ field }) => (<NutritionField label="Salt" unit="g" value={field.value} onChange={field.onChange} servingSize={servingSize} servingValue={calculatePerServing(field.value)} error={form.formState.errors.salt?.message} />)} />
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-teal-600" />Declarations (Claims)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Standard Claims</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StandardClaim
              claim="sourceOfProtein"
              label="Source of Protein"
              isAchieved={thresholds.sourceOfProtein}
              isChecked={!!currentDeclarations.sourceOfProtein}
              onToggle={() => toggleStandardClaim('sourceOfProtein')}
              threshold={PROTEIN_THRESHOLDS.SOURCE}
              currentValue={nutrition.protein}
            />
            <StandardClaim
              claim="highInProtein"
              label="High in Protein"
              isAchieved={thresholds.highInProtein}
              isChecked={!!currentDeclarations.highInProtein}
              onToggle={() => toggleStandardClaim('highInProtein')}
              threshold={PROTEIN_THRESHOLDS.HIGH}
              currentValue={nutrition.protein}
            />
            <StandardClaim
              claim="sourceOfFiber"
              label="Source of Fibre"
              isAchieved={thresholds.sourceOfFiber}
              isChecked={!!currentDeclarations.sourceOfFiber}
              onToggle={() => toggleStandardClaim('sourceOfFiber')}
              threshold={FIBER_THRESHOLDS.SOURCE}
              currentValue={nutrition.fiber}
            />
            <StandardClaim
              claim="highInFiber"
              label="High in Fibre"
              isAchieved={thresholds.highInFiber}
              isChecked={!!currentDeclarations.highInFiber}
              onToggle={() => toggleStandardClaim('highInFiber')}
              threshold={FIBER_THRESHOLDS.HIGH}
              currentValue={nutrition.fiber}
            />
            <div className="md:col-span-2">
              <StandardClaim claim="wholegrain" label="Content of wholegrain" isAchieved={true} isChecked={!!currentDeclarations.wholegrain} onToggle={() => onUpdate({ declarations: { ...currentDeclarations, wholegrain: !currentDeclarations.wholegrain } })}>
                <>
                  <div className="text-xs text-gray-500">Auto-calculated from ingredients. Check to activate and manually override the value if needed.</div>
                  <div className="relative w-24 mt-2">
                    <Input type="number" step="0.1" min="0" placeholder="e.g. 45.5" value={currentDeclarations?.wholegrainPercentage || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        onUpdate({
                          declarations: {
                            ...currentDeclarations,
                            wholegrainPercentage: value === '' ? undefined : parseFloat(value),
                            isWholegrainPercentageManuallySet: true,
                          },
                        });
                      }}
                      onClick={(e) => e.stopPropagation()} className="text-center pr-8"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                </>
              </StandardClaim>
            </div>
          </div>
          <CustomClaims declarations={currentDeclarations} onUpdate={onUpdate} />
        </CardContent>
      </Card>

      <div className="flex justify-between pt-6">
        <Button type="button" variant="outline" onClick={onPrev} disabled={isLoading}><ChevronLeft className="w-4 h-4 mr-2" />Back</Button>
        <Button onClick={() => form.handleSubmit(onSubmit)()} disabled={isLoading || !form.formState.isValid}><ChevronRight className="w-4 h-4 ml-2" />Next</Button>
      </div>
    </div>
  );
}