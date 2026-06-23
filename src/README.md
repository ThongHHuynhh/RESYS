# RESYS Equipment Configurator Notes

This folder contains the React app source and the Excel workbook used as the configurator source of truth.

## What Changed

The app was changed from a mostly static quiz into a dynamic equipment configurator.

- `src/Equipment Configurator.xlsx` is now the workbook source used to generate configurator data.
- `scripts/generate_config_from_excel.py` reads the workbook and writes `docs/questions.json`.
- `server.js` now evaluates recommendations with a weighted rule engine instead of only exact answer matching.
- The recommendation page shows the selected recommendation, score, scope/limitations, and matched rule reasons.
- The UI was restyled into a white-blue full-screen sales-tool layout with logo transition, option tooltips, disabled option states, and responsive spacing.

## Run The App

From the project root:

```powershell
npm run generate:config
npm run build
npm start
```

Then open:

```text
http://localhost:3000
```

## Excel To JSON Flow

The workbook is here:

```text
src/Equipment Configurator.xlsx
```

The generated app data is here:

```text
docs/questions.json
```

Run this after changing the workbook:

```powershell
npm run generate:config
```

The server also checks whether the Excel file is newer than `docs/questions.json`. If it is newer, `server.js` tries to regenerate the JSON automatically when API data is loaded.

## Decision Making System

The backend uses deterministic scoring, not an LLM, to choose configurations.

Each recommendation can define:

- `rules`: weighted scoring rules that add points when matched.
- `requiredRules`: rules that must match for the recommendation to remain available.
- `disqualifiers`: rules that make a recommendation unavailable.
- `baseScore`: optional starting score.

The backend:

1. Loads answers from the frontend.
2. Loads generated configurator data from `docs/questions.json`.
3. Checks disqualifiers first.
4. Checks required rules.
5. Scores every matching weighted rule.
6. Calculates `fitScore`.
7. Sorts recommendations by availability, fit score, matched count, and rule count.
8. Returns the best match plus alternatives.

## Rule Format

Example recommendation:

```json
{
  "id": "1_robot_with_drag_blade",
  "name": "1 robot with drag blade",
  "rules": [
    {
      "questionId": "tool_options",
      "operator": "includes",
      "value": "ultrasonic_drag_blade",
      "score": 40,
      "label": "Ultrasonic drag blade selected"
    }
  ],
  "disqualifiers": [
    {
      "questionId": "tool_options",
      "operator": "includes",
      "value": "waterjet_tool",
      "message": "This recommendation is for an ultrasonic drag blade, not waterjet."
    }
  ]
}
```

## Supported Operators

These operators are implemented in `server.js`.

| Operator | Use case |
| --- | --- |
| `equals` | Single answer exactly equals a value |
| `notEquals` | Single answer does not equal a value |
| `includes` | Multi-select answer includes one value |
| `includesAny` | Multi-select answer includes at least one value |
| `includesAll` | Multi-select answer includes every value |
| `lte` | Numeric answer is less than or equal to a value |
| `gte` | Numeric answer is greater than or equal to a value |
| `between` | Numeric answer is between `min` and `max` |

## Main Tuning Parameters

### Recommendation Weights

Tune rule weights in `docs/questions.json`, or preferably in the generator script so regeneration preserves changes:

```text
scripts/generate_config_from_excel.py
```

Important fields:

- `score`: higher values make a rule more important.
- `baseScore`: optional starting score for a recommendation.
- `requiredRules`: use when a recommendation must not appear unless a condition is true.
- `disqualifiers`: use for hard exclusions.

Example:

```json
{
  "questionId": "production_rate",
  "operator": "lte",
  "value": 80,
  "score": 25
}
```

Increasing `score` makes that condition more influential.

### Conditional Option Rules

Disabled frontend options are controlled by:

```json
"conditionalRules": [
  {
    "sourceQuestionId": "product_settings",
    "sourceOptionId": "deep_cuts_5mm",
    "targetQuestionId": "tool_options",
    "targetOptionId": "waterjet_tool",
    "effect": "disable",
    "message": "Waterjet tool is not available when deep cuts (>5mm) are selected."
  }
]
```

This currently disables Waterjet when deep cuts are selected.

### Question Types

Questions support:

- `single`: one answer.
- `multi`: multiple answers.
- `range`: numeric slider.

Useful fields:

- `display: "image"` shows image cards.
- `display: "list"` shows stacked text options.
- `required: true` blocks progress until answered.
- `info` appears in answer `?` tooltips.

### Production Rate Slider

The production rate question uses:

```json
{
  "min": 20,
  "max": 2000,
  "step": 10,
  "defaultValue": 80,
  "unit": "cuts/min"
}
```

Tune these in `scripts/generate_config_from_excel.py`.

## UI Tuning Parameters

Most visual tuning is in:

```text
src/styles.css
```

Common spacing controls:

### Landing Logo

```css
.logo-transition {
  top: 18%;
  width: min(320px, 58vw);
}
```

### Landing Text Position

```css
.landing-page {
  padding-top: clamp(180px, 28vh, 240px);
}
```

### Question Page Top Space

```css
.view-questions,
.view-result {
  padding-top: 118px;
}
```

This prevents the compact logo from overlapping the question content.

### Compact Logo

```css
.logo-transition.compact {
  top: 0px;
  width: 104px;
}
```

### Question Card Density

```css
.question {
  min-height: 430px;
  padding: clamp(20px, 3vw, 32px);
}
```

### Text-Only Option Stacking

```css
.list-options {
  grid-template-columns: minmax(0, 680px);
  justify-content: center;
}
```

## Important Files

| File | Purpose |
| --- | --- |
| `src/Equipment Configurator.xlsx` | Workbook source of truth |
| `scripts/generate_config_from_excel.py` | Converts workbook to app JSON |
| `docs/questions.json` | Generated questions, options, rules, recommendations |
| `server.js` | API server and scoring engine |
| `src/App.jsx` | Main frontend state and conditional option logic |
| `src/components/QuestionCard.jsx` | Question rendering |
| `src/components/OptionButton.jsx` | Answer option UI |
| `src/components/TooltipInfo.jsx` | Answer tooltip UI |
| `src/components/LogoTransition.jsx` | Landing-to-question logo animation |
| `src/components/RecommendationPanel.jsx` | Recommendation display |
| `src/styles.css` | Main styling and spacing tuning |

## Recommended Editing Workflow

1. Update `src/Equipment Configurator.xlsx`.
2. If recommendation logic needs new weights or rules, update `scripts/generate_config_from_excel.py`.
3. Regenerate config:

```powershell
npm run generate:config
```

4. Build:

```powershell
npm run build
```

5. Run:

```powershell
npm start
```

## Notes On LLM Usage

An LLM can help convert messy workbook content into structured rules or explain recommendations in natural language.

The actual recommendation should stay deterministic. Equipment decisions should be made by explicit rules, weights, and disqualifiers so results are repeatable and auditable.
