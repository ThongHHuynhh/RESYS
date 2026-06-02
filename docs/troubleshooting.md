Troubleshooting — RESYS Quiz Tool

1) Questions not updating
- Ensure `questions.json` is valid JSON (use a linter).
- If the backend serves a cached copy, restart the server or call the reload endpoint (if implemented).

2) Images not showing
- Verify the referenced path in `questions.json` matches the filename inside `docs/images/`.
- Confirm the web server serves the `docs/images` directory (backend must expose it).

3) Mapping not matching expected result
- Ensure `configMapping` rules are ordered correctly; first match wins.
- For debugging, add a temporary mapping that prints matched answers to logs.

4) Permissions / Windows path issues
- Avoid backslashes in JSON paths; always use forward slashes and relative paths from the `docs` folder.

Contact
- For further help, open an issue in the repository or contact the RESYS tooling owner.
