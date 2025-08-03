# Live Quiz Showdown - Deployment Guide

Complete deployment instructions for various hosting platforms.

## 🎯 Quick Deploy Options

| Platform | Difficulty | Cost | Best For |
|----------|------------|------|----------|
| Vercel | Easy | Free/Paid | Frontend-focused, automatic deployments |
| Railway | Easy | Free/Paid | Full-stack apps, simple setup |
| DigitalOcean | Medium | Paid | Production apps, more control |
| Heroku | Medium | Free/Paid | Traditional deployments |
| AWS | Hard | Pay-as-use | Enterprise, maximum control |

## 🚀 Vercel Deployment (Recommended)

### Why Vercel?
- ✅ Excellent for React/Next.js apps
- ✅ Automatic deployments from Git
- ✅ Built-in CDN and edge functions
- ✅ Free tier available
- ✅ Easy environment variable management

### Step-by-Step Deployment

#### 1. Prepare Your Project

Create `vercel.json` in root directory:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/index.ts",
      "use": "@vercel/node",
      "config": {
        "includeFiles": ["server/**"]
      }
    },
    {
      "src": "client/dist/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/index.ts"
    },
    {
      "src": "/ws",
      "dest": "/server/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/client/dist/$1"
    }
  ],
  "env": {
    "MONGODB_URI": "@mongodb_uri",
    "NODE_ENV": "production"
  },
  "functions": {
    "server/index.ts": {
      "maxDuration": 30
    }
  }
}
```

Update `package.json` scripts:
```json
{
  "scripts": {
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "tsc server/index.ts --outDir dist/server --target es2020 --module commonjs --esModuleInterop true --allowSyntheticDefaultImports true",
    "start": "node dist/server/index.js",
    "dev": "npm run dev:original"
  }
}
```

#### 2. Deploy via Vercel Dashboard

1. **Sign up/Login** at [vercel.com](https://vercel.com)
2. **Import Project** from GitHub
3. **Configure Project**:
   - Framework Preset: Other
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: `client/dist`
4. **Add Environment Variables**:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `NODE_ENV`: production

#### 3. Deploy via CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set production environment variables
vercel env add MONGODB_URI production
# Paste your MongoDB connection string

# Deploy to production
vercel --prod
```

#### 4. Custom Domain (Optional)
```bash
# Add custom domain
vercel domains add yourdomain.com
vercel alias yourapp.vercel.app yourdomain.com
```

## 🚂 Railway Deployment

### Why Railway?
- ✅ Simple full-stack deployments
- ✅ Built-in database options
- ✅ Automatic HTTPS
- ✅ Simple pricing
- ✅ Git-based deployments

### Deployment Steps

#### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

#### 2. Prepare Project
Create `railway.json`:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health"
  }
}
```

Add health check endpoint in `server/routes.ts`:
```typescript
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
```

#### 3. Deploy
```bash
# Login to Railway
railway login

# Initialize project
railway init

# Add MongoDB database (optional - use your existing Atlas)
railway add mongodb

# Set environment variables
railway variables set MONGODB_URI="your-mongodb-connection-string"
railway variables set NODE_ENV="production"

# Deploy
railway up
```

#### 4. Custom Domain
```bash
# Add custom domain
railway domain add yourdomain.com
```

## 🌊 DigitalOcean App Platform

### Why DigitalOcean?
- ✅ Predictable pricing
- ✅ Good performance
- ✅ Professional hosting
- ✅ Integrated with DO ecosystem

### Deployment Steps

#### 1. Create App Specification
Create `.do/app.yaml`:
```yaml
name: live-quiz-showdown
services:
- name: web
  source_dir: /
  github:
    repo: your-username/live-quiz-showdown
    branch: main
    deploy_on_push: true
  build_command: npm run build
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  http_port: 5000
  routes:
  - path: /
  envs:
  - key: MONGODB_URI
    value: your-mongodb-connection-string
    type: SECRET
  - key: NODE_ENV
    value: production
    type: GENERAL_PURPOSE
```

#### 2. Deploy via Dashboard
1. **Create Account** at [digitalocean.com](https://digitalocean.com)
2. **Go to App Platform**
3. **Create App** from GitHub repository
4. **Configure**:
   - Source: GitHub repository
   - Branch: main
   - Auto-deploy: enabled
5. **Set Environment Variables**
6. **Deploy**

#### 3. Deploy via CLI
```bash
# Install doctl
curl -sL https://github.com/digitalocean/doctl/releases/download/v1.78.0/doctl-1.78.0-linux-amd64.tar.gz | tar -xzv
sudo mv doctl /usr/local/bin

# Authenticate
doctl auth init

# Create app
doctl apps create --spec .do/app.yaml
```

## 🟣 Heroku Deployment

### Why Heroku?
- ✅ Traditional platform
- ✅ Many add-ons
- ✅ Good documentation
- ✅ Free tier (with limitations)

### Deployment Steps

#### 1. Prepare Project
Create `Procfile`:
```
web: npm start
```

Create `heroku-postbuild` script in package.json:
```json
{
  "scripts": {
    "heroku-postbuild": "npm run build"
  }
}
```

#### 2. Deploy
```bash
# Install Heroku CLI
# Visit: https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create your-quiz-app

