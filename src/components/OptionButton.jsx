import ImageFrame from './ImageFrame.jsx';

export default function OptionButton({
  display = 'list',
  disabledReason,
  imageSrc,
  option,
  selected,
  onSelect,
}) {
  const isImage = display === 'image';
  const className = `${isImage ? 'option-image-card' : 'option-button'}${selected ? ' selected' : ''}${
    disabledReason ? ' disabled' : ''
  }`;

  return (
    <button
      className={className}
      type="button"
      aria-disabled={disabledReason ? 'true' : 'false'}
      title={disabledReason || option.text}
      onClick={() => onSelect(option)}
    >
      {isImage && (
        <ImageFrame alt="" src={imageSrc} variant="option" />
      )}
      <span className="option-copy">
        <span>{option.text}</span>
        {option.tags?.length > 0 && (
          <span className="option-tags">
            {option.tags.map((tag) => (
              <span className="option-tag" key={tag}>
                {tag}
              </span>
            ))}
          </span>
        )}
        {disabledReason && <span className="disabled-reason">{disabledReason}</span>}
      </span>
    </button>
  );
}
