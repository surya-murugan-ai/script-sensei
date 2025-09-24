# Overview

MedExtract AI is a full-stack prescription analysis system that uses multiple AI models to extract structured data from handwritten prescription images. The application allows users to upload prescription images, configure extraction parameters, and compare results from different AI providers (OpenAI GPT-4V, Claude 3.5 Sonnet, and Gemini Pro Vision) to ensure accuracy through model consensus.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **File Uploads**: React Dropzone for drag-and-drop file handling

## Backend Architecture
- **Runtime**: Node.js with Express.js REST API
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **File Processing**: Multer for multipart file uploads with Sharp for image processing
- **Storage Strategy**: In-memory storage implementation with interface for database migration

## Data Models
The system uses three core entities:
- **Prescriptions**: Stores uploaded file metadata and processing status
- **Extraction Results**: Individual field extractions from each AI model
- **Extraction Configs**: User-defined configurations for models and prompts

## AI Integration Strategy
- **Multi-Model Approach**: Parallel processing with OpenAI GPT-4V, Anthropic Claude, and Google Gemini
- **Structured Extraction**: Predefined schema for patient details, medications, vitals, investigations, doctor details, and follow-up instructions
- **Confidence Scoring**: Each model provides confidence metrics for result validation
- **Custom Prompts**: Configurable prompts for different extraction fields

## Processing Pipeline
1. **File Upload**: Images validated and stored with unique identifiers
2. **Queue Management**: Processing status tracking (queued → processing → completed/failed)
3. **Parallel AI Calls**: Simultaneous requests to all configured AI models
4. **Result Aggregation**: Comparison and consensus building across model outputs
5. **Data Export**: CSV/JSON export functionality for processed results

## Authentication & Security
- **File Validation**: MIME type checking and size limits for uploads
- **Error Handling**: Comprehensive error boundaries and API error responses
- **Environment Configuration**: Secure API key management through environment variables

# External Dependencies

## AI Service Providers
- **OpenAI API**: GPT-4V for vision-based text extraction
- **Anthropic API**: Claude models for natural language processing
- **Google Generative AI**: Gemini Pro Vision for image analysis

## Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting (configured but using memory storage currently)
- **Drizzle Kit**: Database migrations and schema management

## Development Tools
- **Replit Integration**: Development environment plugins for cartographer and dev banner
- **TypeScript**: Full type safety across frontend and backend
- **ESBuild**: Production bundling for server-side code

## UI & Styling Dependencies
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library
- **React Hook Form**: Form validation with Zod schema validation