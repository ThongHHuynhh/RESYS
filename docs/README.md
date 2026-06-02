RESYS Quiz Tool — Documentation

Overview
- This folder contains editable documentation and the questionnaire data used by the RESYS quiz webapp.

Files
- `questions.json` — structured, editable list of questions and mapping rules used by the app.
- `questions.md` — human-readable editing guide and examples for `questions.json` and images.
- `troubleshooting.md` — tips for common issues and how to update the app when docs change.
- `images/` — store image assets referenced from `questions.json` here. Keep filenames stable.

Editing workflow
1. Add or modify questions in `questions.json`.
2. Put any image files in `images/` and reference them by relative path in the JSON (e.g. "images/photo.png").
3. Restart the backend (if cached) or use the admin reload endpoint (to be implemented) to pick up changes.
