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
- **Threshold Values**: Final score thresholds: ≤-15 (A), ≤1 (B), ≤3 (C), ≤11 (D), >11 (E)
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