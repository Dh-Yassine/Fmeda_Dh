# FMEDA Web - Vercel Deployment Guide

This project has been converted to a **pure Node.js** application that can be hosted **100% free on Vercel** with no database required!

## 🎯 What Changed

- ✅ **Backend**: Converted from Django/Python to Node.js/Express
- ✅ **Storage**: Uses in-memory storage (no database needed)
- ✅ **Hosting**: Single Vercel deployment (frontend + backend together)
- ✅ **Cost**: **100% FREE** on Vercel's free tier

## 📁 Project Structure

```
Fmeda_web/
├── api/
│   └── index.js          # Node.js/Express API server
├── fmeda-frontend/       # React frontend
├── package.json          # Root package.json with dependencies
├── vercel.json          # Vercel configuration
└── README_DEPLOYMENT.md # This file
```

## 🚀 Deployment Steps

### 1. Install Dependencies

```bash
# Install root dependencies (Express, CORS, etc.)
npm install

# Install frontend dependencies
cd fmeda-frontend
npm install
cd ..
```

### 2. Test Locally (Optional)

```bash
# Install Vercel CLI
npm install -g vercel

# Run locally
vercel dev
```

### 3. Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. **Push your code to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Convert to Node.js for Vercel"
   git push origin master
   ```

2. **Go to [vercel.com](https://vercel.com)** and sign in with GitHub

3. **Click "Add New Project"**

4. **Import your repository** (`Dh-Yassine/Easy_Fmeda`)

5. **Configure Project Settings**:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (root of repo)
   - **Build Command**: `cd fmeda-frontend && npm install && npm run build`
   - **Output Directory**: `fmeda-frontend/build`
   - **Install Command**: `npm install && cd fmeda-frontend && npm install`

6. **Environment Variables**: None needed! (Everything works out of the box)

7. **Click "Deploy"**

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? fmeda-web (or your choice)
# - Directory? ./
# - Override settings? No
```

### 4. Verify Deployment

After deployment, Vercel will give you a URL like:
- `https://your-project-name.vercel.app`

**Test the API**:
- `https://your-project-name.vercel.app/api/projects/` (should return `[]`)
- `https://your-project-name.vercel.app/` (should show React app)

## 🔧 How It Works

### API Routes
All API endpoints are prefixed with `/api/`:
- `GET /api/projects/` - List projects
- `POST /api/projects/` - Create project
- `GET /api/safety-functions/?project=1` - Get safety functions
- `POST /api/components/` - Create component
- `POST /api/fmeda/calculate/` - Calculate FMEDA metrics
- etc.

### Frontend
The React app automatically uses `/api` as the base URL when deployed on Vercel, or `http://localhost:8000` for local development.

### Storage
- **In-memory**: All data is stored in JavaScript Maps/Objects
- **Session-based**: Data persists during the serverless function execution
- **Note**: Data is reset when the serverless function cold starts (Vercel free tier limitation)
- **Solution**: Use CSV import/export to save/load projects

## 📝 Important Notes

### ⚠️ Data Persistence
- **In-memory storage** means data is **NOT persisted** between deployments or cold starts
- **Solution**: Use the **CSV Import/Export** feature to save your projects
- Export your project before closing the browser
- Import it again when you need to continue working

### 🔄 Workflow
1. Create/import project
2. Work on your FMEDA analysis
3. **Export to CSV** before closing (saves everything)
4. **Import CSV** next time to continue

### 🆓 Vercel Free Tier Limits
- ✅ **Unlimited** deployments
- ✅ **100GB** bandwidth/month
- ✅ **Serverless functions** (perfect for this app)
- ⚠️ **Cold starts**: First request after inactivity may be slower (~1-2 seconds)
- ⚠️ **Execution time**: 10 seconds max per request (plenty for this app)

## 🐛 Troubleshooting

### API returns 404
- Check that `vercel.json` is in the root directory
- Verify API routes start with `/api/`

### CORS errors
- Already handled! CORS is enabled in `api/index.js`

### Data disappears
- This is expected with in-memory storage
- Always export your project to CSV before closing

### Build fails
- Make sure both `package.json` files have correct dependencies
- Check that `fmeda-frontend/package.json` exists
- Verify Node.js version (18+)

## 🎉 Success!

Once deployed, your FMEDA tool will be:
- ✅ **100% Free** on Vercel
- ✅ **No database** required
- ✅ **Fully functional** with all features
- ✅ **Accessible** from anywhere

**Your deployment URL**: `https://your-project-name.vercel.app`

Enjoy your free FMEDA analysis tool! 🚀

