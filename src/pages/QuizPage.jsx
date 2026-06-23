import QuestionCard from '../components/QuestionCard.jsx';
import ProgressBar from '../components/ProgressBar.jsx';


export default function QuizPage({
  answers,
  currentQuestion,
  currentQuestionIndex,
  error,
  getDisabledReason,
  onBack,
  onNext,
  onReset,
  onSelect,
  onSubmit,
  questionsCount,
  resolveImageSrc,
}) {
  return (
    <main className="quiz-workspace">
      <ProgressBar current={currentQuestionIndex + 1} total={questionsCount} />
      <QuestionCard
        answers={answers}
        currentQuestion={currentQuestion}
        currentQuestionIndex={currentQuestionIndex}
        getDisabledReason={getDisabledReason}
        onBack={onBack}
        onNext={onNext}
        onSelect={onSelect}
        questionsCount={questionsCount}
        resolveImageSrc={resolveImageSrc}
      />

      <div className="card quiz-footer-card">
        {error && (
          <p className="status" style={{ color: '#b91c1c' }}>
            {error}
          </p>
        )}
        <div className="actions">
          <button className="button primary" type="button" onClick={onSubmit}>
            Find Best Configuration
          </button>
          <button className="button secondary" type="button" onClick={onReset}>
            Reset Answers
          </button>
        </div>
      </div>
    </main>
  );
}
