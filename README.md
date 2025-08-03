# Live Quiz Showdown

A real-time quiz platform designed for corporate team events at FiftyFive Technologies. Features OTP-based authentication, live quiz management, real-time leaderboards, and comprehensive admin controls.

## 🚀 Features

### Authentication & Security
- **OTP-based Authentication**: Secure login using email OTPs
- **Domain Restriction**: Limited to @fiftyfivetech.io email addresses
- **Role-based Access**: Admin and regular user roles
- **Session Management**: Token-based authentication with MongoDB persistence

### Quiz Management
- **Dual Question Creation**: Manual question entry or Excel file upload
- **Real-time Quiz Control**: Live admin panel for question management
- **Multiple Quiz Types**: Standard, speed-based, and negative scoring
- **Flexible Timing**: Custom time limits per question
- **Bonus Questions**: Special high-value questions

### Live Quiz Experience
- **Real-time Updates**: WebSocket-powered live updates
- **Interactive Participation**: Users join with passkeys
- **Live Leaderboards**: Real-time scoring and rankings
- **Timer Integration**: Visual countdown timers
- **Responsive Design**: Works on desktop and mobile devices

### Admin Controls
- **Quiz Creation**: Build quizzes manually or via Excel upload
- **Live Management**: Reveal, end, and skip questions in real-time
- **Participant Monitoring**: Track active participants and responses
- **Results Analytics**: View detailed quiz results and statistics

## 🏗️ Architecture

### Frontend (React + TypeScript)
```
client/
├── src/
│   ├── components/         # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and configurations
│   ├── pages/             # Application pages/routes
│   └── index.css          # Global styles
```

**Key Technologies:**
- **React 18**: Modern React with hooks
- **TypeScript**: Full type safety
- **Vite**: Fast development and building
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: High-quality component library
- **TanStack Query**: Server state management
- **Wouter**: Lightweight routing
- **WebSocket**: Real-time communication

### Backend (Node.js + Express)
```
server/
├── index.ts              # Application entry point
├── routes.ts             # API routes and middleware
├── mongo-storage.ts      # MongoDB data layer
├── database.ts           # Database configuration
└── vite.ts              # Development server setup
```

**Key Technologies:**
- **Express.js**: Web framework
- **TypeScript**: Type-safe server code
- **MongoDB**: Document database with Mongoose
- **WebSocket (ws)**: Real-time communication
- **Multer**: File upload handling
- **XLSX**: Excel file processing

### Database (MongoDB Atlas)
```
Collections:
├── users                 # User accounts and admin roles
├── quizzes              # Quiz metadata and settings
├── questions            # Quiz questions and options
├── quizsessions         # User participation sessions
├── answers              # User responses and scoring
└── otps                 # Authentication codes
```

**Schema Features:**
- **Relational Design**: Foreign key relationships
- **UUID Primary Keys**: Unique identifiers
- **Timestamp Tracking**: Audit trails
- **Flexible Scoring**: Multiple scoring algorithms

## 📊 Data Flow

1. **Authentication**: User requests OTP → Email verification → Token generation
2. **Quiz Creation**: Admin uploads Excel/enters manually → Questions saved to MongoDB
3. **Quiz Participation**: Users join with passkey → Real-time session tracking
4. **Live Management**: Admin controls via WebSocket → Real-time updates to participants
5. **Results**: Answers stored → Leaderboard calculated → Results displayed

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account
- FiftyFive Technologies email access

### Installation
```bash
# Clone repository
git clone <repository-url>
cd live-quiz-showdown

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your MongoDB connection string

# Start development server
npm run dev
```

### Environment Variables
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
NODE_ENV=development
```

## 🚀 Deployment Guide

### Vercel Deployment

#### Prerequisites
- Vercel account
- GitHub repository
- MongoDB Atlas database

#### Step 1: Prepare for Deployment
1. **Update build configuration** in `package.json`:
```json
{
  "scripts": {
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "tsc server/index.ts --outDir dist --target es2020 --module commonjs",
    "start": "node dist/index.js"
  }
}
```

2. **Create `vercel.json`**:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    },
    {
      "src": "client/dist/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/dist/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/client/dist/$1"
    }
  ],
  "env": {
    "MONGODB_URI": "@mongodb_uri"
  }
}
```

#### Step 2: Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables
vercel env add MONGODB_URI production
# Enter your MongoDB connection string

# Deploy to production
vercel --prod
```

### Railway Deployment

#### Step 1: Prepare Railway
1. Create account at [railway.app](https://railway.app)
2. Install Railway CLI:
```bash
npm install -g @railway/cli
```

#### Step 2: Deploy
```bash
# Login to Railway
railway login

# Initialize project
railway init

