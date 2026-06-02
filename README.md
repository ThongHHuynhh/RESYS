# RESYS Quiz Tool

A simple internal web application for sales teams to answer a short quiz and receive a recommended system configuration for customers.

## What it includes
- `server.js` — Express backend serving the React UI and API.
- `public/` — static React front-end using CDN-hosted React.
- `docs/questions.json` — editable quiz questions and mapping rules.
- `docs/` — documentation and image folder for question content.

## Run locally
1. Open a terminal in `c:\Users\electric\ABI\resys`
2. Install dependencies:

```powershell
npm install
```

3. Start the app:

```powershell
npm start
```

4. Open the browser at:

```text
http://localhost:3000
```

## Updating the quiz
- Edit `docs/questions.json` to change the questions, options, or recommended configuration mapping.
- Add optional image files to `docs/images/` and reference them in the JSON with relative paths.
- The server reads `questions.json` on every request, so it picks up changes automatically.

## Notes
- Use `docs/questions.md` for editing guidance.
- Images should use forward slashes in the JSON paths, for example: `"images/performance.png"`.
