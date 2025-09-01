import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProductInfo } from "@shared/schema";
import DocumentPreview from "@/components/document-preview";

export default function PDFPreview() {
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get('session');
    if (urlSessionId) {
      setSessionId(urlSessionId);
    }
  }, []);

  // Fetch session data
  const { data: formData, isLoading } = useQuery({
    queryKey: ['/api/product-info/sessions', sessionId],
    enabled: !!sessionId,
  });

  if (isLoading || !formData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        /* PDF-specific styles */
        body { 
          margin: 0; 
          padding: 0; 
          background: white !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        /* Hide scroll bars */
        ::-webkit-scrollbar { display: none; }
        html { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Ensure all images and backgrounds print */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        /* Page breaks */
        .page-break {
          page-break-before: always;
        }
        
        /* Ensure fonts load properly */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      `}</style>
      
      <DocumentPreview formData={formData as ProductInfo} sessionId={sessionId} />
    </div>
  );
}