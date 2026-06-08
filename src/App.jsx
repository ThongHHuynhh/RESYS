import { useEffect, useState } from 'react';
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

  useEffect(() => {
    fetch('/api/questions')
      .then((response) => response.json())
      .then((data) => {
        setQuestionsData(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Unable to load question data.');
        setLoading(false);
      });
  }, []);

  const submitAnswers = (finalAnswers) => {
    if (!questionsData) return;

    const missing = questionsData.questions.filter((question) => !finalAnswers[question.id]);
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
          setResult({ ...data.bestMatch, recommendations: data.recommendations });
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
    const nextAnswers = { ...answers, [questionId]: optionId };
    setAnswers(nextAnswers);
    setError('');

    const lastIndex = questionsData.questions.length - 1;
    if (currentQuestionIndex < lastIndex) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      submitAnswers(nextAnswers);
    }
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
    return question?.options.find((option) => option.id === optionId)?.text || optionId;
  };

  const handleNext = () => {
    const currentQuestion = questionsData.questions[currentQuestionIndex];
    if (!answers[currentQuestion.id]) {
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
    setAnswers({});
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
    <div>
      {view === 'landing' && <LandingPage onStart={() => setView('questions')} />}

      {view === 'questions' && (
        <QuizPage
          answers={answers}
          currentQuestion={currentQuestion}
          currentQuestionIndex={currentQuestionIndex}
          error={error}
          onBack={handleBack}
          onNext={handleNext}
          onReset={handleReset}
          onSelect={handleSelect}
          onSubmit={() => submitAnswers(answers)}
          questionsCount={questionsData.questions.length}
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
