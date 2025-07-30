import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ProductInfo } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

import ProductDetailsStep from "@/components/steps/product-details-step";
import IngredientsStep from "@/components/steps/ingredients-step";
import NutritionStep from "@/components/steps/nutrition-step";
import ReviewStep from "@/components/steps/review-step";
import StepIndicator from "@/components/ui/step-indicator";
import DocumentPreview from "@/components/document-preview";

const STEPS = [
  { id: 1, name: "Product Details", component: ProductDetailsStep },
  { id: 2, name: "Ingredients", component: IngredientsStep },
  { id: 3, name: "Nutrition", component: NutritionStep },
  { id: 4, name: "Review", component: ReviewStep },
];

export default function ProductGenerator() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductInfo>({
    productNumber: "",
    productName: "",
    description: "",
    category: "",
    packageSize: "",
    servingSize: "40g",
    preparedBy: "",
    jobTitle: "",
    currentStep: 1,
  });

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

  // Get session data
  const { data: sessionData } = useQuery({
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
      setFormData(sessionData.sessionData as ProductInfo);
    }
  }, [sessionData]);

  const updateFormData = (updates: Partial<ProductInfo>) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
    
    if (sessionId) {
      updateSessionMutation.mutate(newData);
    }
  };

  const goToStep = (step: number) => {
    updateFormData({ currentStep: step });
  };

  const currentStepData = STEPS.find(step => step.id === formData.currentStep);
  const CurrentStepComponent = currentStepData?.component || ProductDetailsStep;

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-slate-900">Product Information Generator</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => {
                  if (sessionId) {
                    window.location.href = `/preview?sessionId=${sessionId}`;
                  }
                }}
                disabled={!sessionId}
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Preview
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Form Section */}
          <div>
            {/* Progress Steps */}
            <StepIndicator 
              currentStep={formData.currentStep} 
              totalSteps={STEPS.length}
              steps={STEPS}
              onStepClick={goToStep}
            />

            {/* Current Step Component */}
            <CurrentStepComponent 
              formData={formData} 
              onUpdate={updateFormData}
              onNext={() => goToStep(Math.min(formData.currentStep + 1, STEPS.length))}
              onPrev={() => goToStep(Math.max(formData.currentStep - 1, 1))}
              isLoading={updateSessionMutation.isPending}
            />
          </div>

          {/* Live Preview Section - Below Form */}
          <div>
            <DocumentPreview formData={formData} />
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
            onClick={() => goToStep(Math.min(formData.currentStep + 1, STEPS.length))}
            disabled={formData.currentStep === STEPS.length}
            className="text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
}
