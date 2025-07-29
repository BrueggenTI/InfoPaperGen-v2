# Product Information Generator Application

## Overview

This is a full-stack web application built for generating product information documents. The application provides a multi-step form interface where users can input product details, upload images, extract ingredients and nutrition information using AI, and generate PDF documents. The system uses a modern React frontend with a Node.js/Express backend and includes AI-powered image analysis capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Framework**: Radix UI components with Tailwind CSS styling
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ESM modules
- **API Design**: RESTful API endpoints
- **File Handling**: Multer for multipart form data processing
- **Development**: Hot module replacement via Vite middleware

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Connection**: Neon Database serverless PostgreSQL
- **Schema Management**: Drizzle Kit for migrations
- **Development Storage**: In-memory storage fallback for development

## Key Components

### Multi-Step Form System
The application implements a 5-step wizard for product information entry:
1. **Product Details**: Basic product information (name, number, prepared by, job title)
2. **Image Upload**: Product, ingredient, and nutrition label images
3. **Ingredients**: Dual ingredient system with Base Product and Final Product ingredients
4. **Nutrition**: Nutritional information per 100g and per serving
5. **Review**: Final review and document generation

### Ingredient Management System
The application supports a sophisticated ingredient management system that distinguishes between:
- **Final Product Ingredients**: Complete ingredient list for the finished product
- **Base Product Ingredients**: Component ingredients that are included within the final product
This allows for accurate SAP screenshot processing where base products are components used in final products.

### AI Integration
- **OpenAI GPT-4o**: Used for extracting ingredient and nutrition data from uploaded SAP screenshots
- **SAP Screenshot Analysis**: Intelligently processes both Base Product and Final Product screenshots
- **Context-Aware Extraction**: AI understands the relationship between base products and final products
- **Error Handling**: Graceful fallback to manual entry if AI extraction fails

### PDF Generation
- **Library**: jsPDF for client-side PDF generation
- **Features**: Formatted product information documents with calculated serving sizes
- **Export**: Direct download functionality from the browser

### Session Management
- **Stateful Sessions**: Product information sessions stored in database
- **CRUD Operations**: Create, read, update, and delete session data
- **Auto-save**: Form data persisted as users progress through steps

## Data Flow

1. **Session Creation**: New product information session created on form start
2. **Step Navigation**: Form data updated in real-time as users complete each step
3. **Image Processing**: Uploaded images sent to OpenAI API for data extraction
4. **Data Persistence**: All form data automatically saved to session storage
5. **Document Generation**: PDF created client-side using accumulated form data

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm & drizzle-kit**: Database ORM and migration tools
- **openai**: AI-powered image analysis
- **multer**: File upload handling
- **jspdf**: PDF document generation

### UI Dependencies
- **@radix-ui/***: Accessible UI component primitives
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form handling and validation
- **tailwindcss**: Utility-first CSS framework
- **zod**: Runtime type validation

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type safety
- **tsx**: TypeScript execution for Node.js

## Deployment Strategy

### Development Environment
- **Dev Server**: Vite dev server with HMR for frontend
- **Backend**: Express server with TSX for TypeScript execution
- **Database**: PostgreSQL via environment variable configuration
- **Hot Reload**: Full-stack hot reloading via Vite middleware integration

### Production Build
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Static Serving**: Express serves built frontend assets in production
- **Database**: Production PostgreSQL connection via DATABASE_URL

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string
- **OPENAI_API_KEY**: Required for AI image analysis features
- **NODE_ENV**: Determines development vs production behavior

The application follows a monorepo structure with shared TypeScript types and schemas, enabling type safety across the full stack while maintaining clear separation between client and server code.