interface Step {
  id: number;
  name: string;
}

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: Step[];
  onStepClick?: (step: number) => void;
}

export default function StepIndicator({ 
  currentStep, 
  steps, 
  onStepClick 
}: StepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onStepClick?.(step.id)}
                  disabled={!onStepClick}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step.id <= currentStep
                      ? 'bg-primary text-white'
                      : 'bg-slate-200 text-slate-500'
                  } ${onStepClick ? 'hover:opacity-80 cursor-pointer' : ''}`}
                >
                  {step.id}
                </button>
                <span 
                  className={`text-sm font-medium ${
                    step.id <= currentStep ? 'text-primary' : 'text-slate-500'
                  }`}
                >
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="w-12 h-0.5 bg-slate-200 ml-4" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
