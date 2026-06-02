const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const docsPath = path.join(__dirname, 'docs');
const publicPath = path.join(__dirname, 'public');
const questionsPath = path.join(docsPath, 'questions.json');

app.use(express.json());
app.use(express.static(publicPath));
app.use('/docs/images', express.static(path.join(docsPath, 'images')));

function loadQuestions() {
  try {
    const content = fs.readFileSync(questionsPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to load questions.json:', error);
    return { questions: [], configMapping: [] };
  }
}

function findBestConfig(answers, configMapping) {
  for (const mapping of configMapping) {
    const rule = mapping.answers || {};
    let matches = true;
    for (const questionId of Object.keys(rule)) {
      if (answers[questionId] !== rule[questionId]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return mapping.result;
    }
  }
  return null;
}

app.get('/api/questions', (req, res) => {
  const data = loadQuestions();
  res.json(data);
});

app.post('/api/evaluate', (req, res) => {
  const data = loadQuestions();
  const answers = req.body.answers || {};
  const result = findBestConfig(answers, data.configMapping || []);
  if (result) {
    res.json({ success: true, result });
  } else {
    res.json({ success: false, message: 'No matching configuration found. Please review the answers or update the mapping rules.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`RESYS Quiz Tool running at http://localhost:${PORT}`);
});
