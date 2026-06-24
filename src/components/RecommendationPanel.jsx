export default function RecommendationPanel({ result }) {
  if (!result) {
    return (
      <section className="recommendation-panel">
        <p>No configuration matched. Please adjust your answers and try again.</p>
      </section>
    );
  }

  return (
    <section className="recommendation-panel">
      <div className="recommendation-eyebrow">{result.exactMatch ? 'Best match' : 'Closest match'}</div>
      <div className="recommendation-heading">
        <div>
          <h2>{result.name}</h2>
          <p>{result.description}</p>
        </div>
        <div className="fit-score">
          <strong>{result.fitScore}%</strong>
          <span>Fit score</span>
        </div>
      </div>

      <div className="recommendation-grid">
        {result.sku && (
          <div>
            <span>SKU</span>
            <strong>{result.sku}</strong>
          </div>
        )}
        {result.numberOfRobots && (
          <div>
            <span>Robot layout</span>
            <strong>{result.numberOfRobots}</strong>
          </div>
        )}
        {result.scoringPatternComplexity && (
          <div>
            <span>Pattern complexity</span>
            <strong>{result.scoringPatternComplexity}</strong>
          </div>
        )}
        <div>
          <span>Criteria matched</span>
          <strong>
            {result.matchedCount}/{result.ruleCount}
          </strong>
        </div>
      </div>

      {result.scopeLimitations?.length > 0 && (
        <div className="scope-list">
          <h3>Scope & limitations</h3>
          <ul>
            {result.scopeLimitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {result.matchedRules?.length > 0 && (
        <div className="scope-list">
          <h3>Why this matched</h3>
          <ul>
            {result.matchedRules.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {result.capacityNotes?.length > 0 && (
        <div className="scope-list">
          <h3>Capacity notes</h3>
          <ul>
            {result.capacityNotes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
