/**
 * A note on the drawing. Attention and error notes use redline, the colour architects use for corrections;
 * information is a plain ruled box and success uses the done green. One rule on every side, never a thick side stripe.
 */
type Tone = "info" | "success" | "attention" | "error";

const TONES: Record<Tone, string> = {
  info: "border-rule-strong bg-ground",
  success: "border-done bg-done-wash",
  attention: "border-redline/50 bg-redline-wash",
  error: "border-redline bg-redline-wash",
};

export function Note({
  tone = "info",
  title,
  children,
  action,
  role,
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  role?: "alert" | "status";
}) {
  return (
    <div role={role ?? (tone === "error" ? "alert" : undefined)} className={`flex flex-col gap-2 rounded-sm border px-4 py-3 ${TONES[tone]}`}>
      {title && <p className="text-lead font-semibold text-ink">{title}</p>}
      {children && <div className="text-body text-ink">{children}</div>}
      {action && <div>{action}</div>}
    </div>
  );
}
