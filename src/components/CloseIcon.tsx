/**
 * The × for every close and delete button. Drawn as two lines, so it sits exactly in the centre; a typed "×"
 * sits off-centre in most fonts. Rule: never type "×" in a button, use this (in a button that centres it).
 */
export default function CloseIcon({ size = 12, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
      className={`block flex-none ${className}`}
    >
      <path d="M2 2l8 8M10 2L2 10" />
    </svg>
  );
}
