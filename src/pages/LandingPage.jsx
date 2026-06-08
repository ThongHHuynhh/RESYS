export default function LandingPage({ onStart }) {
  return (
    <div className="landing page">
      <div className="quiz-page">
        <div className="quiz-logo">
          <img src="../../docs/images/abi-logo.png" alt="ABI Logo" />
        </div>
      </div>
      <h1>Welcome to the ABI Configuration Wizard</h1>
      <p>Find the best system configuration for your customer.</p>
      <button className="button landing" type="button" onClick={onStart}>
        Start Here
      </button>
      <footer>Estimate time to complete: 2-3 minutes</footer>
    </div>
  );
}
