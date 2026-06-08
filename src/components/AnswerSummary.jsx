export default function AnswerSummary({ answers, getOptionText, questions }) {
  return (
    <div className="result-card">
      <h3>Your Selected Answers</h3>
      <ul>
        {questions.map((question) => (
          <li key={question.id}>
            <strong>{question.text}: </strong>
            {getOptionText(question.id, answers[question.id])}
          </li>
        ))}
      </ul>
    </div>
  );
}
