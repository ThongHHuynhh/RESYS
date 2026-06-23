export default function ImageFrame({ alt = '', className = '', src, variant = 'option' }) {
  return (
    <span className={`image-frame image-frame-${variant} ${className}`.trim()}>
      {src ? <img src={src} alt={alt} /> : <span className="image-frame-placeholder" />}
    </span>
  );
}
