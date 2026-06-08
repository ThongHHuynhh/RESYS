import QuestionCard from '../components/QuestionCard.jsx';
import ProgressBar from '../components/ProgressBar.jsx';


export default function QuizPage({
  answers,
  currentQuestion,
  currentQuestionIndex,
  error,
  onBack,
  onNext,
  onReset,
  onSelect,
  onSubmit,
  questionsCount,
  resolveImageSrc,
}) {
  return (
    <>
      {/* <div className="card header">
        <h1>ABI Sales Configuration Wizard</h1>
        <p>Answer a few quick questions to recommend the best system configuration for your customer.</p>
      </div> */}
      <div className="landing page">
        <div className="quiz-page">
          <div className="quiz-logo">
            <img src="../../docs/images/abi-logo.png" alt="ABI Logo" />
          </div>
        </div>
      </div>
      <ProgressBar current={currentQuestionIndex + 1} total={questionsCount} />
      <QuestionCard
        answers={answers}
        currentQuestion={currentQuestion}
        currentQuestionIndex={currentQuestionIndex}
        onBack={onBack}
        onNext={onNext}
        onSelect={onSelect}
        questionsCount={questionsCount}
        resolveImageSrc={resolveImageSrc}
      />

      <div className="card">
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
    </>
  );
}
