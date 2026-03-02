# 🚀 Quick Deploy Guide

Choose your deployment method:

---

## 1️⃣ Render (Easiest - 5 minutes)

### One-Click Deploy:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### Manual Deploy:

```bash
# 1. Push to GitHub
git add .
git commit -m "Ready for deployment"
git push

# 2. Go to render.com and sign up
# 3. Click "New +" → "Web Service"
# 4. Connect your GitHub repo
# 5. Use these settings:
#    - Build Command: npm install && npx prisma generate && npm run build
#    - Start Command: npm start
# 6. Click "Create Web Service"
```

**Your API will be live at:** `https://your-service-name.onrender.com`

---

## 2️⃣ Railway (Fast - 3 minutes)

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Initialize and deploy
railway init
railway up

# 4. Add domain
railway domain
```

**Done!** Your API is live.

---

## 3️⃣ Docker (Local or Any Cloud)

```bash
# Build and run with Docker Compose (includes PostgreSQL)
docker-compose up -d

# Your API is running at http://localhost:3000
```

**Or build Docker image only:**
```bash
npm run docker:build
npm run docker:run
```

---

## 4️⃣ Heroku

```bash
# 1. Install Heroku CLI
brew install heroku/brew/heroku

# 2. Login and create app
heroku login
heroku create your-app-name

# 3. Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# 4. Deploy
git push heroku main

# 5. Run migrations
heroku run npx prisma migrate deploy
```

---

## 5️⃣ Vercel

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# Follow the prompts
```

**Note:** Add Vercel Postgres from dashboard for database.

---

## 6️⃣ DigitalOcean

```bash
# 1. Install doctl
brew install doctl

# 2. Authenticate
doctl auth init

# 3. Create app
doctl apps create --spec render.yaml

# Or use the web interface at digitalocean.com
```

---

## ✅ Post-Deployment Checklist

After deploying, test your API:

```bash
# Replace with your deployed URL
export API_URL="https://your-app.onrender.com"

# Test health endpoint
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

## 🔧 Environment Variables

Make sure to set these in your hosting platform:

```env
DATABASE_URL=your_database_connection_string
NODE_ENV=production
PORT=3000
```

---

## 📊 Monitoring

Add free monitoring:

1. **UptimeRobot** (uptimerobot.com) - Uptime monitoring
2. **Better Stack** (betterstack.com) - Log management
3. **Sentry** (sentry.io) - Error tracking

---

## 💡 Tips

- **Free Tier:** Start with Render or Railway
- **Production:** Use Railway or DigitalOcean with PostgreSQL
- **Enterprise:** Use AWS or GCP with managed database
- **Local Testing:** Use Docker Compose

---

## 🆘 Troubleshooting

**Build fails?**
```bash
npm run build  # Test locally first
```

**Database issues?**
```bash
npx prisma migrate deploy  # Run migrations
```

**App crashes?**
- Check logs in your platform's dashboard
- Verify DATABASE_URL is set correctly
- Ensure Node version is 18+

---

## 📚 Need More Help?

See `DEPLOYMENT_GUIDE.md` for detailed instructions for each platform.
