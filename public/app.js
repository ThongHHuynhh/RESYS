const { useState, useEffect } = React;

function App() {
  const [questionsData, setQuestionsData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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

  const handleSelect = (questionId, optionId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = () => {
    if (!questionsData) return;
    const missing = questionsData.questions.filter((q) => !answers[q.id]);
    if (missing.length) {
      setError('Please answer all questions before evaluating.');
      setResult(null);
      return;
    }
    setError('');
    fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setResult(data.result);
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

  const handleReset = () => {
    setAnswers({});
    setResult(null);
    setError('');
  };

  if (loading) {
    return React.createElement('div', { className: 'card' }, React.createElement('p', null, 'Loading questions...'));
  }

  if (!questionsData) {
    return React.createElement('div', { className: 'card' }, React.createElement('p', null, 'Question data unavailable.'));
  }

  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      { className: 'card header' },
      React.createElement('h1', null, 'RESYS Sales Configuration Wizard'),
      React.createElement('p', null, 'Answer a few quick questions to recommend the best system configuration for your customer.'),
    ),
    questionsData.questions.map((question) =>
      React.createElement(
        'div',
        { key: question.id, className: 'card question' },
        React.createElement('div', { className: 'question-title' }, question.text),
        React.createElement(
          'div',
          { className: 'options' },
          question.options.map((option) => {
            const selected = answers[question.id] === option.id;
            return React.createElement(
              'button',
              {
                key: option.id,
                className: `option-button${selected ? ' selected' : ''}`,
                type: 'button',
                onClick: () => handleSelect(question.id, option.id),
              },
              React.createElement('div', null, option.text),
              option.image && React.createElement('img', { className: 'option-image', src: option.image, alt: option.text }),
            );
          }),
        ),
      ),
    ),
    React.createElement(
      'div',
      { className: 'card' },
      error && React.createElement('p', { className: 'status', style: { color: '#b91c1c' } }, error),
      React.createElement(
        'div',
        { className: 'actions' },
        React.createElement('button', { className: 'button primary', type: 'button', onClick: handleSubmit }, 'Find Best Configuration'),
        React.createElement('button', { className: 'button secondary', type: 'button', onClick: handleReset }, 'Reset Answers'),
      ),
      result && React.createElement(
        'div', { className: 'result-card' },
        React.createElement('h2', null, 'Recommended Configuration'),
        React.createElement('p', null, React.createElement('strong', null, result.name)),
        React.createElement('p', null, result.description),
        result.sku && React.createElement('p', null, React.createElement('strong', null, 'SKU:'), ' ', result.sku),
      ),
    ),
    React.createElement('div', { className: 'footer' }, 'Question logic is stored in docs/questions.json and can be updated by admin staff.'),
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
