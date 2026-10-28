import { useEffect, useState } from "react";
import type { GestureState } from "@/lib/teleprompter/gestures/types";

interface GestureIndicatorProps {
  state: GestureState;
  visible: boolean;
}

const STATE_COLORS: Record<GestureState, string> = {
  idle: "bg-blue-500",
  action: "bg-green-500",
  blocked: "bg-red-500",
  paused: "bg-yellow-400",
};

export function GestureIndicator({ state, visible }: GestureIndicatorProps) {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    setShow(visible);
  }, [visible]);

  if (!show) return null;

  return (
    <div
      className="fixed top-4 left-4 flex items-center gap-2 rounded-full px-3 py-1.5 backdrop-blur-sm"
      style={{ zIndex: 9999, backgroundColor: "rgba(0,0,0,0.7)" }}
      aria-live="polite"
    >
      <div className={`h-4 w-4 rounded-full transition-colors duration-200 ${STATE_COLORS[state]}`} />
      <span className="text-xs font-medium text-white">
        {state === "idle" && "Mão detectada"}
        {state === "action" && "Ação realizada"}
        {state === "blocked" && "Sem página"}
        {state === "paused" && "Pausado (mão fechada)"}
      </span>
    </div>
  );
}
