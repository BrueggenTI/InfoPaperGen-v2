# Product Information Generator - AI-Powered Document Creation

## Project Overview
An AI-powered web application that generates professional Product Information Papers using advanced image recognition and natural language processing technologies.

## Key Technologies
- React.js frontend with TypeScript
- Express.js backend
- OpenAI image recognition for nutrition extraction
- Zod validation
- Shadcn UI components
- Multilingual support
- Advanced ingredient parsing
- Environment variable management for API keys
- Localized document generation
- Dynamic preview with branding

## Recent Changes

### 2025-01-31 - Ingredient Translation Functionality
- **Added comprehensive ingredient translation system to support German-to-English translation and back**
- **New Features**:
  - Translation buttons for both Final Recipe and Base Recipe ingredients
  - Two-way translation: Original Language ↔ English
  - Real-time translation using OpenAI GPT-4o for accurate food industry terminology
  - Translation state management with originalName, translatedName, and language tracking
  - Updated ingredient schema to support translation metadata
- **UI Enhancements**:
  - "Translate to English" and "Back to Original" buttons in both ingredient sections
  - Loading states during translation with proper error handling
  - Toast notifications for successful translations and error feedback
  - Disabled state management to prevent conflicts during translation
- **Technical Implementation**:
  - New OpenAI translation service with food-specific prompts and terminology
  - Updated Ingredient interface to support translation fields
  - Enhanced API endpoint `/api/translate-ingredients` for translation requests
  - Document preview automatically displays translated ingredient names
  - Form state preservation with automatic text representation updates
- **Files Modified**:
  - `shared/schema.ts` - Extended ingredient schema with translation fields
  - `server/services/openai.ts` - Added translateIngredients function
  - `server/routes.ts` - Added translation API endpoint
  - `client/src/components/steps/ingredients-step.tsx` - Added translation UI and mutations
  - `client/src/components/document-preview.tsx` - Updated to display translated names
- **Language Support**: German ↔ English with specialized food industry terminology
- **User Workflow**: Extract ingredients → Translate to English → Edit if needed → Translate back to original
- **Result**: Complete bilingual ingredient management with professional food industry translation accuracy

### 2025-01-31 - Always Display Allergy Advice in Templates
- **Modified both document preview templates to always show Allergy Advice section**
- **Changes Made**:
  - Updated `client/src/components/document-preview.tsx` to always display Allergy Advice section (removed conditional rendering)
  - Updated `client/src/lib/pdf-generator.ts` to always include Allergy Advice in PDF exports
  - Allergy Advice now appears consistently under Storage Conditions with default fallback text
  - Default text: "Product contains allergen ingredients according to ingredient list and will be produced in an environment, where the following allergens are present: cereals containing gluten, milk products, nuts, peanuts, sesame seeds and soya products."
- **Template Consistency**: Both Live Preview and document-preview-page.tsx now consistently display Allergy Advice
- **Result**: Allergy Advice section is now always visible in both preview and PDF export, ensuring template completeness

### 2025-01-31 - Complete Layout Redesign and English Translation
- **Completely converted entire application from German to English language**
  - Translated all user interface text, error messages, button labels, form fields
  - Updated toast notifications, validation messages, and placeholder text
  - Translated navigation elements, step names, and section headers
  - Updated ingredient extraction messages and file upload prompts
  - All components now use English throughout: product-details-step, ingredients-step, nutrition-step, conditions-step
