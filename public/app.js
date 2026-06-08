const { useState, useEffect } = React;

function App() {
  const [questionsData, setQuestionsData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('landing');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);


  useEffect(() => {
    //call the back end route
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
  //Create function to submit answers to the back end for evaluation
  const submitAnswers = (finalAnswers) => {
    //if questions data is not loaded, return
    if (!questionsData) return;
    // checking for missing answers
    const missing = questionsData.questions.filter((q) => !finalAnswers[q.id]);
    if (missing.length) {
      setError('Please answer all questions before evaluating.');
      // Clear previous result if any
      setResult(null);
      return;
    }
    // Clear any previous error
    setError('');
    fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: finalAnswers }),
    })
      //Convert response to json 
      //response: raw http
      //data: the json body of the response
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // copy bestMatch and recommendations to result state
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

  const landingPage = React.createElement(
    'div',
    { className: 'landing page' },
    React.createElement(
      'div',
      { className: 'landing-logo', 'aria-label': 'ABI' },
      React.createElement('span', null, 'ABI'),
    ),
    React.createElement('h1', null, 'Welcome to the ABI Configuration Wizard'),
    React.createElement('p', null, 'Find the best system configuration for your customer.'),
    React.createElement(
      'button',
      { className: 'button landing', 
        type: 'button', 
        onClick: () => setView('questions') },
      'Start Here',
    ),
    React.createElement('p', null, 'Estimate time to complete: 2-3 minutes'),
  );
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
    // If the path is already absolute (e.g., starts with http or /), return as is. Otherwise, prepend the docs path.
    if (imagePath.startsWith('http') || imagePath.startsWith('/')) {
      return imagePath;
    }
    return `/docs/${imagePath}`;
  };

  const getOptionText = (questionId, optionId) => {
    const question = questionsData?.questions.find((q) => q.id === questionId);
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

  const handleSubmit = () => {
    submitAnswers(answers);
  };

  const handleReset = () => {
    setAnswers({});
    setResult(null);
    setError('');
    setView('landing');
    setCurrentQuestionIndex(0);
  };

  if (loading) {
    return React.createElement('div', { className: 'card' }, React.createElement('p', null, 'Loading questions...'));
  }

  if (!questionsData) {
    return React.createElement('div', { className: 'card' }, React.createElement('p', null, 'Question data unavailable.'));
  }

  const currentQuestion = questionsData.questions[currentQuestionIndex];
  const selectedOption = answers[currentQuestion.id];

  const questionCards = React.createElement(
    'div',
    { className: 'card question' },
    //Question progress number
    React.createElement('div', { className: 'question-step' }, `Question ${currentQuestionIndex + 1} of ${questionsData.questions.length}`),
    currentQuestion.image && React.createElement('img', { className: 'question-image', src: resolveImageSrc(currentQuestion.image), alt: currentQuestion.text }),
    React.createElement('div', { className: 'question-title' }, currentQuestion.text),
    React.createElement(
      'div',
      { className: 'option-image-grid' },
      currentQuestion.options.map((option) => {
        const selected = selectedOption === option.id;
        return React.createElement(
          'button',
          {
            key: option.id,
            className: `option-image-card${selected ? ' selected' : ''}`,
            type: 'button',
            onClick: () => handleSelect(currentQuestion.id, option.id),
          },
          option.image
            ? React.createElement('img', { src: resolveImageSrc(option.image), alt: option.text })
            : React.createElement('div', { style: { height: '180px', background: '#f8fafc' } }),
        );
      }),
    ),
    React.createElement(
      'div',
      { className: 'option-buttons' },
      currentQuestion.options.map((option) => {
        const selected = selectedOption === option.id;
        return React.createElement(
          'button',
          {
            key: `button-${option.id}`,
            className: `option-button${selected ? ' selected' : ''}`,
            type: 'button',
            onClick: () => handleSelect(currentQuestion.id, option.id),
          },
          option.text,
        );
      }),
    ),
    React.createElement(
      'div',
      { className: 'actions nav-buttons' },
      React.createElement('button', { className: 'button secondary', type: 'button', disabled: currentQuestionIndex === 0, onClick: handleBack }, 'Back'),
      React.createElement('button', { className: 'button primary', type: 'button', onClick: handleNext, disabled: !selectedOption }, currentQuestionIndex === questionsData.questions.length - 1 ? 'Submit' : 'Next'),
    ),
  );

  const answerSummary = React.createElement(
    'div',
    { className: 'result-card' },
    React.createElement('h3', null, 'Your Selected Answers'),
    React.createElement(
      'ul',
      null,
      questionsData.questions.map((question) =>
        React.createElement(
          'li',
          { key: question.id },
          React.createElement('strong', null, question.text, ': '),
          getOptionText(question.id, answers[question.id]),
        ),
      ),
    ),
  );

  const alternativeRecommendations = result?.recommendations?.slice(1, 3) || [];

  const resultPage = React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      { className: 'card header' },
      React.createElement('h1', null, result?.exactMatch ? 'Recommended Configuration' : 'Closest Matching Configuration'),
      React.createElement(
        'p',
        null,
        result?.exactMatch
          ? 'Your best match is shown below based on the answers in the database.'
          : 'A close recommendation is shown based on the available mapping rules.',
      ),
    ),
    React.createElement(
      'div',
      { className: 'result-banner' },
      result?.image
        ? React.createElement('img', { src: resolveImageSrc(result.image), alt: result.name })
        : React.createElement('div', null, 'Your recommended configuration is ready below'),
    ),
    React.createElement(
      'div',
      { className: 'card result-card' },
      result
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement('h2', null, result.name),
            React.createElement(
              'p',
              null,
              result.description,
              !result.exactMatch && React.createElement('span', { style: { display: 'block', marginTop: '10px', color: '#475569' } }, 'This recommendation is based on the closest available match.'),
            ),
            result.sku && React.createElement('p', null, React.createElement('strong', null, 'SKU:'), ' ', result.sku),
            React.createElement(
              'p',
              null,
              React.createElement('strong', null, 'Fit score:'),
              ' ',
              `${result.fitScore}%`,
            ),
            React.createElement(
              'p',
              null,
              React.createElement('strong', null, 'Criteria matched:'),
              ' ',
              `${result.matchedCount}/${result.ruleCount} (${result.ruleMatchScore}%)`,
            ),
          )
        : React.createElement('p', null, 'No configuration matched. Please adjust your answers and try again.'),
    ),
    answerSummary,
    alternativeRecommendations.length > 0 && React.createElement(
      'div',
      { className: 'card result-card' },
      React.createElement('h3', null, 'Other Recommendations'),
      React.createElement(
        'ul',
        null,
        alternativeRecommendations.map((alt, index) =>
          React.createElement(
            'li',
            { key: `alt-${index}`, style: { marginBottom: '16px' } },
            React.createElement('strong', null, alt.result.name),
            React.createElement('div', null, alt.result.description),
            React.createElement('div', { style: { color: '#475569', marginTop: '4px' } }, `Fit score: ${alt.fitScore}% — Criteria matched: ${alt.matchedCount}/${alt.ruleCount}`),
          ),
        ),
      ),
    ),
    React.createElement(
      'div',
      { className: 'actions' },
      React.createElement('button', { className: 'button primary', type: 'button', onClick: () => setView('questions') }, 'Edit Answers'),
      React.createElement('button', { className: 'button secondary', type: 'button', onClick: handleReset }, 'Start Over'),
    ),
  );

  const quizPage = React.createElement(
    React.Fragment,
    null,
    React.createElement(
      'div',
      { className: 'card header' },
      React.createElement('h1', null, 'ABI Sales Configuration Wizard'),
      React.createElement('p', null, 'Answer a few quick questions to recommend the best system configuration for your customer.'),
    ),
    questionCards,
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
    ),
  );

  let page = landingPage;
  if (view === 'questions') {
    page = quizPage;
  } else if (view === 'result') {
    page = resultPage;
  }

  return React.createElement(
    'div',
    null,
    page,
    React.createElement('div', { className: 'footer' }, 'Question logic is stored in docs/questions.json and can be updated by admin staff.'),
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
