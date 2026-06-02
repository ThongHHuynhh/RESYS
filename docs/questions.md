Editing `questions.json`

Format overview
- `questions`: array of question objects.
  - `id`: unique question id (e.g. "q1").
  - `text`: question wording.
  - `type`: `single` or `multi`.
  - `options`: array of choices. Each option may include an `image` field with a relative path (e.g. "images/photo.png").

- `configMapping`: array of mapping rules.
  - `answers`: object mapping question ids to chosen option ids. Rules may match a subset of answers; first matching rule is used.
  - `result`: object containing recommended configuration fields (e.g. `name`, `description`, `sku`).

Example option with image:
{
  "id": "b",
  "text": "High performance",
  "image": "images/performance.png"
}

Guidelines
- Keep `id` values stable to avoid breaking saved sessions.
- Place images in the `images/` folder and reference them with relative paths in JSON.
- When updating mappings, ensure the rules are ordered from most specific to most general.

Reload behavior
- The backend should read `questions.json` at startup; if the app caches the file, add an admin reload endpoint to re-read the file without restarting.
