import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

interface Props {
  onResult: (text: string) => void;
  className?: string;
}

const VoiceSearchButton = ({ onResult, className }: Props) => {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      let transcript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      onResult(transcript.trim());
    };
    rec.onerror = (e: any) => {
      setListening(false);
      if (e.error !== "no-speech" && e.error !== "aborted") {
        toast({ title: "Voice search error", description: e.error, variant: "destructive" });
      }
    };
    rec.onend = () => setListening(false);

    recRef.current = rec;
    return () => {
      try { rec.abort(); } catch {}
    };
  }, [onResult]);

  const toggle = () => {
    if (!recRef.current) return;
    if (listening) {
      recRef.current.stop();
      setListening(false);
    } else {
      try {
        recRef.current.start();
        setListening(true);
      } catch {}
    }
  };

  if (!supported) return null;

  return (
    <Tooltip open={listening || undefined}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggle}
          aria-label={listening ? "Stop listening" : "Voice search"}
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-md transition-smooth",
            listening
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            className
          )}
        >
          {listening ? <Mic className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {listening && (
            <>
              <span className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-primary/60 animate-pulse" />
              <span className="pointer-events-none absolute -inset-1 rounded-full bg-primary/20 blur-md animate-ping" />
            </>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {listening ? (
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Listening...
          </span>
        ) : (
          "Voice search"
        )}
      </TooltipContent>
    </Tooltip>
  );
};

export default VoiceSearchButton;
