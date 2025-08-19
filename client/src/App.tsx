import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import ProductGenerator from "@/pages/product-generator";
import DocumentPreviewPage from "@/pages/document-preview-page";
import PDFPreview from "@/pages/pdf-preview";
import PDFPreviewPage from "@/pages/pdf-preview-page";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ProductGenerator} />
      <Route path="/preview" component={() => <DocumentPreviewPage />} />
      <Route path="/pdf-preview" component={PDFPreview} />
      <Route path="/document-preview" component={() => <PDFPreviewPage />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;