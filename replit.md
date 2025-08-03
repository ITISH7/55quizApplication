# Overview

This is a real-time quiz application built with React frontend and Express.js backend. The system allows administrators to create and manage live quizzes, while users can join and participate in real-time quiz sessions. The application features OTP-based authentication for secure access restricted to company emails, real-time WebSocket communication for live quiz interactions, and comprehensive quiz management with leaderboards and scoring systems.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool and development server.

**UI Framework**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling. The design system uses CSS variables for theming and follows a "new-york" style configuration.

**State Management**: TanStack Query (React Query) for server state management and caching. Local component state is managed with React hooks.

**Routing**: Wouter for client-side routing, providing a lightweight routing solution.

**Real-time Communication**: Custom WebSocket manager with automatic reconnection and event handling for live quiz features.

## Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js.

**Database ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations.

**Authentication**: OTP-based authentication system with email verification. Simple token-based sessions for maintaining user state.

**Real-time Features**: WebSocket server integrated with Express for live quiz functionality, including question reveals, answer submissions, and real-time leaderboards.

**File Processing**: Multer for handling Excel file uploads with XLSX library for parsing quiz data from spreadsheets.

## Data Storage

**Primary Database**: PostgreSQL configured through Drizzle ORM with the following core entities:
- Users (with admin roles and session tracking)
- Quizzes (with status management and settings)
- Questions (with multiple choice options and timing)
- Quiz Sessions (tracking user participation)
- Answers (with scoring and timing data)
- OTP Codes (for authentication)

**Schema Design**: Relational design with foreign key relationships. Uses UUIDs for primary keys and includes timestamp tracking for audit trails.

## Authentication & Authorization

**OTP System**: Email-based OTP authentication restricted to company domain (@fiftyfivetech.io). Six-digit codes with expiration and single-use validation.

**Role-based Access**: Two user roles - regular users and administrators. Middleware-based route protection for admin-only endpoints.

**Session Management**: Token-based authentication with user session tracking in the database.

## External Dependencies

**Database Services**: 
- Neon Database serverless PostgreSQL (@neondatabase/serverless)
- Drizzle ORM for database operations and migrations

**UI Components**:
- Radix UI primitives for accessible component foundation
- Tailwind CSS for utility-first styling
- Lucide React for consistent iconography

**File Processing**:
- XLSX library for Excel file parsing
- Multer for multipart form data handling

**Real-time Communication**:
- Native WebSocket API for client-side connections
- ws library for WebSocket server implementation

**Development Tools**:
- Vite for fast development and building
- TypeScript for type safety across the stack
- ESBuild for server bundling in production

**Email Services**: Configured for OTP delivery (implementation details in environment variables)

**Deployment**: 
- Replit-specific plugins for development environment
- Production build process with separate client and server bundles