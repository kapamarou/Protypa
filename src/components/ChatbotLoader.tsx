"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Chatbot = dynamic(() => import("./Chatbot"), { ssr: false, loading: () => null });

export function ChatbotLoader() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Load the chatbot only once the browser is idle — keeps it off the
    // critical path so it doesn't compete with LCP or inflate TBT.
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = (window as Window & { requestIdleCallback: (cb: () => void) => number })
        .requestIdleCallback(() => setReady(true));
      return () => (window as Window & { cancelIdleCallback: (id: number) => void })
        .cancelIdleCallback(id);
    }
    const id = setTimeout(() => setReady(true), 2000);
    return () => clearTimeout(id);
  }, []);

  return ready ? <Chatbot /> : null;
}
