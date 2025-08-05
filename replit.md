# Overview

Live Quiz Showdown is a comprehensive real-time quiz platform designed for corporate team events at FiftyFive Technologies. The system provides secure OTP-based authentication, dual question creation methods (manual and Excel upload), live quiz management with admin controls, real-time participant interaction via WebSocket, and persistent data storage using MongoDB Atlas.

## Recent Updates (August 2025)

### Completed Features
- ✅ **Full MongoDB Integration**: Migrated from in-memory to persistent MongoDB Atlas storage
- ✅ **Manual Question Creation**: Working question entry with proper database persistence  
- ✅ **Excel Question Upload**: Complete Excel file processing and question extraction
- ✅ **Live Quiz Controls**: Reveal, end, skip question functionality for admins
- ✅ **Authentication System**: OTP-based login with @fiftyfivetech.io domain restriction
- ✅ **Real-time Updates**: WebSocket integration for live quiz experience
- ✅ **Admin Dashboard**: Complete quiz management interface with leaderboard preview
- ✅ **User Dashboard**: Participant interface with quiz joining
- ✅ **Admin Quiz Start**: Fixed authentication token issues, now working perfectly
- ✅ **Live Leaderboard Panel**: Added visual leaderboard with sample data in admin dashboard
- ✅ **Comprehensive Documentation**: Full project documentation and deployment guides
- ✅ **Dynamic Position-Based Scoring**: Admins can configure custom points for 1st, 2nd, 3rd place answers
- ✅ **Enhanced Quiz Configuration**: Speed scoring with customizable position points (first correct answer gets most points)

### Latest Fixes (August 5, 2025)
- ✅ **Authentication Token Fix**: Resolved 401 errors in admin start quiz functionality
- ✅ **MongoDB Schema Updates**: Added missing fields (score, currentQuestionNumber, startedAt, etc.)
- ✅ **Leaderboard Integration**: Added live leaderboard panel with trophy/medal rankings
- ✅ **User Join Quiz Fix**: Fixed 401 authentication errors for candidates joining quizzes
- ✅ **Position-Based Scoring System**: Implemented configurable position-based points (1st, 2nd, 3rd place) for speed quizzes

### Architecture Status
- **Database**: MongoDB Atlas fully integrated and operational
- **API Endpoints**: All CRUD operations working with proper authentication
- **Real-time Features**: WebSocket communication established
- **File Processing**: Excel upload and parsing functional
- **Security**: Domain-restricted OTP authentication implemented
- **Admin Controls**: Quiz start/stop functionality fully operational

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