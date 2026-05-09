import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

interface Props {
  onResult: (text: string) => void;
  className?: string;
}

const VoiceSearchButton = ({ onResult, className }: Props) => {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);
  const captureRef = useRef<{ transcript: string; confidence: number } | null>(null);

  useEffect(() => {
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      const result = e.results[e.results.length - 1][0];
      captureRef.current = {
        transcript: result.transcript.trim(),
        confidence: result.confidence ?? 0,
      };
    };

    rec.onerror = (e: any) => {
      setListening(false);
      setProcessing(false);
      captureRef.current = null;
      if (e.error !== "no-speech" && e.error !== "aborted") {
        toast({ title: "Voice search error", description: e.error, variant: "destructive" });
      }
    };

    rec.onend = () => {
      setListening(false);
      const captured = captureRef.current;
      captureRef.current = null;

      if (captured) {
        setProcessing(true);
        setTimeout(() => {
          if (captured.confidence >= 0.8) {
            onResult(captured.transcript);
          }
          setProcessing(false);
        }, 500);
      } else {
        setProcessing(false);
      }
    };

    recRef.current = rec;
    return () => {
      try { rec.abort(); } catch {}
    };
  }, [onResult]);

  const toggle = () => {
    if (!recRef.current) return;
    if (listening || processing) {
      try { recRef.current.stop(); } catch {}
      setListening(false);
      setProcessing(false);
      captureRef.current = null;
    } else {
      try {
        recRef.current.start();
        setListening(true);
      } catch {}
    }
  };

  if (!supported) return null;

  const active = listening || processing;

  return (
    <Tooltip open={active || undefined}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggle}
          aria-label={listening ? "Stop listening" : processing ? "Processing voice" : "Voice search"}
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-md transition-smooth",
            active
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            className
          )}
        >
          {processing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : listening ? (
            <Mic className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {listening && (
            <>
              <span className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-primary/60 animate-pulse" />
              <span className="pointer-events-none absolute -inset-1 rounded-full bg-primary/20 blur-md animate-ping" />
            </>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {processing ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing...
          </span>
        ) : listening ? (
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
