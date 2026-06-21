"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { findBestMatch, getFaqEntries, getSuggestedQuestions, getRelatedQuestions } from "@/lib/chatbot/match";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Role = "bot" | "user";
interface Msg {
  id: string;
  role: Role;
  text: string;
  matchedQ?: string;       // question we matched against
  fallback?: boolean;      // true = "I don't know, contact us"
  suggestions?: string[];  // chip suggestions under a bot message
}

const HIDE_ON = ["/admin", "/onboarding", "/signin", "/signup", "/auth"];

export default function Chatbot() {
  const pathname = usePathname();
  const hide = HIDE_ON.some((p) => pathname?.startsWith(p));

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => initialMessages());
  const scrollRef = useRef<HTMLDivElement>(null);

  const entries = useMemo(() => getFaqEntries(), []);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing, open]);

  if (hide) return null;

  function send(text: string) {
    const q = text.trim();
    if (!q) return;
    const userMsg: Msg = { id: cryptoId(), role: "user", text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    // simulate a tiny thinking delay so the bot doesn't feel robotic
    setTimeout(() => {
      const match = findBestMatch(q, entries);
      if (match) {
        const related = getRelatedQuestions(match.entry.category, match.entry.q, 3);
        setMessages((prev) => [
          ...prev,
          {
            id: cryptoId(),
            role: "bot",
            text: match.entry.a,
            matchedQ: match.entry.q,
            suggestions: related.length > 0 ? related : undefined,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: cryptoId(),
            role: "bot",
            fallback: true,
            text:
              "Δεν είμαι σίγουρ/η ότι μπορώ να απαντήσω σε αυτή την ερώτηση. Η ομάδα μας θα χαρεί να σας βοηθήσει — δείτε τη φόρμα επικοινωνίας.",
          },
        ]);
        logMiss(q, pathname);
      }
      setTyping(false);
    }, 350);
  }

  function reset() {
    setMessages(initialMessages());
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Κλείσιμο βοηθού" : "Άνοιγμα βοηθού"}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-[#c8ff00] text-ink shadow-lg hover:shadow-xl hover:bg-[#b8ee00] transition-all flex items-center justify-center cursor-pointer"
        style={{ boxShadow: "0 8px 24px -6px rgba(200,255,0,0.55)" }}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-24 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-96 h-[min(560px,calc(100vh-7rem))] bg-white rounded-2xl border border-ink/10 flex flex-col overflow-hidden"
          style={{ boxShadow: "0 20px 50px -12px rgba(0,0,0,0.25)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#056ef5] text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/15 grid place-items-center text-sm">P</div>
              <div>
                <div className="text-sm font-bold leading-tight">Βοηθός Protupa</div>
                <div className="text-[10px] text-white/70 leading-tight flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c8ff00]" />
                  Συνήθως απαντά αμέσως
                </div>
              </div>
            </div>
            <button onClick={reset} title="Νέα συζήτηση"
              className="text-[10px] uppercase tracking-wider font-bold text-white/70 hover:text-white border border-white/20 hover:border-white/40 px-2 py-1 rounded-full transition-colors">
              Νέο
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fafaf8]">
            {messages.map((m) => <Bubble key={m.id} msg={m} onSuggestion={send} />)}
            {typing && <TypingBubble />}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t border-ink/10 p-3 bg-white flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Γράψτε την ερώτησή σας..."
              aria-label="Γράψτε την ερώτησή σας"
              className="flex-1 px-3 py-2 rounded-lg border border-ink/15 text-sm text-ink bg-white focus:outline-none focus:border-[#056ef5] transition-colors placeholder:text-ink/35"
            />
            <button
              type="submit"
              aria-label="Αποστολή"
              disabled={!input.trim() || typing}
              className="px-4 rounded-lg bg-[#056ef5] text-white text-xs font-black uppercase tracking-wider hover:bg-[#0451b8] transition-colors disabled:opacity-40 cursor-pointer"
            >
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({ msg, onSuggestion }: { msg: Msg; onSuggestion: (s: string) => void }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-3.5 py-2 rounded-2xl rounded-br-md bg-[#056ef5] text-white text-sm">
          {msg.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 max-w-[88%]">
      <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white border border-ink/10 text-sm text-ink/85 leading-relaxed">
        {msg.matchedQ && (
          <div className="text-[10px] uppercase tracking-wider font-bold text-ink/40 mb-1.5">
            {msg.matchedQ}
          </div>
        )}
        <div>{msg.text}</div>
        {msg.fallback && (
          <Link
            href="/epikoinonia"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#056ef5] hover:text-[#0451b8] transition-colors"
          >
            Επικοινωνία →
          </Link>
        )}
      </div>
      {msg.suggestions && msg.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {msg.suggestions.map((s, i) => (
            <button key={i}
              onClick={() => onSuggestion(s)}
              className="text-[11px] text-[#056ef5] bg-[#056ef5]/8 hover:bg-[#056ef5]/15 border border-[#056ef5]/20 px-2.5 py-1 rounded-full transition-colors cursor-pointer text-left"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex">
      <div className="px-3.5 py-3 rounded-2xl rounded-bl-md bg-white border border-ink/10 inline-flex gap-1">
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-ink/35"
      style={{
        animation: "chat-dot 1s ease-in-out infinite",
        animationDelay: `${delay}ms`,
      }}
    />
  );
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// Log unanswered queries so we can improve clusters / FAQ over time.
// Best-effort: silently ignore errors (missing migration, RLS, etc.).
async function logMiss(query: string, pathname: string | null) {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("chatbot_misses").insert({
      query: query.slice(0, 500),
      user_id: user?.id ?? null,
      pathname: pathname?.slice(0, 200) ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
    });
  } catch {
    // ignore — logging is best-effort
  }
}

function cryptoId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function initialMessages(): Msg[] {
  return [
    {
      id: cryptoId(),
      role: "bot",
      text: "Γεια σας! Είμαι ο βοηθός της Protupa. Πώς μπορώ να βοηθήσω;",
      suggestions: getSuggestedQuestions(),
    },
  ];
}