# Add MongoDB service
railway add mongodb

# Deploy
railway up

# Set environment variables
railway variables set MONGODB_URI="your-connection-string"
```

### DigitalOcean App Platform

#### Step 1: Create App Spec
Create `.do/app.yaml`:
```yaml
name: live-quiz-showdown
services:
- name: api
  source_dir: /
  github:
    repo: your-username/live-quiz-showdown
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: MONGODB_URI
    value: your-mongodb-connection-string
    type: SECRET
```

#### Step 2: Deploy
1. Connect GitHub repository
2. Configure environment variables
3. Deploy from DigitalOcean dashboard

### Heroku Deployment

#### Step 1: Prepare Heroku
```bash
# Install Heroku CLI
# Create Procfile
echo "web: npm start" > Procfile

# Add MongoDB addon
heroku addons:create mongolab:sandbox
```

#### Step 2: Deploy
```bash
# Login and create app
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set MONGODB_URI="your-connection-string"

# Deploy
git push heroku main
```

### Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 5000

# Start application
CMD ["npm", "start"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
      - NODE_ENV=production
    restart: unless-stopped
```

## 📱 Usage Guide

### For Administrators

#### Creating a Quiz
1. **Login** with admin credentials (@fiftyfivetech.io email)
2. **Navigate** to Admin Dashboard
3. **Choose creation method**:
   - **Manual**: Click "Add Manual Questions" and fill form
   - **Excel**: Download template, fill data, upload file
4. **Configure quiz settings**:
   - Title and passkey
   - Default time per question
   - Scoring type (standard/speed/negative)
5. **Start quiz** when ready

#### Managing Live Quiz
1. **Start Quiz** from admin dashboard
2. **Control questions**:
   - Reveal Question: Show question to participants
   - End Question: Stop current question timer
   - Skip Question: Jump to next question
   - Next Question: Manual navigation
3. **Monitor participants**: Track active users and responses
4. **View leaderboard**: Real-time scoring updates
5. **End Quiz**: Terminate and show final results

### For Participants

#### Joining a Quiz
1. **Login** with company email (@fiftyfivetech.io)
2. **Enter passkey** provided by admin
3. **Wait for questions** to be revealed
4. **Submit answers** within time limit
5. **View results** on leaderboard

## 🔧 API Reference

### Authentication Endpoints
```typescript
POST /api/auth/send-otp
POST /api/auth/verify-otp
GET /api/auth/me
```

### Quiz Management
```typescript
GET /api/quizzes                    // List all quizzes
POST /api/quizzes                   // Create new quiz
GET /api/quizzes/:id                // Get quiz details
POST /api/quizzes/:id/start         // Start quiz (admin)
POST /api/quizzes/:id/end           // End quiz (admin)
POST /api/quizzes/:id/join          // Join quiz
```

### Question Control
```typescript
POST /api/quizzes/:id/questions/:qid/reveal  // Reveal question
POST /api/quizzes/:id/questions/:qid/end     // End question
POST /api/quizzes/:id/skip                   // Skip question
```

### Real-time Features
```typescript
WebSocket /ws                       // Real-time communication
Events: quiz_started, question_revealed, question_ended, answer_submitted
```

## 🧪 Testing

### Manual Testing
1. **Authentication**: Test OTP flow with @fiftyfivetech.io emails
2. **Quiz Creation**: Create quizzes with both manual and Excel methods
3. **Live Quiz**: Test full admin-participant workflow
4. **Real-time Features**: Verify WebSocket updates
5. **Cross-device**: Test on multiple devices simultaneously

### Excel Template Format
```csv
Question,Option A,Option B,Option C,Option D,Correct Answer,Is Bonus,Time Limit (seconds)
What is 2+2?,1,2,3,4,Option D,No,30
Bonus: Company founded?,2020,2021,2022,2023,Option B,Yes,60
```

## 🛡️ Security Features

- **Domain Restriction**: Only @fiftyfivetech.io emails allowed
- **OTP Verification**: Secure email-based authentication
- **Session Management**: Token-based with expiration
- **Input Validation**: All API inputs validated with Zod
- **CORS Protection**: Configured for production domains
- **Data Sanitization**: MongoDB injection prevention

## 📈 Performance Optimizations

- **Real-time Updates**: Efficient WebSocket communication
- **Database Indexing**: Optimized MongoDB queries
- **Caching**: TanStack Query for client-side caching
- **Lazy Loading**: Code splitting with dynamic imports
- **Asset Optimization**: Vite build optimizations

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is proprietary to FiftyFive Technologies.

## 📞 Support

For technical support or feature requests, contact the development team.

---

**Built with ❤️ for FiftyFive Technologies team events**