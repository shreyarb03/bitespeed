# Deployment Guide - Bitespeed Identity Reconciliation

This guide covers multiple deployment options from simple to production-ready.

---

## 🚀 Quick Deployment Options

### Option 1: Render (Easiest - Free Tier Available) ⭐

**Best for:** Quick deployment, free hosting, automatic deployments

#### Step-by-Step:

1. **Prepare your repository:**
   ```bash
   # Initialize git if not already done
   git init
   git add .
   git commit -m "Initial commit"
   
   # Push to GitHub
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Create Render account:**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

3. **Create a new Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name:** bitespeed-identity-service
     - **Environment:** Node
     - **Build Command:** `npm install && npx prisma generate && npm run build`
     - **Start Command:** `npm start`
     - **Plan:** Free

4. **Add Environment Variables:**
   - Click "Environment" tab
   - Add:
     ```
     DATABASE_URL=file:./prisma/prod.db
     NODE_ENV=production
     PORT=3000
     ```

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Your API will be live at: `https://your-service-name.onrender.com`

**Note:** Free tier sleeps after 15 minutes of inactivity. First request after sleep takes ~30 seconds.

---

### Option 2: Railway (Easy - Free Trial) ⭐

**Best for:** Simple deployment, PostgreSQL support, good free tier

#### Step-by-Step:

1. **Create Railway account:**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create new project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add PostgreSQL database:**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically create DATABASE_URL

4. **Configure service:**
   - Click on your service
   - Go to "Settings"
   - Add build command: `npm install && npx prisma generate && npm run build`
   - Add start command: `npm start`

5. **Update Prisma for PostgreSQL:**
   
   Edit `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"  // Change from sqlite
     url      = env("DATABASE_URL")
   }
   ```

6. **Create and run migration:**
   ```bash
   # Locally, generate migration
   npx prisma migrate dev --name init
   
   # Commit and push
   git add .
   git commit -m "Add PostgreSQL support"
   git push
   ```

7. **Run migration on Railway:**
   - In Railway dashboard, click your service
   - Go to "Settings" → "Variables"
   - Add: `DATABASE_URL` (should already be there)
   - In terminal, run: `npx prisma migrate deploy`

8. **Generate domain:**
   - Go to "Settings" → "Networking"
   - Click "Generate Domain"
   - Your API is live!

---

### Option 3: Heroku (Traditional - Paid)

**Best for:** Enterprise-grade, many add-ons, established platform

#### Step-by-Step:

1. **Install Heroku CLI:**
   ```bash
   brew install heroku/brew/heroku  # macOS
   ```

2. **Login and create app:**
   ```bash
   heroku login
   heroku create bitespeed-identity-service
   ```

3. **Add PostgreSQL:**
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```

4. **Update Prisma schema** (same as Railway - use PostgreSQL)

5. **Create Procfile:**
   ```bash
   echo "web: npm start" > Procfile
   ```

6. **Add build script to package.json:**
   ```json
   {
     "scripts": {
       "build": "tsc",
       "start": "node dist/index.js",
       "postinstall": "npx prisma generate"
     }
   }
   ```

7. **Deploy:**
   ```bash
   git add .
   git commit -m "Prepare for Heroku"
   git push heroku main
   
   # Run migrations
   heroku run npx prisma migrate deploy
   ```

8. **Open your app:**
   ```bash
   heroku open
   ```

---

### Option 4: Vercel (Serverless)

**Best for:** Serverless architecture, edge functions

#### Step-by-Step:

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Create vercel.json:**
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "dist/index.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "dist/index.js"
       }
     ],
     "env": {
       "NODE_ENV": "production"
     }
   }
   ```

