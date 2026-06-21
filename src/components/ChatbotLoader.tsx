"use client";
import dynamic from "next/dynamic";

const Chatbot = dynamic(() => import("./Chatbot"), { ssr: false, loading: () => null });

export function ChatbotLoader() {
  return <Chatbot />;
}
