/**
 * The ImmXrsive "Crossing" mark: two light blades (flare / ion) crossing inside an octagonal gate.
 * Decorative; the surrounding link carries the accessible name.
 */
export function BrandMark({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false">
    <path d="M14.4 2h11.2L38 14.4v11.2L25.6 38H14.4L2 25.6V14.4Z" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.4" />
    <path d="m11 11 18 18" stroke="var(--flare, #ff7a59)" strokeWidth="4.2" strokeLinecap="round" />
    <path d="M29 11 11 29" stroke="var(--ion, #8ef0d4)" strokeWidth="4.2" strokeLinecap="round" />
    <circle cx="20" cy="20" r="2.2" fill="var(--void, #05060a)" stroke="currentColor" strokeWidth="1" />
  </svg>;
}
