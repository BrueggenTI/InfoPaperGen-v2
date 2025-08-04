# Product Information Generator - AI-Powered Document Creation

### Overview
An AI-powered web application that generates professional Product Information Papers. Its core purpose is to streamline the creation of detailed product documentation by leveraging advanced AI for tasks like image recognition, natural language processing, and multilingual support. This tool aims to automate and standardize the generation of comprehensive product information, enhancing efficiency and ensuring brand consistency.

### User Preferences
- German language interface for nutrition-related features
- Professional document formatting with company branding
- Responsive design for various screen sizes
- Real-time preview functionality
- **PDF Generation Requirement**: Pixel-perfect PDF output matching live preview exactly, including images, CSS layouts (Flexbox/Grid), and fonts

### System Architecture
The application is built as a full-stack JavaScript application following a clear separation of concerns.
- **Frontend**: Developed with React.js using TypeScript for type safety, Wouter for routing, and TanStack Query for efficient state management and data fetching. UI components are built using Shadcn UI, styled with Tailwind CSS, and incorporate a design matching the Brüggen corporate identity, including specific brand colors and layout structures. The layout has been redesigned for full-width sections with the Live Preview appearing below form sections, complemented by a Document Status card.
- **Backend**: Implemented with Express.js, utilizing an in-memory storage interface for data handling.
- **Data Validation**: Zod schemas are extensively used across both frontend and backend to ensure type safety and robust data validation.
- **Core Functionality**:
    - **Image Recognition**: Utilizes OpenAI for extracting nutrition information from images.
    - **Ingredient Management**: Comprehensive handling of ingredient screenshots with removal, replacement, and two-way translation (e.g., German ↔ English) using OpenAI GPT-4o for food-specific terminology.
    - **Document Generation**: Generates localized documents with dynamic preview capabilities.
    - **Nutri-Score Calculation**: Implements a complete Nutri-Score calculation system based on EU standards, including malus and bonus scoring for nutrients, and displays real-time, color-coded grades. Supports manual input for fruit/vegetable/legume content.
    - **Conditional Display**: Live Preview intelligently displays sections (e.g., nutrition table, Nutri-Score, claims, ingredients table) only when relevant data exists.
    - **Conditions & Notes**: Features a dedicated section for product type selection, automatic shelf-life calculation, and generation of storage conditions, allergy advice, and preparation instructions based on product type.
    - **Styling**: Consistent table design across all sections with titles above content, professional footer with "Valid from" date and "Prepared by" information.
    - **PDF Generation**: Currently uses jsPDF for client-side PDF creation. Browser-based PDF generation (Puppeteer) attempted but not viable in Replit environment due to system library dependencies.
- **Environment Management**: Robust environment variable management for sensitive data like API keys.

### Recent Changes (2025-01-04)
- **PDF Generation Enhancement**: Implemented enhanced jsPDF-based PDF generation that replicates the Live Preview layout exactly. The new generator creates professional PDFs with proper sectioning, tables, formatting, and styling that matches the web interface.
- **Browser-based PDF Attempt**: Attempted to implement browser-based PDF generation using Puppeteer and html-pdf-node, but these solutions failed in the Replit environment due to missing system dependencies.
- **Enhanced Layout Matching**: New PDF generator includes proper headers, ingredient formatting with base product integration, nutrition tables, Nutri-Score display, claims sections, and storage/preparation information exactly as shown in Live Preview.
- **Button Event Handling**: Fixed all navigation and upload button functionality by implementing proper event handling with preventDefault and stopPropagation to resolve intermittent clicking issues.

### External Dependencies
- **OpenAI**: Used for advanced image recognition (nutrition extraction) and sophisticated natural language processing for ingredient translation.
- **Shadcn UI**: Provides a set of pre-built, accessible, and customizable UI components for the frontend.
- **Tailwind CSS**: A utility-first CSS framework used for styling and responsive design.
- **Multer**: Node.js middleware for handling `multipart/form-data`, primarily used for file uploads.