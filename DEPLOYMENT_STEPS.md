# 🚀 Quick Deployment Steps for Vercel

## Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies  
cd fmeda-frontend
npm install
cd ..
```

## Step 2: Push to GitHub

```bash
git add .
git commit -m "Convert to Node.js for free Vercel hosting"
git push origin master
```

## Step 3: Deploy on Vercel

### Via Dashboard (Easiest):

1. Go to **[vercel.com](https://vercel.com)** → Sign in with GitHub
2. Click **"Add New Project"**
3. Import repository: **`Dh-Yassine/Easy_Fmeda`**
4. **Project Settings**:
   - Framework: **Other**
   - Root Directory: **`./`** (leave as is)
   - Build Command: **`cd fmeda-frontend && npm install && npm run build`**
   - Output Directory: **`fmeda-frontend/build`**
   - Install Command: **`npm install && cd fmeda-frontend && npm install`**
5. **Environment Variables**: None needed!
6. Click **"Deploy"** 🎉

### Via CLI:

```bash
npm install -g vercel
vercel login
vercel
# Follow prompts
```

## Step 4: Test Your Deployment

After deployment, you'll get a URL like: `https://your-project.vercel.app`

**Test**:
- ✅ Visit the URL → Should see your React app
- ✅ Create a project → Should work
- ✅ Check API: `https://your-project.vercel.app/api/projects/` → Should return `[]`

## ⚠️ Important: Data Storage

- **In-memory storage** = Data resets on server restart/cold start
- **Solution**: Always **Export to CSV** before closing browser
- **Workflow**: Create → Work → Export CSV → Import CSV next time

## ✅ Done!

Your FMEDA tool is now **100% free** on Vercel with **no database** needed!

