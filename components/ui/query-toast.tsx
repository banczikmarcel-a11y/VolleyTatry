"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type QueryToastProps = {
  error?: string;
  message?: string;
};

export function QueryToast({ error, message }: QueryToastProps) {
  const text = error ?? message;
  const [visible, setVisible] = useState(Boolean(text));

  useEffect(() => {
    setVisible(Boolean(text));

    if (!text) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setVisible(false);
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [text]);

  if (!text || !visible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
      <div
        className={cn(
          "pointer-events-auto max-w-xl rounded-[8px] px-4 py-3 text-sm font-black shadow-panel",
          error ? "bg-red-600 text-white" : "bg-court-ink text-court-mint"
        )}
      >
        {text}
      </div>
    </div>
  );
}
