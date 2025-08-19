
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";

interface NutritionDebugPanelProps {
  extractionStatus: 'idle' | 'loading' | 'success' | 'error';
  lastResponse?: any;
  lastError?: any;
  formValues?: any;
  isVisible?: boolean;
}

export default function NutritionDebugPanel({
  extractionStatus,
  lastResponse,
  lastError,
  formValues,
  isVisible = false
}: NutritionDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible) return null;

  const getStatusColor = () => {
    switch (extractionStatus) {
      case 'loading': return 'bg-blue-500';
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="mt-4 border-2 border-dashed border-orange-300 bg-orange-50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-orange-700">🐛 Debug Panel</span>
            <Badge className={getStatusColor()}>{extractionStatus}</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4 text-xs">
          <div>
            <h4 className="font-semibold text-orange-700 mb-1">Extraction Status</h4>
            <Badge className={getStatusColor()}>{extractionStatus}</Badge>
          </div>

          {lastResponse && (
            <div>
              <h4 className="font-semibold text-green-700 mb-1">Last API Response</h4>
              <pre className="bg-green-100 p-2 rounded text-xs overflow-auto max-h-32">
                {JSON.stringify(lastResponse, null, 2)}
              </pre>
            </div>
          )}

          {lastError && (
            <div>
              <h4 className="font-semibold text-red-700 mb-1">Last Error</h4>
              <pre className="bg-red-100 p-2 rounded text-xs overflow-auto max-h-32">
                {JSON.stringify(lastError, null, 2)}
              </pre>
            </div>
          )}

          {formValues && (
            <div>
              <h4 className="font-semibold text-blue-700 mb-1">Current Form Values</h4>
              <pre className="bg-blue-100 p-2 rounded text-xs overflow-auto max-h-32">
                {JSON.stringify(formValues, null, 2)}
              </pre>
            </div>
          )}

          <div>
            <h4 className="font-semibold text-gray-700 mb-1">Debug Info</h4>
            <div className="text-xs space-y-1">
              <div>Timestamp: {new Date().toISOString()}</div>
              <div>User Agent: {navigator.userAgent.substring(0, 60)}...</div>
              <div>URL: {window.location.href}</div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
