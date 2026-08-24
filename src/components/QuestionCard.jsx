import { clampRange } from '../lib/rangeValue.js';
import ImageFrame from './ImageFrame.jsx';
import OptionButton from './OptionButton.jsx';
import TooltipInfo from './TooltipInfo.jsx';

export default function QuestionCard({
  answers,
  currentQuestion,
  currentQuestionIndex,
  getEffectiveRangeMax,
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
  const showQuestionInfo = currentQuestion.showInfoOnQuestion === true;
  const effectiveMax = getEffectiveRangeMax?.(currentQuestion, answers) ?? currentQuestion.max;
  const rangeValue = selectedAnswer ?? currentQuestion.defaultValue ?? currentQuestion.min;
  const waterjetControl = currentQuestion.waterjetNozzleControl;
  const selectedTools = answers[currentQuestion.capacityQuestionId];
  const hasWaterjet = Array.isArray(selectedTools) ? selectedTools.includes('waterjet_tool') : selectedTools === 'waterjet_tool';
  const waterjetNozzles = Number(waterjetControl?.fixedValue || answers[waterjetControl?.answerId] || waterjetControl?.defaultValue || 1);
  const clampRangeValue = (value) => clampRange(value, currentQuestion.min, effectiveMax);
  // Keep the raw keystrokes in the field while typing. Clamping on every change snapped a
  // cleared field back to the minimum, so the next digits were appended to it (20 + 600).
  const typedRangeValue = rangeValue === '' ? '' : String(rangeValue);
  const sliderRangeValue = typedRangeValue === '' ? currentQuestion.min : clampRangeValue(typedRangeValue);

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
        {showQuestionInfo && (
          <TooltipInfo content={currentQuestion.info} label={`About question ${currentQuestionIndex + 1}`} />
        )}
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
                max={effectiveMax}
                min={currentQuestion.min}
                step={currentQuestion.step || 1}
                type="number"
                value={typedRangeValue}
                onBlur={(event) => onSelect(currentQuestion.id, clampRangeValue(event.target.value))}
                onChange={(event) => onSelect(currentQuestion.id, event.target.value)}
              />
            </label>
            {hasWaterjet && waterjetControl && !waterjetControl.hideControl && (
              <label className="range-entry range-entry-compact">
                <span>{waterjetControl.label}</span>
                <select
                  aria-label={waterjetControl.label}
                  value={waterjetNozzles}
                  onChange={(event) => onSelect(waterjetControl.answerId, Number(event.target.value))}
                >
                  {Array.from({ length: waterjetControl.max - waterjetControl.min + 1 }, (_, index) => {
                    const nozzleCount = waterjetControl.min + index;
                    const capacity = Math.min(
                      waterjetControl.maxCutsPerMinute,
                      nozzleCount * waterjetControl.perNozzleCutsPerMinute,
                    );
                    return (
                      <option key={nozzleCount} value={nozzleCount}>
                        {nozzleCount} - {capacity} {currentQuestion.unit}
                      </option>
                    );
                  })}
                </select>
              </label>
            )}
            <div className="range-value">
              <strong>{typedRangeValue === '' ? '--' : typedRangeValue}</strong>
              <span>{currentQuestion.unit}</span>
            </div>
          </div>
          <input
            aria-label={currentQuestion.text}
            className="range-input"
            max={effectiveMax}
            min={currentQuestion.min}
            step={currentQuestion.step || 1}
            type="range"
            value={sliderRangeValue}
            onChange={(event) => onSelect(currentQuestion.id, Number(event.target.value))}
          />
          <div className="range-labels">
            <span>
              {currentQuestion.min} {currentQuestion.unit}
            </span>
            <span>
              {effectiveMax} {currentQuestion.unit}
            </span>
          </div>
          {currentQuestion.capacityByTool && (
            <p className="range-note">
              Maximum rate is limited by the selected scoring tool.
              {hasWaterjet && ` Waterjet capacity is based on a ${waterjetNozzles}-nozzle configuration.`}
            </p>
          )}
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
                {!showQuestionInfo && (
                  <TooltipInfo content={option.info || currentQuestion.info} label={`Why choose ${option.text}?`} />
                )}
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
