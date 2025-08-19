import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "./lib/queryClient";
import ErrorBoundary from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import ProductGenerator from "@/pages/product-generator";
import DocumentPreviewPage from "@/pages/document-preview-page";
import PDFPreview from "@/pages/pdf-preview";
import PDFPreviewPage from "@/pages/pdf-preview-page";

// Debug logging function
const debugLog = (message: string, data?: any) => {
  console.log(`[APP DEBUG] ${message}`, data);
};

function Router() {
  debugLog("Router component rendered");
  
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <Switch>
        <Route path="/" component={ProductGenerator} />
        <Route path="/preview" component={() => <DocumentPreviewPage />} />
        <Route path="/pdf-preview" component={PDFPreview} />
        <Route path="/document-preview" component={() => <PDFPreviewPage />} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  debugLog("App component rendered");
  debugLog("QueryClient available:", !!queryClient);
  
  try {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    debugLog("App component error:", error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600">Application Error</h1>
          <p className="text-gray-600">Please check the console for details.</p>
        </div>
      </div>
    );
  }
}

export default App;