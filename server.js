const express = require('express');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const docsPath = path.join(__dirname, 'docs');
const distPath = path.join(__dirname, 'dist');
const questionsPath = path.join(docsPath, 'questions.json');
const workbookPath = path.join(__dirname, 'src', 'Equipment Configurator.xlsx');
const generatorPath = path.join(__dirname, 'scripts', 'generate_config_from_excel.py');

app.use(express.json());
app.use(express.static(distPath));
app.use('/docs/images', express.static(path.join(docsPath, 'images')));

function loadQuestions() {
  try {
    if (fs.existsSync(workbookPath) && fs.existsSync(generatorPath)) {
      const workbookTime = fs.statSync(workbookPath).mtimeMs;
      const questionsTime = fs.existsSync(questionsPath) ? fs.statSync(questionsPath).mtimeMs : 0;

      if (workbookTime > questionsTime) {
        execFileSync('python', [generatorPath], { cwd: __dirname, stdio: 'inherit' });
      }
    }

    const content = fs.readFileSync(questionsPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to load questions.json:', error);
    return { questions: [], configMapping: [] };
  }
}

function answerIncludes(value, expected) {
  if (Array.isArray(value)) return value.includes(expected);
  return value === expected;
}

function matchesRule(answers, rule) {
  if (!rule) return false;

  const answer = answers[rule.questionId];
  const expected = rule.value;

  switch (rule.operator) {
    case 'equals':
      return answer === expected;
    case 'notEquals':
      return answer !== expected;
    case 'includes':
      return answerIncludes(answer, expected);
    case 'includesAny':
      return Array.isArray(expected) && expected.some((item) => answerIncludes(answer, item));
    case 'includesAll':
      return Array.isArray(answer) && Array.isArray(expected) && expected.every((item) => answer.includes(item));
    case 'lte':
      return Number(answer) <= Number(expected);
    case 'gte':
      return Number(answer) >= Number(expected);
    case 'between':
      return Number(answer) >= Number(rule.min) && Number(answer) <= Number(rule.max);
    default:
      return false;
  }
}

function legacyConditionsToRules(conditions) {
  return Object.entries(conditions || {}).map(([key, expected]) => {
    if (key.endsWith('Max')) {
      return { questionId: key.slice(0, -3), operator: 'lte', value: expected, score: 1 };
    }

    if (key.endsWith('Min')) {
      return { questionId: key.slice(0, -3), operator: 'gte', value: expected, score: 1 };
    }

    return {
      questionId: key,
      operator: Array.isArray(expected) ? 'includesAny' : 'equals',
      value: expected,
      score: 1,
    };
  });
}

function evaluateRecommendation(answers, recommendation) {
  const result = recommendation.result || recommendation;
  const rules = recommendation.rules || legacyConditionsToRules(recommendation.conditions || recommendation.answers);
  const requiredRules = recommendation.requiredRules || [];
  const disqualifiers = recommendation.disqualifiers || [];
  const maxScore = rules.reduce((sum, rule) => sum + Number(rule.score || 0), 0);
  const disqualifiedBy = disqualifiers.find((rule) => matchesRule(answers, rule));
  const missingRequired = requiredRules.find((rule) => !matchesRule(answers, rule));

  if (disqualifiedBy || missingRequired) {
    return {
      result,
      available: false,
      disqualifiedReason:
        disqualifiedBy?.message || missingRequired?.message || 'This configuration is not available for the selected answers.',
      matchedCount: 0,
      ruleCount: rules.length + requiredRules.length,
      exactMatch: false,
      fitScore: 0,
      ruleMatchScore: 0,
      matchedRules: [],
    };
  }

  const matchedRules = rules.filter((rule) => matchesRule(answers, rule));
  const rawScore = matchedRules.reduce((sum, rule) => sum + Number(rule.score || 0), Number(recommendation.baseScore || 0));
  const fitScore = maxScore > 0 ? Math.min(100, Math.round((rawScore / maxScore) * 100)) : 0;
  const ruleCount = rules.length + requiredRules.length;
  const matchedCount = matchedRules.length + requiredRules.length;

  return {
    result,
    available: true,
    matchedCount,
    ruleCount,
    exactMatch: ruleCount > 0 && matchedCount === ruleCount,
    fitScore,
    ruleMatchScore: ruleCount > 0 ? Math.round((matchedCount / ruleCount) * 100) : 0,
    matchedRules: matchedRules.map((rule) => rule.label || rule.questionId),
  };
}

function evaluateConfigs(answers, questions, recommendationRules) {
  const recommendations = recommendationRules.map((recommendation) => evaluateRecommendation(answers, recommendation));

  recommendations.sort((a, b) => {
    if (Number(b.available) !== Number(a.available)) return Number(b.available) - Number(a.available);
    if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
    if (b.matchedCount !== a.matchedCount) return b.matchedCount - a.matchedCount;
    return b.ruleCount - a.ruleCount;
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
  const recommendationRules = data.recommendations || data.configMapping || [];
  const recommendations = evaluateConfigs(answers, data.questions || [], recommendationRules);

  if (!recommendations.length || !recommendations[0].available || recommendations[0].matchedCount <= 0) {
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
