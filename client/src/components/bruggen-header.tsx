import logoPath from "@assets/Brueggen LOGO NEW-RGB_1753871769341.png";

export default function BruggenHeader() {
  return (
    <header className="hero-bruggen py-8 px-4 mb-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img 
              src={logoPath} 
              alt="Brüggen Logo" 
              className="h-12 w-auto"
            />
            <div className="text-white">
              <h1 className="text-2xl font-bold text-white">Product Information Generator</h1>
              <p className="text-white/90 text-sm">AI-Powered Document Creation</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-6 text-white/90 text-sm">
            <span>Professional Documentation</span>
            <span>•</span>
            <span>Nutrition Analysis</span>
            <span>•</span>
            <span>PDF Export</span>
          </div>
        </div>
      </div>
    </header>
  );
}