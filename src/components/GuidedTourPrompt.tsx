import type { ReactNode } from "react";

export default function GuidedTourPrompt({
  step,
  total,
  title,
  children,
  onSkip,
  placement = "default",
}: {
  step: number;
  total: number;
  title: string;
  children: ReactNode;
  onSkip: () => void;
  placement?: "default" | "start";
}) {
  return (
    <aside
      className={`guided-tour-prompt${placement === "start" ? " guided-tour-start-prompt" : ""}`}
      aria-live="polite"
    >
      <div>
        <span className="guided-tour-progress">
          操作教學 {step}／{total}
        </span>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
      <button type="button" className="text-button" onClick={onSkip}>
        結束教學
      </button>
    </aside>
  );
}
