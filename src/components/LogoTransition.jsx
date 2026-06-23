export default function LogoTransition({ compact = false }) {
  return (
    <div className={`logo-transition${compact ? ' compact' : ''}`} aria-label="ABI">
      <img src="/docs/images/abi-logo.png" alt="ABI Logo" />
    </div>
  );
}
