interface ProgressBarProps {
  value: number;
  tone?: "primary" | "warning" | "navy";
  label?: string;
}

const tones = {
  primary: "bg-primary",
  warning: "bg-accent-dark",
  navy: "bg-navy",
};

export function ProgressBar({
  value,
  tone = "primary",
  label,
}: ProgressBarProps) {
  return (
    <div
      className="mt-1.5 h-2 overflow-hidden rounded-full bg-pale"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `Progress: ${value} percent`}
    >
      <div
        className={`h-full rounded-full transition-all ${tones[tone]}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
