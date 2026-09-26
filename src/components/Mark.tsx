/* The Wavvon sunburst — 6 rounded triangles around a hexagonal centre gap.
 *
 * Geometry copied verbatim from the master vector (Wavvon-docs
 * `assets/icon.svg`); the rounding is a blur-plus-threshold filter rather than
 * real corner radii, so the polygons must keep their exact coordinates.
 *
 * The filter id is a constant. Several marks on one page therefore share it,
 * which is what we want: they are identical, and `url(#…)` resolves to the
 * first definition either way. */
const FILTER_ID = "wv-mark-round";

export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <filter id={FILTER_ID} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b" />
          <feColorMatrix
            in="b"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 18 -7"
            result="t"
          />
          <feComposite in="SourceGraphic" in2="t" operator="atop" />
        </filter>
      </defs>
      {[
        "53.46,52 89.46,52 71.46,83.18",
        "50,54 68,85.18 32,85.18",
        "46.54,52 28.54,83.18 10.54,52",
        "46.54,48 10.54,48 28.54,16.82",
        "50,46 32,14.82 68,14.82",
        "53.46,48 71.46,16.82 89.46,48",
      ].map((points) => (
        <polygon key={points} filter={`url(#${FILTER_ID})`} points={points} fill="var(--accent)" />
      ))}
    </svg>
  );
}
