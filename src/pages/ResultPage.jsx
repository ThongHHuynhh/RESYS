import AnswerSummary from '../components/AnswerSummary.jsx';

export default function ResultPage({
  answers,
  getOptionText,
  onEditAnswers,
  onReset,
  questions,
  resolveImageSrc,
  result,
}) {
  const alternativeRecommendations = result?.recommendations?.slice(1, 3) || [];

  return (
    <div>
      <div className="card header">
        <h1>{result?.exactMatch ? 'Recommended Configuration' : 'Closest Matching Configuration'}</h1>
        <p>
          {result?.exactMatch
            ? 'Your best match is shown below based on the answers in the database.'
            : 'A close recommendation is shown based on the available mapping rules.'}
        </p>
      </div>

      <div className="result-banner">
        {result?.image ? (
          <img src={resolveImageSrc(result.image)} alt={result.name} />
        ) : (
          <div>Your recommended configuration is ready below</div>
        )}
      </div>

      <div className="card result-card">
        {result ? (
          <>
            <h2>{result.name}</h2>
            <p>
              {result.description}
              {!result.exactMatch && (
                <span style={{ display: 'block', marginTop: '10px', color: '#475569' }}>
                  This recommendation is based on the closest available match.
                </span>
              )}
            </p>
            {result.sku && (
              <p>
                <strong>SKU:</strong> {result.sku}
              </p>
            )}
            <p>
              <strong>Fit score:</strong> {result.fitScore}%
            </p>
            <p>
              <strong>Criteria matched:</strong> {result.matchedCount}/{result.ruleCount} ({result.ruleMatchScore}%)
            </p>
          </>
        ) : (
          <p>No configuration matched. Please adjust your answers and try again.</p>
        )}
      </div>

      <AnswerSummary answers={answers} getOptionText={getOptionText} questions={questions} />

      {alternativeRecommendations.length > 0 && (
        <div className="card result-card">
          <h3>Other Recommendations</h3>
          <ul>
            {alternativeRecommendations.map((alt, index) => (
              <li key={`alt-${index}`} style={{ marginBottom: '16px' }}>
                <strong>{alt.result.name}</strong>
                <div>{alt.result.description}</div>
                <div style={{ color: '#475569', marginTop: '4px' }}>
                  Fit score: {alt.fitScore}% - Criteria matched: {alt.matchedCount}/{alt.ruleCount}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="actions">
        <button className="button primary" type="button" onClick={onEditAnswers}>
          Edit Answers
        </button>
        <button className="button secondary" type="button" onClick={onReset}>
          Start Over
        </button>
      </div>
    </div>
  );
}
