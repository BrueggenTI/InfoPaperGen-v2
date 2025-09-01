import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ProductInfo } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

import ProductDetailsStep from "@/components/steps/product-details-step";
import IngredientsStep from "@/components/steps/ingredients-step";
import NutritionStep from "@/components/steps/nutrition-step";
import { ConditionsStep } from "@/components/steps/conditions-step";

import StepIndicator from "@/components/ui/step-indicator";
import DocumentPreview from "@/components/document-preview";
import BruggenHeader from "@/components/bruggen-header";
import { Link } from "wouter";
import { Bug } from "lucide-react";

const STEPS = [
  { id: 1, name: "Product Details", component: ProductDetailsStep },
  { id: 2, name: "Ingredients", component: IngredientsStep },
  { id: 3, name: "Nutrition Values", component: NutritionStep },
  { id: 4, name: "Storage & Preparation", component: ConditionsStep },
];

const getInitialFormData = (): ProductInfo => ({
  productNumber: "",
  productName: "",
  description: "",
  category: "",
  packageSize: "",
  servingSize: "40g",
  preparedBy: "",
  jobTitle: "",
  currentStep: 1,
  ingredients: [],
  baseProductIngredients: [],
  nutrition: {
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
  declarations: {
    sourceOfProtein: false,
    highInProtein: false,
    sourceOfFiber: false,
    highInFiber: false,
    wholegrain: false,
    isWholegrainPercentageManuallySet: false,
    manualClaims: [],
  },
  // Add other fields from ProductInfo schema with default values
});

export default function ProductGenerator() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductInfo>(getInitialFormData());

  // Check for session ID in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get('sessionId');
    if (urlSessionId) {
      setSessionId(urlSessionId);
    }
  }, []);

  const { toast } = useToast();

  // Create session on mount
  const createSessionMutation = useMutation({
    mutationFn: async (data: ProductInfo) => {
      const res = await apiRequest("POST", "/api/product-info/sessions", data);
      return await res.json();
    },
    onSuccess: (data) => {
      setSessionId(data.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update session
  const updateSessionMutation = useMutation({
    mutationFn: async (data: ProductInfo) => {
      if (!sessionId) throw new Error("No session ID");
      const res = await apiRequest("PUT", `/api/product-info/sessions/${sessionId}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-info/sessions", sessionId] });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionIdToDelete: string) => {
      if (!sessionIdToDelete) return;
      await apiRequest("DELETE", `/api/product-info/sessions/${sessionIdToDelete}`);
    },
    onSuccess: () => {
      console.log("Previous session deleted.");
    },
  });

  // Get session data
  const { data: sessionData } = useQuery<{ sessionData: ProductInfo }>({
    queryKey: ["/api/product-info/sessions", sessionId],
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (!sessionId) {
      createSessionMutation.mutate(formData);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionData && typeof sessionData === 'object' && sessionData !== null && 'sessionData' in sessionData) {
      const newSessionData = sessionData.sessionData as ProductInfo;
      // Preserve the current step to prevent jumping back when session updates
      setFormData(prevFormData => ({
        ...newSessionData,
        currentStep: prevFormData.currentStep
      }));
    }
  }, [sessionData]);

  // [ROBUST] Auto-calculate wholegrain content
  useEffect(() => {
    const ingredients = formData.ingredients || [];
    const baseIngredients = formData.baseProductIngredients || [];

    let totalWholegrainPercentage = 0;

    ingredients.forEach(ing => {
      if (ing.isWholegrain && !ing.isMarkedAsBase) {
        // Ensure percentage is a number, default to 0 if not
        totalWholegrainPercentage += Number(ing.percentage) || 0;
      }
    });

    const markedIngredient = ingredients.find(ing => ing.isMarkedAsBase);
    const markedIngredientPercentage = Number(markedIngredient?.percentage) || 0;

    if (markedIngredientPercentage > 0) {
        baseIngredients.forEach(ing => {
            if (ing.isWholegrain) {
                const basePercentage = Number(ing.percentage) || 0;
                const contribution = (basePercentage * markedIngredientPercentage) / 100;
                totalWholegrainPercentage += contribution;
            }
        });
    }

    // Final check to ensure we have a valid number
    if (isNaN(totalWholegrainPercentage)) {
        console.error("[Wholegrain] Calculation resulted in NaN. Aborting update.");
        return;
    }

    const roundedPercentage = Math.round(totalWholegrainPercentage * 10) / 10;
    const currentDeclarations = formData.declarations;

    if (!currentDeclarations) {
        return;
    }

    const hasChanged = currentDeclarations.wholegrainPercentage !== roundedPercentage;

    if (!currentDeclarations.isWholegrainPercentageManuallySet && hasChanged) {
      updateFormData({
        declarations: {
          ...currentDeclarations,
          wholegrainPercentage: roundedPercentage,
        },
      });
    }
  }, [formData.ingredients, formData.baseProductIngredients, updateFormData]);


  // Debounce hook implemented locally to avoid external dependencies.
  const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
    return debouncedValue;
  };

  const debouncedFormData = useDebounce(formData, 500); // 500ms delay

  useEffect(() => {
    // This effect watches the debounced form data. When it changes (500ms after
    // the user stops typing), it triggers the mutation to save to the server.
    if (sessionId && debouncedFormData) {
      // We only mutate if there are actual changes to prevent unnecessary updates on mount
      if (JSON.stringify(debouncedFormData) !== JSON.stringify(sessionData?.sessionData)) {
         updateSessionMutation.mutate(debouncedFormData);
      }
    }
  }, [debouncedFormData, sessionId]);

  const updateFormData = useCallback((updates: Partial<ProductInfo>) => {
    // This function now only updates the local state immediately for a responsive UI.
    // The useEffect above will handle saving the debounced state to the server.
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const goToStep = (step: number) => {
    const updatedData = { ...formData, currentStep: step };
    setFormData(updatedData); // Update state immediately for UI
    if (sessionId) {
      // Also trigger a save immediately to ensure state is persisted on step change
      updateSessionMutation.mutate(updatedData);
    }
  };

  const currentStepData = STEPS.find(step => step.id === formData.currentStep);
  const CurrentStepComponent = currentStepData?.component || ProductDetailsStep;

  const handleNew = async () => {
    //
    if (window.confirm("Are you sure you want to start a new specification? All current data will be lost.")) {
      if (sessionId) {
        // We don't need to wait for this to finish
        deleteSessionMutation.mutate(sessionId);
      }

      // Reset state and create a new session
      const initialData = getInitialFormData();
      setFormData(initialData);
      setSessionId(null); // This will trigger the useEffect to create a new session

      // Also manually trigger creation to ensure it happens immediately
      createSessionMutation.mutate(initialData);
    }
  };

  return (
    <>
      <BruggenHeader onNew={handleNew} />
      
      {/* Debug Link - Only in development */}
      {import.meta.env.DEV && (
        <div className="fixed top-4 right-4 z-50">
          <Link href="/debug">
            <button className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors" title="Debug Panel">
              <Bug className="h-4 w-4" />
            </button>
          </Link>
        </div>
      )}
      
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-border sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-4">
            </div>
            <div className="flex items-center space-x-4">
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Form Section - Full Width */}
          <div className="w-full">
            {/* Progress Steps - Full Width */}
            <div className="card-bruggen p-6">
              <StepIndicator 
                currentStep={formData.currentStep} 
                totalSteps={STEPS.length}
                steps={STEPS}
                onStepClick={goToStep}
              />
            </div>

            {/* Current Step Component - Full Width */}
            <div className="card-bruggen mt-6">
              <CurrentStepComponent 
                formData={formData} 
                onUpdate={updateFormData}
                onNext={() => goToStep(Math.min(formData.currentStep + 1, STEPS.length))}
                onPrev={() => goToStep(Math.max(formData.currentStep - 1, 1))}
                isLoading={updateSessionMutation.isPending}
              />
            </div>
          </div>

          {/* Section Divider */}
          <div className="section-divider"></div>

          {/* Live Preview Section - Full Width Below */}
          <div className="w-full" id="document-preview-content">
            <div className="card-bruggen">
              <div className="p-6 border-b border-border">
                <h3 className="text-xl font-semibold text-primary flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Live Preview
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Real-time document preview</p>
              </div>
              <DocumentPreview formData={formData} sessionId={sessionId || undefined} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Progress Indicator */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 lg:hidden">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Step {formData.currentStep} of {STEPS.length}</span>
          <div className="flex items-center space-x-2">
            {STEPS.map((step, index) => (
              <div 
                key={step.id}
                className={`w-2 h-2 rounded-full ${
                  index + 1 <= formData.currentStep ? 'bg-primary' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goToStep(Math.min(formData.currentStep + 1, STEPS.length));
            }}
            disabled={formData.currentStep === STEPS.length}
            className="text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50"
            data-testid="button-mobile-continue"
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
}
