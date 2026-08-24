// Shared helpers for the production-rate range question.

export function clampRange(value, min, max) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return min;
  return Math.min(max, Math.max(min, numericValue));
}

// True while the field is mid-edit: cleared, or holding something that is not a number yet.
// Those values are stored as typed so clamping cannot fight the keyboard; they are committed
// with clampRange on blur and before leaving the question.
export function isPendingRangeEntry(value) {
  if (value === '' || value === null || value === undefined) return true;
  return !Number.isFinite(Number(value));
}