# Set environment variables
heroku config:set MONGODB_URI="your-mongodb-connection-string"
heroku config:set NODE_ENV="production"

# Deploy
git push heroku main

# Open app
heroku open
```

#### 3. Scale and Monitor
```bash
# Scale web dynos
heroku ps:scale web=1

# View logs
heroku logs --tail

# Monitor app
heroku ps
```

## ☁️ AWS Deployment

### Why AWS?
- ✅ Maximum control and scalability
- ✅ Enterprise-grade infrastructure
- ✅ Comprehensive services
- ❌ More complex setup

### Deployment Options

#### Option 1: AWS Elastic Beanstalk

1. **Prepare deployment package**:
```bash
# Create deployment zip
zip -r quiz-app.zip . -x "node_modules/*" ".git/*"
```

2. **Deploy via Console**:
   - Create Elastic Beanstalk application
   - Upload zip file
   - Configure environment variables
   - Deploy

#### Option 2: AWS ECS with Docker

Create `Dockerfile`:
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

Deploy to ECS:
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-east-1.amazonaws.com

docker build -t live-quiz-showdown .
docker tag live-quiz-showdown:latest your-account.dkr.ecr.us-east-1.amazonaws.com/live-quiz-showdown:latest
docker push your-account.dkr.ecr.us-east-1.amazonaws.com/live-quiz-showdown:latest
```

## 🐳 Docker Deployment

### For Self-Hosting

#### 1. Create Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start application
CMD ["npm", "start"]
```

#### 2. Create docker-compose.yml
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
    depends_on:
      - mongodb
    networks:
      - quiz-network

  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped
    networks:
      - quiz-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - quiz-network

volumes:
  mongodb_data:

networks:
  quiz-network:
    driver: bridge
```

#### 3. Deploy
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Scale application
docker-compose up -d --scale app=3
```

## 🔧 Environment Configuration

### Required Environment Variables
```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quizdb

# Application
NODE_ENV=production
PORT=5000

# Security (optional)
JWT_SECRET=your-secret-key
CORS_ORIGIN=https://yourdomain.com

# Email (for production OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### MongoDB Atlas Setup
1. **Create Atlas Account** at [mongodb.com/atlas](https://mongodb.com/atlas)
2. **Create Cluster** (free tier available)
3. **Create Database User**
4. **Whitelist IP Addresses** (0.0.0.0/0 for all IPs)
5. **Get Connection String**

## 🔍 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+
```

#### Database Connection Issues
```bash
# Test MongoDB connection
curl -X GET "https://your-app.com/api/health"

# Check environment variables
echo $MONGODB_URI
```

#### WebSocket Issues
- Ensure platform supports WebSocket connections
- Check if proxy/load balancer supports WebSocket upgrade
- Verify correct WebSocket URL construction

#### Memory Issues
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=2048" npm start
```

### Platform-Specific Issues

#### Vercel
- Serverless functions have 30-second timeout
- WebSocket connections may need special handling
- Static files served from separate CDN

#### Railway
- Check logs: `railway logs`
- Ensure health check endpoint responds
- Monitor resource usage

#### Heroku
- Free dynos sleep after 30 minutes
- Use `heroku ps:scale web=1` to ensure running
- Monitor with `heroku logs --tail`

## 📊 Monitoring and Maintenance

### Health Checks
```typescript
// Add to server/routes.ts
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    await storage.healthCheck();
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

### Logging
```typescript
// Production logging
console.log(JSON.stringify({
  level: 'info',
  message: 'Quiz started',
  quizId,
  timestamp: new Date().toISOString()
}));
```

### Performance Monitoring
- Use application monitoring tools (New Relic, DataDog)
- Monitor database performance
- Track WebSocket connection metrics
- Set up alerts for errors and downtime

## 🚀 Going Live Checklist

### Pre-Deployment
- [ ] Test all features locally
- [ ] Set up production MongoDB database
- [ ] Configure environment variables
- [ ] Test with multiple users
- [ ] Verify Excel upload functionality
- [ ] Test WebSocket connections

### Deployment
- [ ] Choose hosting platform
- [ ] Configure custom domain
- [ ] Set up SSL certificate
- [ ] Configure environment variables
- [ ] Deploy application
- [ ] Test production deployment

### Post-Deployment
- [ ] Monitor application logs
- [ ] Test all functionality
- [ ] Set up monitoring/alerts
- [ ] Create backups
- [ ] Document deployment process
- [ ] Share access with team

## 📞 Support

For deployment issues:
1. Check platform-specific documentation
2. Review application logs
3. Test database connectivity
4. Verify environment variables
5. Contact platform support if needed

---

**Happy Deploying! 🚀**