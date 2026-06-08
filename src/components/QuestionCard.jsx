export default function QuestionCard({
  answers,
  currentQuestion,
  currentQuestionIndex,
  onBack,
  onNext,
  onSelect,
  questionsCount,
  resolveImageSrc,
}) {
  const selectedOption = answers[currentQuestion.id];

  return (
    <div className="card question">
      <div className="question-step">
        Question {currentQuestionIndex + 1} of {questionsCount}
      </div>

      {currentQuestion.image && (
        <img className="question-image" src={resolveImageSrc(currentQuestion.image)} alt={currentQuestion.text} />
      )}

      <div className="question-title">{currentQuestion.text}</div>

      <div className="option-image-grid">
        {currentQuestion.options.map((option) => {
          const selected = selectedOption === option.id;

          return (
            <button
              key={option.id}
              className={`option-image-card${selected ? ' selected' : ''}`}
              type="button"
              onClick={() => onSelect(currentQuestion.id, option.id)}
            >
              {option.image ? (
                <img src={resolveImageSrc(option.image)} alt={option.text} />
              ) : (
                <div style={{ height: '180px', background: '#f8fafc' }} />
              )}
            </button>
          );
        })}
      </div>

      <div className="option-buttons">
        {currentQuestion.options.map((option) => {
          const selected = selectedOption === option.id;

          return (
            <button
              key={`button-${option.id}`}
              className={`option-button${selected ? ' selected' : ''}`}
              type="button"
              onClick={() => onSelect(currentQuestion.id, option.id)}
            >
              {option.text}
            </button>
          );
        })}
      </div>

      <div className="actions nav-buttons">
        <button className="button secondary" type="button" disabled={currentQuestionIndex === 0} onClick={onBack}>
          Back
        </button>
        <button className="button primary" type="button" onClick={onNext} disabled={!selectedOption}>
          {currentQuestionIndex === questionsCount - 1 ? 'Submit' : 'Next'}
        </button>
      </div>
    </div>
  );
}
