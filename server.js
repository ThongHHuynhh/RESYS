const express = require('express');
const fs = require('fs');
const path = require('path');
const { evaluateAnswers, loadQuestions } = require('./api/shared');

const app = express();
const PORT = process.env.PORT || 3000;
const docsPath = path.join(__dirname, 'docs');
const distPath = path.join(__dirname, 'dist');

app.use(express.json());
app.use(express.static(distPath));
app.use('/docs/images', express.static(path.join(docsPath, 'images')));

app.get('/api/questions', (req, res) => {
  const data = loadQuestions();
  res.json(data);
});

app.post('/api/evaluate', (req, res) => {
  res.json(evaluateAnswers(req.body.answers || {}));
});

app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');

  if (!fs.existsSync(indexPath)) {
    res.status(503).send('React app has not been built yet. Run "npm run build" before "npm start".');
    return;
  }

  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`RESYS Quiz Tool running at http://localhost:${PORT}`);
});
