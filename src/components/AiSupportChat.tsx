import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, X, Loader2, Mic, PhoneOff, Volume2 } from "lucide-react";
import { useLocation, useParams, matchPath } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGame } from "@/hooks/useGames";

type Msg = { role: "user" | "assistant"; content: string };

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-support`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const GREETING =
  "ආයුබෝවන් 👋 මම Double79 AI Support. Games, download කරන විදිය, Pro activate කරන විදිය — ඕන දෙයක් අහන්න!";

const SUGGESTIONS = [
  "Pro එක activate කරන්නේ කොහොමද?",
  "Game එකක් download කරන්නේ කොහොමද?",
  "Free සහ Pro අතර වෙනස මොකක්ද?",
];

const usePageContext = () => {
  const location = useLocation();
  const match = matchPath("/game/:id", location.pathname);
  const gameId = (match?.params as { id?: string } | undefined)?.id;
  const { data: game } = useGame(gameId);

  return useMemo(() => {
    if (gameId && game) {
      const created = (game as any).created_at ? new Date((game as any).created_at) : null;
      const isNew = created ? Date.now() - created.getTime() < 21 * 86400000 : false;
      const parts = [
        `Game detail page — "${game.title}"`,
        (game as any).genre ? `genre: ${(game as any).genre}` : "",
        (game as any).size ? `size: ${(game as any).size}` : "",
        (game as any).online === true ? "Online game" : (game as any).online === false ? "Offline game" : "",
        isNew ? "මෙය අඩවියට එකතු කළ අලුත්ම game එකකි" : "",
      ].filter(Boolean);
      return parts.join(" | ");
    }
    if (location.pathname === "/home" || location.pathname === "/") return "Store / home page (games list)";
    if (location.pathname === "/library") return "Library page (his saved games)";
    if (location.pathname === "/how-to-download") return "How to Download page (tutorial videos)";
    if (location.pathname === "/profiles") return "Community profiles page";
    return "";
  }, [location.pathname, gameId, game]);
};

const AiSupportChat = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<any>(null);
  const voiceRef = useRef(false);
  const context = usePageContext();

  useEffect(() => {
    voiceRef.current = voiceMode;
  }, [voiceMode]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, loading]);

  const speechSupported =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) &&
    "speechSynthesis" in window;

  const speak = useCallback((text: string, onDone: () => void) => {
    if (!("speechSynthesis" in window) || !text.trim()) return onDone();
    const clean = text.replace(/[*_`#>\-•]/g, " ").replace(/https?:\/\/\S+/g, "");
    const u = new SpeechSynthesisUtterance(clean);
    const voices = window.speechSynthesis.getVoices();
    const si = voices.find((v) => v.lang?.toLowerCase().startsWith("si"));
    u.voice = si ?? voices.find((v) => v.lang?.toLowerCase().startsWith("en-in")) ?? null;
    u.lang = si ? si.lang : "en-IN";
    u.rate = 1;
    setSpeaking(true);
    u.onend = () => {
      setSpeaking(false);
      onDone();
    };
    u.onerror = () => {
      setSpeaking(false);
      onDone();
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, []);

  const startListening = useCallback(() => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (recRef.current) {
      try { recRef.current.abort(); } catch { /* noop */ }
    }
    const rec = new SR();
    rec.lang = "si-LK";
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const text = (e.results[0][0]?.transcript || "").trim();
      if (text) sendRef.current?.(text, true);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch { /* already started */ }
  }, []);

  const sendRef = useRef<((text: string, viaVoice?: boolean) => Promise<void>) | null>(null);

  const send = useCallback(
    async (text: string, viaVoice = false) => {
      const content = text.trim();
      if (!content || loading) return;
      const next = [...messages, { role: "user" as const, content }];
      setMessages(next);
      setInput("");
      setLoading(true);

      let full = "";
      try {
        const res = await fetch(FN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
          body: JSON.stringify({
            messages: next.filter((m, i) => !(i === 0 && m.role === "assistant")),
            context,
            voice: viaVoice,
          }),
        });

        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || "AI සේවාව දැන් ලබාගත නොහැක.");
        }

        setMessages((m) => [...m, { role: "assistant", content: "" }]);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
              if (delta) {
                full += delta;
                setMessages((m) => {
                  const copy = [...m];
                  copy[copy.length - 1] = {
                    role: "assistant",
                    content: copy[copy.length - 1].content + delta,
                  };
                  return copy;
                });
              }
            } catch {
              /* ignore partial frames */
            }
          }
        }
      } catch (e) {
        full = e instanceof Error ? e.message : "දෝෂයක් ඇතිවිය.";
        setMessages((m) => [...m, { role: "assistant", content: full }]);
      } finally {
        setLoading(false);
      }

      if (viaVoice && voiceRef.current) {
        speak(full, () => {
          if (voiceRef.current) startListening();
        });
      }
    },
    [messages, loading, context, speak, startListening],
  );

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  const stopVoice = useCallback(() => {
    voiceRef.current = false;
    setVoiceMode(false);
    setListening(false);
    setSpeaking(false);
    try { recRef.current?.abort(); } catch { /* noop */ }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const startVoice = useCallback(() => {
    voiceRef.current = true;
    setVoiceMode(true);
    speak("ආයුබෝවන්! මම Double79 AI. කියන්න, මොකද ඕන?", () => startListening());
  }, [speak, startListening]);

  useEffect(() => () => stopVoice(), [stopVoice]);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="AI Support"
        className="fixed bottom-5 right-5 z-[60] inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.07] px-4 py-3 text-sm font-bold text-foreground shadow-[0_20px_45px_-15px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-2xl transition-all duration-300 hover:scale-105 hover:bg-white/[0.13] active:scale-95"
      >
        <span className="absolute -inset-1 -z-10 rounded-full bg-primary/40 blur-xl opacity-60" />
        {open ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5 text-primary" />}
        <span className="hidden sm:inline">{open ? "Close" : "AI Support"}</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] flex h-[70vh] max-h-[560px] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-[1.75rem] border border-white/20 bg-black/50 shadow-[0_35px_70px_-20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-3xl">
          <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-gradient text-primary-foreground">
              <Bot className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-bold">AI Support</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Double79 Game Store
              </div>
            </div>
            {speechSupported && (
              <button
                onClick={voiceMode ? stopVoice : startVoice}
                aria-label={voiceMode ? "End voice call" : "Start voice call"}
                className={cn(
                  "ml-auto flex h-10 w-10 items-center justify-center rounded-full border transition",
                  voiceMode
                    ? "border-destructive/40 bg-destructive/20 text-destructive"
                    : "border-white/15 bg-white/[0.06] text-primary hover:bg-white/[0.14]",
                )}
              >
                {voiceMode ? <PhoneOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            )}
          </div>

          {voiceMode && (
            <div className="flex items-center justify-center gap-2 border-b border-white/10 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
              {speaking ? (
                <>
                  <Volume2 className="h-4 w-4 animate-pulse" /> AI කතා කරමින්...
                </>
              ) : listening ? (
                <>
                  <Mic className="h-4 w-4 animate-pulse" /> ඔබ කතා කරන්න...
                </>
              ) : (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> සම්බන්ධයි...
                </>
              )}
            </div>
          )}

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-primary-gradient text-primary-foreground"
                    : "border border-white/10 bg-white/[0.06] text-foreground backdrop-blur-xl",
                )}
              >
                {m.content || "…"}
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> ලියමින්...
              </div>
            )}

            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-white/15 bg-white/[0.05] px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-white/[0.12] hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-white/10 bg-white/[0.04] p-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ඔබේ ප්‍රශ්නය මෙහි ලියන්න..."
              className="h-11 rounded-full border-white/10 bg-white/5 backdrop-blur-xl"
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              className="h-11 w-11 shrink-0 rounded-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      )}
    </>
  );
};

export default AiSupportChat;
