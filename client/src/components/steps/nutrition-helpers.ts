import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateClaims, NutritionValues } from "@/lib/claims-calculator";

// AI Status Component
export const AIExtractionStatus = ({
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
export const NutritionField = ({
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

/**
 * Get all valid claims as a simple array of objects with a text property.
 */
export function getValidClaims(nutrition: NutritionValues): { text: string }[] {
  const claims = calculateClaims(nutrition);
  const validClaims: { text: string }[] = [];

  if (claims.protein.bestClaim) validClaims.push({ text: claims.protein.bestClaim });
  if (claims.fiber.bestClaim) validClaims.push({ text: claims.fiber.bestClaim });
  if (claims.salt.bestClaim) validClaims.push({ text: claims.salt.bestClaim });
  if (claims.sugar.bestClaim) validClaims.push({ text: claims.sugar.bestClaim });
  if (claims.fat.bestClaim) validClaims.push({ text: claims.fat.bestClaim });
  if (claims.saturatedFat.bestClaim) validClaims.push({ text: claims.saturatedFat.bestClaim });

  return validClaims;
}
