import ImageFrame from './ImageFrame.jsx';
import OptionButton from './OptionButton.jsx';
import TooltipInfo from './TooltipInfo.jsx';

export default function QuestionCard({
  answers,
  currentQuestion,
  currentQuestionIndex,
  getDisabledReason,
  onBack,
  onNext,
  onSelect,
  questionsCount,
  resolveImageSrc,
}) {
  const selectedAnswer = answers[currentQuestion.id];
  const isMulti = currentQuestion.type === 'multi';
  const isRange = currentQuestion.type === 'range';
  const display = currentQuestion.display || (currentQuestion.type === 'single' ? 'image' : 'list');
  const rangeValue = selectedAnswer ?? currentQuestion.defaultValue ?? currentQuestion.min;
  const clampRangeValue = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return currentQuestion.min;
    return Math.min(currentQuestion.max, Math.max(currentQuestion.min, numericValue));
  };

  const isSelected = (optionId) => {
    if (Array.isArray(selectedAnswer)) return selectedAnswer.includes(optionId);
    return selectedAnswer === optionId;
  };

  const hasAnswer = () => {
    if (Array.isArray(selectedAnswer)) return selectedAnswer.length > 0;
    return selectedAnswer !== undefined && selectedAnswer !== null && selectedAnswer !== '';
  };

  return (
    <section className="card question">
      <div className="question-step">
        Question {currentQuestionIndex + 1} of {questionsCount}
      </div>

      <div className="question-heading">
        <h1>{currentQuestion.text}</h1>
      </div>

      {currentQuestion.image && (
        <ImageFrame
          alt={currentQuestion.text}
          className="question-image"
          src={resolveImageSrc(currentQuestion.image)}
          variant="question"
        />
      )}

      {isRange ? (
        <div className="range-card">
          <div className="range-value-row">
            <label className="range-entry">
              <span>Maximum rate</span>
              <input
                aria-label={`${currentQuestion.text} value`}
                max={currentQuestion.max}
                min={currentQuestion.min}
                step={currentQuestion.step || 1}
                type="number"
                value={rangeValue}
                onBlur={(event) => onSelect(currentQuestion.id, clampRangeValue(event.target.value))}
                onChange={(event) => onSelect(currentQuestion.id, event.target.value)}
              />
            </label>
            <div className="range-value">
              <strong>{rangeValue}</strong>
              <span>{currentQuestion.unit}</span>
            </div>
          </div>
          <input
            aria-label={currentQuestion.text}
            className="range-input"
            max={currentQuestion.max}
            min={currentQuestion.min}
            step={currentQuestion.step || 1}
            type="range"
            value={clampRangeValue(rangeValue)}
            onChange={(event) => onSelect(currentQuestion.id, Number(event.target.value))}
          />
          <div className="range-labels">
            <span>
              {currentQuestion.min} {currentQuestion.unit}
            </span>
            <span>
              {currentQuestion.max} {currentQuestion.unit}
            </span>
          </div>
        </div>
      ) : (
        <div className={`option-grid ${display === 'image' ? 'image-options' : 'list-options'}`}>
          {currentQuestion.options.map((option) => {
            const disabledReason = getDisabledReason(currentQuestion.id, option.id);

            return (
              <div className="option-shell" key={option.id}>
                <OptionButton
                  disabledReason={disabledReason}
                  display={display}
                  imageSrc={option.image ? resolveImageSrc(option.image) : null}
                  option={option}
                  selected={isSelected(option.id)}
                  onSelect={() => {
                    if (disabledReason) return;
                    onSelect(currentQuestion.id, option.id, { multi: isMulti });
                  }}
                />
                <TooltipInfo content={option.info || currentQuestion.info} label={`Why choose ${option.text}?`} />
              </div>
            );
          })}
        </div>
      )}

      <div className="actions nav-buttons">
        <button className="button secondary" type="button" disabled={currentQuestionIndex === 0} onClick={onBack}>
          Back
        </button>
        <button className="button primary" type="button" onClick={onNext} disabled={!hasAnswer()}>
          {currentQuestionIndex === questionsCount - 1 ? 'Submit' : 'Next'}
        </button>
      </div>
    </section>
  );
}
