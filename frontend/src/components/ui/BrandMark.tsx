/**
 * Urban Gear's mark. The purchased template ships a food logo, which this replaces;
 * swap the inner icon for a real logo image when one exists.
 */
export function BrandMark({
  size = 40,
  tone = "primary",
  className = "",
}: {
  size?: number;
  tone?: "primary" | "light";
  className?: string;
}) {
  const shell = tone === "primary" ? "bg-primary text-white" : "bg-white text-primary";
  return (
    <span
      className={`d-inline-flex align-items-center justify-content-center rounded-pill ${shell} ${className}`}
      style={{ width: size, height: size, flex: "none" }}
      role="img"
      aria-label="Urban Gear"
    >
      <span className="mdi mdi-bag-personal-outline" style={{ fontSize: Math.round(size * 0.52) }} />
    </span>
  );
}
