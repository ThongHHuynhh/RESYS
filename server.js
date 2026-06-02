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
  let bestMatch = null;
  let bestScore = -1;
  let bestRuleSize = -1;

  for (const mapping of configMapping) {
    const rule = mapping.answers || {};
    const ruleKeys = Object.keys(rule);
    let matchCount = 0;

    for (const questionId of ruleKeys) {
      if (answers[questionId] === rule[questionId]) {
        matchCount += 1;
      }
    }

    if (matchCount > bestScore || (matchCount === bestScore && ruleKeys.length > bestRuleSize)) {
      bestScore = matchCount;
      bestRuleSize = ruleKeys.length;
      bestMatch = { mapping, matchCount, ruleSize: ruleKeys.length };
    }
  }

  if (!bestMatch || bestScore <= 0) {
    return null;
  }

  const exactMatch = bestMatch.matchCount === bestMatch.ruleSize;
  return {
    result: bestMatch.mapping.result,
    exactMatch,
    matchedCount: bestMatch.matchCount,
    ruleCount: bestMatch.ruleSize,
  };
}

app.get('/api/questions', (req, res) => {
  const data = loadQuestions();
  res.json(data);
});

app.post('/api/evaluate', (req, res) => {
  const data = loadQuestions();
  const answers = req.body.answers || {};
  const match = findBestConfig(answers, data.configMapping || []);
  if (match) {
    res.json({ success: true, ...match });
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