3. **Add Vercel Postgres:**
   - Go to [vercel.com](https://vercel.com)
   - Create project
   - Add "Postgres" from Storage tab
   - Copy DATABASE_URL

4. **Deploy:**
   ```bash
   vercel
   ```

**Note:** Vercel has limitations with SQLite. Use Vercel Postgres or external database.

---

### Option 5: DigitalOcean App Platform

**Best for:** Scalable, managed infrastructure, good pricing

#### Step-by-Step:

1. **Create DigitalOcean account:**
   - Go to [digitalocean.com](https://digitalocean.com)
   - Sign up

2. **Create App:**
   - Click "Create" → "Apps"
   - Connect GitHub repository
   - Choose repository and branch

3. **Configure:**
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Run Command:** `npm start`
   - **HTTP Port:** 3000

4. **Add Database:**
   - Click "Add Resource" → "Database"
   - Choose PostgreSQL
   - Select plan (starts at $7/month)

5. **Environment Variables:**
   - DATABASE_URL (auto-populated from database)
   - NODE_ENV=production

6. **Deploy:**
   - Click "Create Resources"
   - Wait for deployment

---

### Option 6: AWS (Production-Grade)

**Best for:** Enterprise, full control, scalability

#### Quick Setup with Elastic Beanstalk:

1. **Install EB CLI:**
   ```bash
   pip install awsebcli
   ```

2. **Initialize:**
   ```bash
   eb init -p node.js bitespeed-identity-service
   ```

3. **Create environment:**
   ```bash
   eb create production
   ```

4. **Add RDS database:**
   ```bash
   eb create-db --engine postgres
   ```

5. **Deploy:**
   ```bash
   eb deploy
   ```

---

## 📦 Pre-Deployment Checklist

Before deploying to any platform:

### 1. Update package.json

```json
{
  "scripts": {
    "start": "node dist/index.js",
    "build": "tsc",
    "postinstall": "npx prisma generate",
    "migrate": "npx prisma migrate deploy"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

### 2. Create .gitignore

```
node_modules/
dist/
.env
*.db
*.db-journal
.DS_Store
```

### 3. Update .env.example

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
NODE_ENV=production
PORT=3000
```

### 4. Add production database support

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // or "mysql" or "sqlite"
  url      = env("DATABASE_URL")
}
```

### 5. Build the project locally

```bash
npm run build
npm start  # Test that it works
```

---

## 🔒 Production Best Practices

### 1. Use PostgreSQL or MySQL (not SQLite)

SQLite is great for development but not recommended for production.

**Migration to PostgreSQL:**

```bash
# 1. Update schema
# Edit prisma/schema.prisma - change provider to "postgresql"

# 2. Create new migration
npx prisma migrate dev --name switch_to_postgresql

# 3. Deploy to production
npx prisma migrate deploy
```

### 2. Environment Variables

Never commit `.env` file. Use platform's environment variable management.

**Required variables:**
- `DATABASE_URL` - Database connection string
- `NODE_ENV` - Set to "production"
- `PORT` - Port number (usually provided by platform)

### 3. Add Health Check Endpoint

Add to `src/app.ts`:

```typescript
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

### 4. Add Logging

Install winston:
```bash
npm install winston
```

Create `src/logger.ts`:
```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});
```

### 5. Add Rate Limiting

```bash
npm install express-rate-limit
```

Update `src/app.ts`:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/identify', limiter);
```

### 6. Add CORS

```bash
npm install cors
npm install --save-dev @types/cors
```

Update `src/app.ts`:
```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
}));
```

---

## 🧪 Testing Deployed API

Once deployed, test with:

```bash
# Replace with your deployed URL
export API_URL="https://your-app.onrender.com"

# Test health check
curl $API_URL/health

# Test identify endpoint
curl -X POST $API_URL/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phoneNumber": "1234567890"
  }'
```

---

## 📊 Monitoring

### Free Monitoring Options:

1. **Render:** Built-in metrics and logs
2. **Railway:** Built-in observability
3. **Heroku:** Heroku Metrics (basic free tier)
4. **UptimeRobot:** Free uptime monitoring (uptimerobot.com)
5. **Better Stack:** Free log management (betterstack.com)

---

## 💰 Cost Comparison

| Platform | Free Tier | Paid Tier | Database |
|----------|-----------|-----------|----------|
| Render | ✅ 750 hrs/month | $7/month | SQLite only on free |
| Railway | ✅ $5 credit/month | $5/month usage-based | PostgreSQL included |
| Heroku | ❌ (ended 2022) | $7/month | $5/month PostgreSQL |
| Vercel | ✅ Hobby free | $20/month | Separate DB needed |
| DigitalOcean | ❌ | $5/month | $7/month PostgreSQL |
| AWS | ✅ 12 months free | Variable | Variable |

---

## 🎯 Recommended Setup

**For Learning/Testing:**
- **Render** (free tier) with SQLite

**For Production:**
- **Railway** or **DigitalOcean** with PostgreSQL
- Add monitoring (UptimeRobot)
- Add logging (Better Stack)
- Enable CORS and rate limiting

---

## 🔧 Troubleshooting

### Build Fails

```bash
# Check Node version
node --version  # Should be 18+

# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Database Connection Fails

```bash
# Test connection locally
npx prisma db push

# Check DATABASE_URL format
echo $DATABASE_URL
```

### Migration Fails

```bash
# Reset and re-migrate
npx prisma migrate reset
npx prisma migrate deploy
```

### App Crashes on Start

Check logs:
```bash
# Render
render logs

# Railway
railway logs

# Heroku
heroku logs --tail
```

---

## 📚 Additional Resources

- [Render Docs](https://render.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Heroku Node.js Guide](https://devcenter.heroku.com/articles/getting-started-with-nodejs)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
- [Express Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

---

## 🚀 Quick Start (Render)

```bash
# 1. Build locally to test
npm run build

# 2. Push to GitHub
git add .
git commit -m "Ready for deployment"
git push

# 3. Go to render.com
# 4. New Web Service → Connect repo
# 5. Use these settings:
#    Build: npm install && npx prisma generate && npm run build
#    Start: npm start
# 6. Deploy!
```

Your API will be live in ~5 minutes! 🎉
