// Browser-based PDF generator using Puppeteer backend
export async function generateBrowserPDF(sessionId: string): Promise<void> {
  try {
    // Get the current URL for the preview page
    const currentUrl = window.location.origin;
    const previewUrl = `${currentUrl}/pdf-preview?session=${sessionId}`;
    
    // Call the backend API to generate PDF using Puppeteer
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: previewUrl,
        sessionId: sessionId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    // Convert response to blob and trigger download
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element for download
    const link = document.createElement('a');
    link.href = url;
    link.download = `product-info-${sessionId}.pdf`;
    
    // Trigger the download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${(error as Error).message}`);
  }
}