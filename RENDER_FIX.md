# Fix Render Deployment Errors

## The Problem

You're seeing TypeScript compilation errors during Render's build process. This happens because:
1. Test files are being included in the build
2. TypeScript is trying to compile test dependencies

## The Solution

I've already fixed the configuration files. Now you need to:

### Step 1: Commit and Push the Fixes

```bash
git add tsconfig.json render.yaml
git commit -m "Fix TypeScript build configuration for Render"
git push
```

### Step 2: Update Render Build Settings

Go to your Render dashboard and update the build command:

**Old command:**
```
npm install && npx prisma generate && npm run build
```

**New command:**
```
npm ci && npx prisma generate && npm run build
```

### Step 3: Trigger Redeploy

In Render dashboard:
1. Go to your service
2. Click "Manual Deploy" → "Deploy latest commit"
3. Wait for build to complete

## Alternative: Use Environment-Specific Build

If you still see errors, try this approach:

### Option A: Separate tsconfig for production

Create `tsconfig.prod.json`:

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts", "vitest.config.ts"]
}
```

Then update build command in Render:
```
npm ci && npx prisma generate && tsc -p tsconfig.prod.json
```

### Option B: Install only production dependencies

Update Render build command:
```
npm ci --only=production && npx prisma generate && npm run build
```

But first, move dev dependencies in package.json:

```json
{
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.10.5",
    "@types/supertest": "^7.2.0",
    "@vitest/coverage-v8": "^2.1.9",
    "fast-check": "^3.22.0",
    "prisma": "^5.22.0",
    "supertest": "^7.2.2",
    "tsx": "^4.19.2",
    "typescript": "^5.7.3",
    "vitest": "^2.1.8"
  }
}
```

**Important:** Keep `typescript` and `@types/node` in devDependencies, but Render needs them for build.

## Recommended Solution

Use this build command in Render (already in render.yaml):

```
npm ci && npx prisma generate && npm run build
```

And ensure your `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "types": ["node"],
    "skipLibCheck": true
  },
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

## Verify Locally

Before pushing, test the build:

```bash
# Clean build
rm -rf dist node_modules
npm install
npm run build

# Should complete without errors
```

## Still Having Issues?

### Check Render Logs

Look for the specific error in Render logs. Common issues:

1. **"Cannot find module 'vitest'"**
   - Solution: Exclude test files from build

2. **"Cannot find name 'console'"**
   - Solution: Add `"types": ["node"]` to tsconfig.json

3. **Build succeeds but app crashes**
   - Check that `dist/` folder has all necessary files
   - Verify DATABASE_URL is set in Render environment variables

### Debug Build Locally

```bash
# Simulate production build
NODE_ENV=production npm ci
npm run build
node dist/index.js
```

## Quick Fix Commands

```bash
# 1. Update files (already done)
git add tsconfig.json render.yaml
git commit -m "Fix build configuration"
git push

# 2. In Render dashboard:
#    - Go to your service
#    - Settings → Build & Deploy
#    - Build Command: npm ci && npx prisma generate && npm run build
#    - Click "Save Changes"
#    - Click "Manual Deploy" → "Deploy latest commit"
```

## Success Indicators

Build is successful when you see:
```
==> Building...
==> Running 'npm ci && npx prisma generate && npm run build'
✓ Prisma Client generated
✓ TypeScript compiled successfully
==> Build successful!
```

Then deployment should show:
```
==> Starting service...
Server is running on port 3000
```
