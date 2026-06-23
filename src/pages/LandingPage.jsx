export default function LandingPage({ onStart }) {
  return (
    <main className="landing-page">
      <div className="landing-content">
        <p className="eyebrow">Katana II equipment configurator</p>
        {/* <h1>Find the right scoring setup for your customer.</h1> */}
        <p>
          Walk through support type, product behavior, tooling, production rate, and conveyor width to produce a
          recommendation from ABI's configurator logic.
        </p>
        <button className="button primary landing-start" type="button" onClick={onStart}>
          Start configurator
        </button>
        <span className="estimate">Estimated time: 2-3 minutes</span>
      </div>
    </main>
  );
}
