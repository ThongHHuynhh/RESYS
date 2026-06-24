import { useEffect, useState } from 'react';
import LogoTransition from './components/LogoTransition.jsx';
import LandingPage from './pages/LandingPage.jsx';
import QuizPage from './pages/QuizPage.jsx';
import ResultPage from './pages/ResultPage.jsx';

export default function App() {
  const [questionsData, setQuestionsData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('landing');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const getDefaultAnswers = (data) => {
    const defaults = {};
    for (const question of data?.questions || []) {
      if (question.type === 'range' && question.defaultValue !== undefined) {
        defaults[question.id] = question.defaultValue;
      }
      if (question.waterjetNozzleControl?.answerId) {
        defaults[question.waterjetNozzleControl.answerId] = question.waterjetNozzleControl.defaultValue || 1;
      }
    }
    return defaults;
  };

  const getEffectiveRangeMax = (question, sourceAnswers = answers) => {
    if (!question?.capacityByTool || !question.capacityQuestionId) return question?.max;

    const selectedTools = sourceAnswers[question.capacityQuestionId];
    const selectedToolIds = Array.isArray(selectedTools) ? selectedTools : selectedTools ? [selectedTools] : [];
    const capacities = selectedToolIds
      .map((toolId) => {
        const capacity = question.capacityByTool[toolId];
        if (!capacity) return null;
        if (toolId === 'waterjet_tool' && question.waterjetNozzleControl) {
          const control = question.waterjetNozzleControl;
          const nozzleCount = Number(sourceAnswers[control.answerId] || control.defaultValue || 1);
          return Math.min(control.maxCutsPerMinute, Math.max(control.min || 1, nozzleCount) * control.perNozzleCutsPerMinute);
        }
        return capacity.maxCutsPerMinute;
      })
      .filter((value) => Number.isFinite(Number(value)));

    if (!capacities.length) return question.max;
    return Math.min(question.max, Math.max(...capacities));
  };

  useEffect(() => {
    fetch('/api/questions')
      .then((response) => response.json())
      .then((data) => {
        setQuestionsData(data);
        setAnswers(getDefaultAnswers(data));
        setLoading(false);
      })
      .catch(() => {
        setError('Unable to load question data.');
        setLoading(false);
      });
  }, []);

  const hasAnswer = (question, finalAnswers) => {
    const value = finalAnswers[question.id];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== '';
  };

  const getDisabledReason = (questionId, optionId, sourceAnswers = answers) => {
    const rules = questionsData?.conditionalRules || [];
    const match = rules.find((rule) => {
      if (rule.effect !== 'disable') return false;
      if (rule.targetQuestionId !== questionId || rule.targetOptionId !== optionId) return false;
      const sourceValue = sourceAnswers[rule.sourceQuestionId];
      return Array.isArray(sourceValue)
        ? sourceValue.includes(rule.sourceOptionId)
        : sourceValue === rule.sourceOptionId;
    });

    return match?.message || '';
  };

  const pruneDisabledAnswers = (nextAnswers) => {
    if (!questionsData?.questions) return nextAnswers;

    const pruned = { ...nextAnswers };
    for (const question of questionsData.questions) {
      const value = pruned[question.id];
      if (Array.isArray(value)) {
        pruned[question.id] = value.filter((optionId) => !getDisabledReason(question.id, optionId, pruned));
      } else if (value && getDisabledReason(question.id, value, pruned)) {
        delete pruned[question.id];
      }

      if (question.type === 'range' && pruned[question.id] !== undefined) {
        const max = getEffectiveRangeMax(question, pruned);
        const numericValue = Number(pruned[question.id]);
        if (Number.isFinite(numericValue)) {
          pruned[question.id] = Math.min(max, Math.max(question.min, numericValue));
        }
      }
    }

    return pruned;
  };

  const submitAnswers = (finalAnswers) => {
    if (!questionsData) return;

    const missing = questionsData.questions.filter((question) => question.required && !hasAnswer(question, finalAnswers));
    if (missing.length) {
      setError('Please answer all questions before evaluating.');
      setResult(null);
      return;
    }

    setError('');
    fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: finalAnswers }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setResult({ ...data.bestMatch.result, ...data.bestMatch, recommendations: data.recommendations });
          setView('result');
          setError('');
        } else {
          setResult(null);
          setError(data.message || 'No configuration matched.');
        }
      })
      .catch(() => {
        setError('Failed to evaluate answers.');
        setResult(null);
      });
  };

  const handleSelect = (questionId, optionId) => {
    const question = questionsData.questions.find((item) => item.id === questionId);
    let value = optionId;

    if (question?.type === 'multi') {
      const current = Array.isArray(answers[questionId]) ? answers[questionId] : [];
      value = current.includes(optionId) ? current.filter((item) => item !== optionId) : [...current, optionId];
    } else if (question?.type === 'range' && optionId !== '') {
      value = Number(optionId);
    }

    const nextAnswers = pruneDisabledAnswers({ ...answers, [questionId]: value });
    setAnswers(nextAnswers);
    setError('');
  };

  const resolveImageSrc = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http') || imagePath.startsWith('/')) {
      return imagePath;
    }
    return `/docs/${imagePath}`;
  };

  const getOptionText = (questionId, optionId) => {
    const question = questionsData?.questions.find((item) => item.id === questionId);
    if (!question) return optionId;
    if (question.type === 'range') return `${optionId} ${question.unit || ''}`.trim();
    if (Array.isArray(optionId)) {
      return optionId
        .map((item) => question.options.find((option) => option.id === item)?.text || item)
        .join(', ');
    }
    return question.options.find((option) => option.id === optionId)?.text || optionId;
  };

  const handleNext = () => {
    const currentQuestion = questionsData.questions[currentQuestionIndex];
    if (!hasAnswer(currentQuestion, answers)) {
      setError('Please choose an answer before moving forward.');
      return;
    }

    setError('');
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questionsData.questions.length) {
      setCurrentQuestionIndex(nextIndex);
    } else {
      submitAnswers(answers);
    }
  };

  const handleBack = () => {
    setError('');
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleReset = () => {
    setAnswers(getDefaultAnswers(questionsData));
    setResult(null);
    setError('');
    setView('landing');
    setCurrentQuestionIndex(0);
  };

  if (loading) {
    return (
      <div className="card">
        <p>Loading questions...</p>
      </div>
    );
  }

  if (!questionsData) {
    return (
      <div className="card">
        <p>Question data unavailable.</p>
      </div>
    );
  }

  const currentQuestion = questionsData.questions[currentQuestionIndex];

  return (
    <div className={`app-shell view-${view}`}>
      <LogoTransition compact={view !== 'landing'} />
      {view === 'landing' && <LandingPage onStart={() => setView('questions')} />}

      {view === 'questions' && (
        <QuizPage
          answers={answers}
          currentQuestion={currentQuestion}
          currentQuestionIndex={currentQuestionIndex}
          error={error}
          getDisabledReason={getDisabledReason}
          onBack={handleBack}
          onNext={handleNext}
          onReset={handleReset}
          onSelect={handleSelect}
          onSubmit={() => submitAnswers(answers)}
          questionsCount={questionsData.questions.length}
          getEffectiveRangeMax={getEffectiveRangeMax}
          resolveImageSrc={resolveImageSrc}
        />
      )}

      {view === 'result' && (
        <ResultPage
          answers={answers}
          getOptionText={getOptionText}
          onEditAnswers={() => setView('questions')}
          onReset={handleReset}
          questions={questionsData.questions}
          resolveImageSrc={resolveImageSrc}
          result={result}
        />
      )}

      <div className="footer">Question logic is stored in docs/questions.json and can be updated by admin staff.</div>
    </div>
  );
}
