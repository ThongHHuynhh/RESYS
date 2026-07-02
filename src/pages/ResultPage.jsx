import AnswerSummary from '../components/AnswerSummary.jsx';
import ImageFrame from '../components/ImageFrame.jsx';
import RecommendationPanel from '../components/RecommendationPanel.jsx';

export default function ResultPage({
  answers,
  getOptionText,
  onEditAnswers,
  onReset,
  questions,
  resolveImageSrc,
  result,
}) {
  const alternativeRecommendations = (result?.recommendations || [])
    .slice(1)
    .filter((recommendation) => recommendation.available && recommendation.fitScore >= 48)
    .slice(0, 2);

  return (
    <main className="result-page">
      <div className="card header result-header">
        <h1>{result?.exactMatch ? 'Recommended Configuration' : 'Closest Matching Configuration'}</h1>
        <p>
          {result?.exactMatch
            ? 'Your best match is shown below based on the answers in the database.'
            : 'A close recommendation is shown based on the available mapping rules.'}
        </p>
      </div>

      <div className="result-banner">
        {result?.image ? (
          <ImageFrame alt={result.name} src={resolveImageSrc(result.image)} variant="banner" />
        ) : (
          <div>Your recommended configuration is ready below</div>
        )}
      </div>

      <RecommendationPanel result={result} />

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
    </main>
  );
}
