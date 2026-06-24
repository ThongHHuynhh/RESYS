# RESYS Quiz Tool

Internal sales and customer-facing configuration quiz for understanding available KATANA II scoring configurations.

The app asks a short set of product, support, tooling, production-rate, and conveyor-width questions, then returns the best-fit configuration with fit score, scope notes, and matching reasons.

## Features

- Vite React frontend with an Express backend for local hosting.
- Vercel-ready serverless API routes under `api/`.
- Workbook-driven quiz generation from `Equipment Configurator (1).xlsx` or `src/Equipment Configurator.xlsx`.
- Recommendation engine with multiple standard outcomes:
  - 1 robot with ultrasonic drag blade.
  - 1 robot with ultrasonic plunge blade.
  - Waterjet scoring tool.
  - Custom scoring tool.
- Dynamic waterjet capacity calculation:
  - 120 cuts/min per nozzle/head.
  - 600 cuts/min maximum per waterjet tool.
  - The production-rate question shows a nozzle dropdown when waterjet is selected.
- Tool-based production-rate limits:
  - Ultrasonic drag blade: 120 cuts/min from the KATANA II customer presentation.
  - Ultrasonic plunge blade: 200 cuts/min from the KATANA II customer presentation.
  - Waterjet: calculated from selected nozzle count.
  - Custom tool: allows high-rate custom engineering review cases.
- Deep cuts greater than 5 mm disable the waterjet option.
- Question image cards fill the available image area above the option text.

## Reference Files

- `Equipment Configurator (1).xlsx` - root-level workbook reference used first by the generator when present.
- `src/Equipment Configurator.xlsx` - fallback workbook reference.
- `KATANA II Customer Presentation.pdf` - customer presentation reference.

PDF note: `pypdf` extraction from `KATANA II Customer Presentation.pdf` confirmed the scoring rates: ultrasonic drag blade up to 120 cuts/min, ultrasonic plunge blade up to 200 cuts/min, and waterjet up to 120 cuts/min per head with 600 cuts/min per tool.

## Run Locally

Install dependencies:

```powershell
npm install
```

Build the frontend:

```powershell
npm run build
```

Start the local Express app:

```powershell
npm start
```

Open:

```text
http://localhost:3000
```

## Development

Run the backend:

```powershell
npm run dev:server
```

Run the Vite frontend in another terminal:

```powershell
npm run dev
```

Vite proxies `/api` and `/docs` requests to the local Express server.

## Deploy To Vercel

Use these Vercel settings:

```text
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

The Vercel API routes are:

```text
/api/questions
/api/evaluate
```

Static question images are copied from `docs/images` to `public/docs/images` before each build, then served from `/docs/images/...`.

## Updating Quiz Data

Edit the workbook, then regenerate:

```powershell
npm run generate:config
```

The generator writes:

```text
docs/questions.json
```

Then rebuild:

```powershell
npm run build
```

## User Notes

- Answer the questions in order.
- If waterjet is selected, choose the number of nozzles on the maximum cutting-rate question.
- The maximum cutting-rate slider changes based on selected tool capacity.
- If waterjet is disabled, check whether deep cuts greater than 5 mm were selected.
- Use the result page's fit score, matched criteria, capacity notes, and scope limitations as sales guidance, not as a final engineering quote.
- Use "Custom scoring tool" when the requested pattern, conveyor width, or rate is outside standard tool limits.

## Developer Notes

- `scripts/generate_config_from_excel.py` is the source for generated recommendation rules.
- `docs/questions.json` is runtime data consumed by `/api/questions` and `/api/evaluate`.
- `api/shared.js` contains server-side scoring, including dynamic waterjet capacity rules.
- `src/App.jsx` mirrors the capacity logic on the client to clamp user-entered rates before submission.
- `src/components/QuestionCard.jsx` renders the dynamic waterjet nozzle dropdown.
- `src/styles.css` contains image-card fill behavior and layout styles.
- On Vercel, API functions do not regenerate `docs/questions.json`; run the generator locally before deployment.
- Gemini API is not currently used. The recommendation system is deterministic and local for faster retrieval and easier auditability.
