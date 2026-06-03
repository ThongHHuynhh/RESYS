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

function evaluateConfigs(answers, questions, configMapping) {
  const totalQuestions = Array.isArray(questions) ? questions.length : 0;
  const recommendations = [];

  for (const mapping of configMapping) {
    const rule = mapping.answers || {};
    const ruleKeys = Object.keys(rule);
    let matchedCount = 0;

    for (const questionId of ruleKeys) {
      if (answers[questionId] === rule[questionId]) {
        matchedCount += 1;
      }
    }

    const exactMatch = ruleKeys.length > 0 && matchedCount === ruleKeys.length;
    const fitScore = totalQuestions > 0 ? Math.round((matchedCount / totalQuestions) * 100) : 0;
    const ruleMatchScore = ruleKeys.length > 0 ? Math.round((matchedCount / ruleKeys.length) * 100) : 0;

    recommendations.push({
      result: mapping.result,
      matchedCount,
      ruleCount: ruleKeys.length,
      exactMatch,
      fitScore,
      ruleMatchScore,
    });
  }

  recommendations.sort((a, b) => {
    if (b.matchedCount !== a.matchedCount) return b.matchedCount - a.matchedCount;
    if (b.ruleCount !== a.ruleCount) return b.ruleCount - a.ruleCount;
    return b.fitScore - a.fitScore;
  });

  return recommendations;
}

app.get('/api/questions', (req, res) => {
  const data = loadQuestions();
  res.json(data);
});

app.post('/api/evaluate', (req, res) => {
  const data = loadQuestions();
  const answers = req.body.answers || {};
  const recommendations = evaluateConfigs(answers, data.questions || [], data.configMapping || []);

  if (!recommendations.length || recommendations[0].matchedCount <= 0) {
    res.json({
      success: false,
      message: 'No matching configuration found. Please review the answers or update the mapping rules.',
      recommendations,
    });
    return;
  }

  const bestMatch = recommendations[0];
  res.json({ success: true, bestMatch, recommendations });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`RESYS Quiz Tool running at http://localhost:${PORT}`);
});
