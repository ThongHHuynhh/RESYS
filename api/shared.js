const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootPath = path.join(__dirname, '..');
const docsPath = path.join(rootPath, 'docs');
const questionsPath = path.join(docsPath, 'questions.json');
const robotAveragesPath = path.join(docsPath, 'robotAverages.json');
const workbookPath = path.join(rootPath, 'src', 'Equipment Configurator.xlsx');
const generatorPath = path.join(rootPath, 'scripts', 'generate_config_from_excel.py');

function loadQuestions() {
  try {
    if (!process.env.VERCEL && fs.existsSync(workbookPath) && fs.existsSync(generatorPath)) {
      const workbookTime = fs.statSync(workbookPath).mtimeMs;
      const questionsTime = fs.existsSync(questionsPath) ? fs.statSync(questionsPath).mtimeMs : 0;

      if (workbookTime > questionsTime) {
        execFileSync('python', [generatorPath], { cwd: rootPath, stdio: 'inherit' });
      }
    }

    const content = fs.readFileSync(questionsPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to load questions.json:', error);
    return { questions: [], configMapping: [] };
  }
}

function loadRobotAverages() {
  try {
    const content = fs.readFileSync(robotAveragesPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to load robotAverages.json:', error);
    return {};
  }
}

function answerIncludes(value, expected) {
  if (Array.isArray(value)) return value.includes(expected);
  return value === expected;
}

function calculateWaterjetCapacity(answers, rule) {
  if (rule.fixedCapacityCutsPerMinute) return Number(rule.fixedCapacityCutsPerMinute);
  const nozzleCount = Number(rule.fixedNozzleCount || answers[rule.nozzleAnswerId] || 1);
  const perNozzle = Number(rule.perNozzleCutsPerMinute || 120);
  const maxCuts = Number(rule.maxCutsPerMinute || 600);
  return Math.min(maxCuts, Math.max(1, nozzleCount) * perNozzle);
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
    case 'notIncludes':
      return !answerIncludes(answer, expected);
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
    case 'lteDynamicCapacity': {
      const selectedTools = answers[rule.capacityQuestionId];
      if (rule.toolId && !answerIncludes(selectedTools, rule.toolId)) return false;
      return Number(answer) <= calculateWaterjetCapacity(answers, rule);
    }
    case 'gtDynamicCapacity': {
      const selectedTools = answers[rule.capacityQuestionId];
      if (rule.toolId && !answerIncludes(selectedTools, rule.toolId)) return false;
      return Number(answer) > calculateWaterjetCapacity(answers, rule);
    }
    default:
      return false;
  }
}

function getRobotWidthLayout(answers) {
  switch (answers.conveyor_width) {
    case 'less_than_48_inches':
      return '1 robot in width max';
    case 'between_48_and_60_inches':
      return '1 or 2 robots in width';
    case 'more_than_60_inches':
      return '2 robots in width';
    default:
      return '';
  }
}

function getRecommendationToolId(recommendation) {
  const rules = recommendation.rules || legacyConditionsToRules(recommendation.conditions || recommendation.answers);
  const toolRule = rules.find((rule) => rule.questionId === 'tool_options' && rule.operator === 'includes');
  return typeof toolRule?.value === 'string' ? toolRule.value : '';
}

function getCutsPerRobot(robotAverages, toolId) {
  return Number(robotAverages?.[toolId]?.cutsPerRobotPerMinute || 0);
}

function getRequiredRobotCount(answers, recommendation, questions, robotAverages) {
  const toolId = getRecommendationToolId(recommendation);
  const requestedCutsPerMinute = Number(answers.production_rate);
  const cutsPerRobot = getCutsPerRobot(robotAverages, toolId);

  if (!Number.isFinite(requestedCutsPerMinute) || requestedCutsPerMinute <= 0 || !cutsPerRobot) {
    return null;
  }

  const count = Math.max(1, Math.ceil(requestedCutsPerMinute / cutsPerRobot));
  return {
    count,
    cutsPerRobot,
    requestedCutsPerMinute,
    label: `${count} robot${count === 1 ? '' : 's'}`,
    note: `${requestedCutsPerMinute} cuts/min / ${cutsPerRobot} cuts/min per robot`,
  };
}

function getDynamicRecommendationName(result, toolId, requiredRobotCount) {
  if (!requiredRobotCount) return result.name;

  const robotLabel = requiredRobotCount.label;
  switch (toolId) {
    case 'ultrasonic_drag_blade':
      return `${robotLabel} with drag blade`;
    case 'ultrasonic_plunge_blade':
      return `${robotLabel} with plunge blade`;
    case 'waterjet_tool':
      return `${robotLabel} with waterjet scoring tool`;
    default:
      return result.name;
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

function evaluateRecommendation(answers, recommendation, questions, robotAverages) {
  const result = recommendation.result || recommendation;
  const toolId = getRecommendationToolId(recommendation);
  const robotWidthLayout = getRobotWidthLayout(answers);
  const requiredRobotCount = getRequiredRobotCount(answers, recommendation, questions, robotAverages);
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
  const scoreDetails = rules.map((rule) => {
    const matched = matchedRules.includes(rule);
    return {
      label: rule.label || rule.questionId,
      matched,
      score: matched ? Number(rule.score || 0) : 0,
      maxScore: Number(rule.score || 0),
    };
  });

  return {
    result: {
      ...result,
      name: getDynamicRecommendationName(result, toolId, requiredRobotCount),
      robotWidthLayout,
      requiredRobotCount,
    },
    available: true,
    matchedCount,
    ruleCount,
    exactMatch: ruleCount > 0 && matchedCount === ruleCount,
    fitScore,
    ruleMatchScore: ruleCount > 0 ? Math.round((matchedCount / ruleCount) * 100) : 0,
    matchedRules: matchedRules.map((rule) => rule.label || rule.questionId),
    scoreDetails,
    scoreSummary: `${rawScore} of ${maxScore} points = ${fitScore}% fit score`,
  };
}

function evaluateConfigs(answers, questions, recommendationRules, robotAverages = {}) {
  const recommendations = recommendationRules.map((recommendation) =>
    evaluateRecommendation(answers, recommendation, questions, robotAverages),
  );

  recommendations.sort((a, b) => {
    if (Number(b.available) !== Number(a.available)) return Number(b.available) - Number(a.available);
    if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
    if (b.matchedCount !== a.matchedCount) return b.matchedCount - a.matchedCount;
    return b.ruleCount - a.ruleCount;
  });

  return recommendations;
}

function evaluateAnswers(answers) {
  const data = loadQuestions();
  const robotAverages = loadRobotAverages();
  const recommendationRules = data.recommendations || data.configMapping || [];
  const recommendations = evaluateConfigs(answers, data.questions || [], recommendationRules, robotAverages);

  if (!recommendations.length || !recommendations[0].available || recommendations[0].matchedCount <= 0) {
    return {
      success: false,
      message: 'No matching configuration found. Please review the answers or update the mapping rules.',
      recommendations,
    };
  }

  const bestMatch = recommendations[0];
  return { success: true, bestMatch, recommendations };
}

module.exports = {
  evaluateAnswers,
  evaluateConfigs,
  loadQuestions,
  loadRobotAverages,
};
