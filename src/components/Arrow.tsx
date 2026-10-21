/** Thin up-right arrow drawn as lines, so phones don't swap it for an emoji. */
export default function Arrow({ size = "0.9em", className = "" }: { size?: number | string; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`inline-block flex-none align-[-0.1em] ${className}`}
    >
      <path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" />
    </svg>
  );
}
