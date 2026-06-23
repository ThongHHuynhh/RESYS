# Deploying to Vercel

This app uses a Vite React frontend and Vercel serverless functions for the backend API.

## Project settings

Use these settings in Vercel:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

The API routes are:

```text
/api/questions
/api/evaluate
```

## Deploy from Git

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In Vercel, choose **Add New Project**.
3. Import the repository.
4. Keep the build settings above.
5. Click **Deploy**.

## Deploy from the CLI

```powershell
npm install -g vercel
vercel login
vercel
vercel --prod
```

## Updating quiz content

Update `docs/questions.json` and deploy again.

Images referenced as `images/example.png` in `docs/questions.json` should be placed in `docs/images`. The build copies them to `public/docs/images` so the deployed site can serve them from `/docs/images/...`.

On Vercel, the Excel-to-JSON generator is not run automatically by the API functions. Run this locally before deploying when the workbook changes:

```powershell
npm run generate:config
npm run build
```
