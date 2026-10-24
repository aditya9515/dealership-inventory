export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32">
          <path d="m5 23 6-14 5 10 5-10 6 14" />
        </svg>
      </span>
      <span>
        motorstock<span className="brand-dot">.</span>
      </span>
    </div>
  );
}
