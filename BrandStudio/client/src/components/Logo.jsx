/** brandstudio mark — lock + C monogram */
export default function Logo({ size = 28, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ci-g" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0A84FF" />
          <stop offset="1" stopColor="#5E5CE6" />
        </linearGradient>
        <linearGradient id="ci-g2" x1="14" y1="12" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#ci-g)" fillOpacity="1" stroke="none" />
      {/* Lock body */}
      <rect x="16" y="22" width="16" height="13" rx="3" fill="url(#ci-g2)" />
      {/* Shackle */}
      <path
        d="M19 22v-4.5a5 5 0 0 1 10 0V22"
        stroke="url(#ci-g2)"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Keyhole */}
      <circle cx="24" cy="27.5" r="1.6" fill="#0A84FF" />
      <rect x="23.2" y="28.5" width="1.6" height="3.2" rx="0.6" fill="#0A84FF" />
    </svg>
  );
}