- **Implemented Brüggen corporate design matching their website (https://www.brueggen.com/de/karriere-bei-brueggen/)**
- **New Layout Structure**:
  - Removed side-by-side layout between form and Live Preview
  - Live Preview now appears below form sections, both taking full width
  - Added Document Status card showing completion status for each section
  - Improved visual hierarchy with proper spacing and typography
- **Design Updates**:
  - Applied Brüggen brand colors throughout the application
  - Updated all form steps to use consistent Brüggen styling (text-primary, text-muted-foreground)
  - Enhanced section divider with branded gradient styling
  - Improved button styling with btn-bruggen classes
- **User Experience Improvements**:
  - Better mobile responsiveness with full-width layout
  - Clearer visual feedback for form completion status
  - Professional document preview layout matching corporate standards
- **Files Modified**:
  - `client/src/pages/product-generator.tsx` - Redesigned layout structure
  - `client/src/components/steps/product-details-step.tsx` - English translation and styling
  - `client/src/components/steps/nutrition-step.tsx` - English translation and styling
  - `client/src/components/steps/conditions-step.tsx` - English translation and styling
  - `client/src/components/document-preview.tsx` - Layout restructuring and styling
  - `client/src/index.css` - Enhanced Brüggen brand styling
- **Result**: Complete visual and language transformation to match Brüggen corporate identity with improved user experience

### 2025-01-30 - Three-Card Layout for Conditions & Notes with Live Preview Integration
- **Reorganized Conditions & Notes into three separate cards with enhanced Live Preview**
- **Card Structure**:
  - "Storage Conditions" card: Product type selector and storage text generation
  - "Allergy Advice" card: Pre-filled allergen information text area
  - "Preparations" card: Preparation type selector and automatic instruction generation
- **Live Preview Integration**: All three sections (Storage Conditions, Allergy Advice, Preparation) now display in Live Preview document below nutrition information
- **Enhanced Features**:
  - Default allergy advice text pre-filled with standard allergen information
  - Preparation type selector (Porridge vs Other Product)
  - Automatic preparation instructions based on type selection
  - Porridge preparation: "1) Open the lid 2) Pour with 150 ml hot water and mix thoroughly 3) Wait for 3 minutes and it's ready"
  - Other Product preparation: "Dont Apply"
- **Files Modified**:
  - `client/src/components/steps/conditions-step.tsx` - Reorganized into three separate cards
  - `client/src/components/document-preview.tsx` - Added Allergy Advice and Preparation sections
- **Result**: Improved organization with clear three-card layout and complete Live Preview integration

### 2025-01-30 - Conditions & Notes Section Implementation
- **Added new "Conditions & Notes" step in form wizard**
- **Features Added**:
  - Product type selector with 21 predefined product categories
  - Automatic shelf life calculation based on product type (8-15 months)
  - Auto-generated storage conditions text template
  - Manual input fields for allergy advice and preparation instructions
  - Storage conditions display in Live Preview document
- **Product Types Supported**: Cornflakes, Muesli, Oat flakes, Rice flakes, Extruded products, Bars, Porridge, and more
- **Storage Text Template**: "{months}* months in original packaging unit at about 20°C and relative humidity below 60%. * To confirm on the storage test."
- **Files Created/Modified**:
  - `client/src/components/steps/conditions-step.tsx` - New step component
  - `shared/schema.ts` - Added productType and shelfLifeMonths fields
  - `client/src/pages/product-generator.tsx` - Added step 4 to wizard
  - `client/src/components/document-preview.tsx` - Added storage conditions display
- **Result**: Complete product conditions management with automatic storage text generation

### 2025-01-30 - Conditional Section Display and Footer Implementation
- **Implemented conditional display of sections in Live Preview**
- **Features Added**:
  - Nutrition table only shows when nutrition data exists
  - Nutri-Score only displays when nutrition data is available
  - Claims section only appears when nutrition data is present
  - Detailed ingredients table only shows when ingredients are provided
- **Added Footer Section**:
  - "Valid from" date (current date in DD/MM/YYYY format)
  - "Prepared by" section showing name and job title when available
  - Professional layout with proper spacing and typography
- **Files Modified**:
  - `client/src/components/document-preview.tsx` - Added conditional rendering and footer
- **Result**: Live Preview now only shows relevant sections and includes professional footer information

### 2025-01-30 - Updated Fruit/Vegetable/Legume Threshold Values
- **Updated Nutri-Score calculation with corrected fruit/veg/legume thresholds**
- **New Threshold Values**:
  - ≤40%: Score 0
  - >40%: Score 2  
  - >60%: Score 4
  - >80%: Score 6
- **Files Modified**:
  - `client/src/lib/nutri-score.ts` - Updated FRUIT_VEG_LEGUME_THRESHOLDS array
- **Result**: Nutri-Score calculation now uses accurate EU standard thresholds for fruit/vegetable/legume content

### 2025-01-30 - Manual Fruit/Vegetable/Legume Content Input
- **Added manual input field for fruit/vegetable/legume percentage**
- **Features Added**:
  - Dedicated input section in nutrition step for entering percentage (0-100%)
  - Real-time Nutri-Score calculation updates based on entered percentage
  - Proper form validation with error handling
  - Integration with shared schema and data storage
- **Files Modified**:
  - `shared/schema.ts` - Added fruitVegLegumeContent field to nutrition schema
  - `client/src/components/steps/nutrition-step.tsx` - Added input field and form context
  - `client/src/components/document-preview.tsx` - Fixed ingredients display array handling
- **Result**: Users can now manually enter fruit/veg/legume content for accurate Nutri-Score calculation

### 2025-01-30 - Consistent Table Design Implementation
- **Updated all tables to match nutrition table design pattern**
- **Changes Made**:
  - Moved titles from separate columns to headers above tables
  - Applied consistent formatting: title (h3) above, table content below
  - Updated Nutri-Score display, declarations, preparation, allergy advice, storage, and footer sections
  - Maintained table borders and styling while improving layout consistency
- **Files Modified**:
  - `client/src/components/document-preview.tsx` - Redesigned all table layouts
- **Result**: All document sections now follow the same clean design pattern with titles above tables

### 2025-01-30 - Comprehensive Nutri-Score Calculation System
- **Implemented complete Nutri-Score calculation based on EU standards**
- **Features Added**:
  - Malus scoring system for negative nutrients (energy, saturated fat, sugar, salt)
  - Bonus scoring system for positive nutrients (fiber, protein, fruit/veg/legume content)
  - Automatic grade calculation (A-E) with proper threshold values
  - Real-time visual display with color-coded grades
  - Integration in both nutrition step form and Live Preview document
- **Files Created/Modified**:
  - `client/src/lib/nutri-score.ts` - Core calculation engine with threshold tables
  - `client/src/components/steps/nutrition-step.tsx` - Added real-time Nutri-Score display
  - `client/src/components/document-preview.tsx` - Integrated calculated Nutri-Score in preview
- **Threshold Values**: Final score ranges: Min to 0 (A), 1-2 (B), 3-10 (C), 11-18 (D), 19+ (E)
- **Visual Integration**: Official EU Nutri-Score graphics automatically displayed based on calculated grade
- **Result**: Automatic Nutri-Score calculation and display throughout the application

### 2025-01-30 - Table Header Alignment Fix
- **Fixed nutrition table column header alignment issues**
- **Problem**: Table headers were misaligned - "per 100g" and "per serving size" columns were offset
- **Solution**: Added empty header cell in first column to properly align with data rows
- **Files Modified**:
  - `client/src/components/steps/nutrition-step.tsx` - Fixed interactive nutrition form table
  - `client/src/components/document-preview.tsx` - Fixed Live Preview nutrition table
  - `client/src/pages/document-preview-page.tsx` - Fixed TypeScript errors
- **Result**: Both nutrition input form and Live Preview now have properly aligned column headers

### Architecture
- Frontend: React with Wouter routing, TanStack Query for state management
- Backend: Express.js with in-memory storage interface
- UI: Shadcn components with Tailwind CSS
- Validation: Zod schemas for type safety
- File uploads: Multer with image processing via OpenAI

## User Preferences
- German language interface for nutrition-related features
- Professional document formatting with company branding
- Responsive design for various screen sizes
- Real-time preview functionality

## Development Guidelines
- Follow fullstack_js architecture patterns
- Use shared schema types between frontend/backend
- Implement proper error handling and validation
- Maintain consistent table structures across components