import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import ProductGenerator from "@/pages/product-generator";
import DocumentPreviewPage from "@/pages/document-preview-page";
import PDFPreview from "@/pages/pdf-preview";
import PDFPreviewPage from "@/pages/pdf-preview-page";
import { DebugPanel } from "@/components/debug-panel";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ProductGenerator} />
      <Route path="/preview" component={() => <DocumentPreviewPage />} />
      <Route path="/pdf-preview" component={PDFPreview} />
      <Route path="/document-preview" component={() => <PDFPreviewPage />} />
      <Route path="/debug" component={() => <DebugPanel />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>}>
            <Router />
          </Suspense>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;