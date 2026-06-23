import { useRef, useState } from 'react';

export default function TooltipInfo({ content, label = 'Why is it important?' }) {
  const triggerRef = useRef(null);
  const [align, setAlign] = useState('center');

  if (!content) return null;

  const updateAlignment = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const popoverWidth = Math.min(340, window.innerWidth - 32);
    const center = rect.left + rect.width / 2;

    if (center - popoverWidth / 2 < 16) {
      setAlign('left');
    } else if (center + popoverWidth / 2 > window.innerWidth - 16) {
      setAlign('right');
    } else {
      setAlign('center');
    }
  };

  return (
    <span className={`tooltip-info tooltip-align-${align}`} onMouseEnter={updateAlignment}>
      <button
        className="tooltip-trigger"
        ref={triggerRef}
        type="button"
        aria-label={label}
        onFocus={updateAlignment}
      >
        ?
      </button>
      <span className="tooltip-popover" role="tooltip">
        <span className="tooltip-title">{label}</span>
        <span>{content}</span>
      </span>
    </span>
  );
}
