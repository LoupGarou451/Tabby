// Tabby cat face with receipt-line stripes and a torn-receipt chin.
// Same artwork as public/logo.svg and the splash in index.html.
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      className={className}
      role="img"
      aria-label="Tabby"
    >
      <g
        stroke="var(--logo-ink)"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path fill="var(--logo-orange)" d="M22 104V58L17 12l31 21q16-5 32 0l31-21-5 46v46" />
        <path
          fill="var(--logo-paper)"
          d="M22 78h84v26l-7 7-7-7-7 7-7-7-7 7-7-7-7 7-7-7-7 7-7-7-7 7-7-7z"
        />
        <path fill="none" d="M50 40h28M45 49h37M48 58h18m8 0h7" />
        {size >= 48 && (
          <path fill="none" d="M44 92H10m34 6-33 6m33-12-32-8M84 92h34m-34 6 33 6m-33-12 32-8" />
        )}
        <path fill="var(--logo-ink)" d="M59 84h10l-5 6z" />
        <path fill="none" d="M64 90q-3 7-9 5m9-5q3 7 9 5" />
      </g>
      <ellipse cx="46" cy="68" rx="5" ry="7" fill="var(--logo-ink)" />
      <ellipse cx="82" cy="68" rx="5" ry="7" fill="var(--logo-ink)" />
    </svg>
  )
}
