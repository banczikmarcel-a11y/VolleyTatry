"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ToastState = {
  tone: "error" | "success";
  text: string;
};

declare global {
  interface WindowEventMap {
    "app-toast": CustomEvent<ToastState>;
  }
}

export function showLiveToast(text: string, tone: "error" | "success" = "success") {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("app-toast", {
      detail: {
        text,
        tone
      }
    })
  );
}

export function LiveToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    function handleToast(event: WindowEventMap["app-toast"]) {
      setToast(event.detail);
    }

    window.addEventListener("app-toast", handleToast);
    return () => window.removeEventListener("app-toast", handleToast);
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!toast) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
      <div
        className={cn(
          "pointer-events-auto max-w-xl rounded-[8px] px-4 py-3 text-sm font-black shadow-panel",
          toast.tone === "error" ? "bg-red-600 text-white" : "bg-court-ink text-court-mint"
        )}
      >
        {toast.text}
      </div>
    </div>
  );
}
