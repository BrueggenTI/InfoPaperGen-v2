# Product Information Generator - AI-Powered Document Creation

### Overview
An AI-powered web application that generates professional Product Information Papers. Its core purpose is to streamline the creation of detailed product documentation by leveraging advanced AI for tasks like image recognition, natural language processing, and multilingual support. This tool aims to automate and standardize the generation of comprehensive product information, enhancing efficiency and ensuring brand consistency, with a vision to enhance product data management and ensure brand consistency across various markets.

### User Preferences
- German language interface for nutrition-related features
- Professional document formatting with company branding
- Responsive design for various screen sizes
- Real-time preview functionality
- **PDF Generation Requirement**: Pixel-perfect PDF output matching live preview exactly, including images, CSS layouts (Flexbox/Grid), and fonts

### System Architecture
The application is built as a full-stack JavaScript application following a clear separation of concerns.

- **UI/UX Decisions**:
    - Frontend developed with React.js using TypeScript, Wouter for routing, and TanStack Query for state management.
    - UI components are built using Shadcn UI, styled with Tailwind CSS, incorporating the Brüggen corporate identity with specific brand colors and layout structures.
    - Redesigned for full-width sections with Live Preview below form sections, complemented by a Document Status card.
    - Consistent table design across all sections with titles above content, professional footer with "Valid from" date and "Prepared by" information.
    - Minimalistic, professional PDF design overhaul with exact 3mm margins, centered header, and optimized icon-text alignment.
    - Allergy Advice and Ingredients warnings show only colored left borders without background colors.
    - "Possible Declarations" section displays only green highlighted claims (Fiber and Protein sources).

- **Technical Implementations**:
    - **Frontend**: React.js, TypeScript, Wouter, TanStack Query, Shadcn UI, Tailwind CSS.
    - **Backend**: Express.js with an in-memory storage interface.
    - **Data Validation**: Zod schemas used extensively for type safety and robust data validation.
    - **Image Recognition**: Utilizes OpenAI for extracting nutrition information from images.
    - **Ingredient Management**: Comprehensive handling of ingredient screenshots with removal, replacement, and two-way translation (e.g., German ↔ English) using OpenAI GPT-4o for food-specific terminology.
    - **Document Generation**: Generates localized documents with dynamic preview capabilities and server-side PDF generation via Puppeteer.
    - **Nutri-Score Calculation**: Implements a complete Nutri-Score calculation system based on EU standards, including malus and bonus scoring for nutrients, and displays real-time, color-coded grades. Supports manual input for fruit/vegetable/legume content.
    - **Conditional Display**: Live Preview intelligently displays sections (e.g., nutrition table, Nutri-Score, claims, ingredients table) only when relevant data exists.
    - **Conditions & Notes**: Features a dedicated section for product type selection, automatic shelf-life calculation, and generation of storage conditions, allergy advice, and preparation instructions based on product type.
    - **Environment Management**: Robust environment variable management for sensitive data like API keys.
    - **Performance Optimizations**: Implemented useMemo and useCallback hooks, optimized TanStack Query, HTTP caching headers, optimized Express middleware, and reduced Puppeteer wait times. Production build optimized for size and performance.
    - **Deployment Readiness**: Production-ready Docker containerization with multi-stage build, complete Google Chrome installation for Puppeteer compatibility, security best practices, and Azure App Service readiness. Comprehensive error handling and robust API validation implemented for production environments. Docker configuration fixed for "Could not find Chrome" errors. **ULTIMATE AZURE CHROME FIX**: Created `Dockerfile.azure-fixed` with triple-redundancy Chrome installation, extended Puppeteer configuration with definitive browser path detection, and comprehensive deployment scripts for 100% reliable Azure PDF generation.

### External Dependencies
- **OpenAI**: Used for advanced image recognition (nutrition extraction) and sophisticated natural language processing for ingredient translation.
- **Shadcn UI**: Provides a set of pre-built, accessible, and customizable UI components for the frontend.
- **Tailwind CSS**: A utility-first CSS framework used for styling and responsive design.
- **Multer**: Node.js middleware for handling `multipart/form-data`, primarily used for file uploads.
- **Puppeteer**: Used for server-side, pixel-perfect PDF generation.