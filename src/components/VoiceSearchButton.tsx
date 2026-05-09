import { useEffect, useRef, useState } from "react";
import { Mic, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

interface Props {
  onResult: (text: string) => void;
  onSuccess?: () => void;
  className?: string;
}

const VoiceSearchButton = ({ onResult, onSuccess, className }: Props) => {
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
      const result = e.results[0][0];
      captureRef.current = {
        transcript: (result.transcript || "").trim(),
        confidence: typeof result.confidence === "number" ? result.confidence : 1,
      };
    };

    rec.onerror = (e: any) => {
      setListening(false);
      setProcessing(false);
      captureRef.current = null;
      console.error("[VoiceSearch] error:", e.error);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        toast({
          title: "Microphone blocked",
          description: "Please allow microphone access in your browser.",
          variant: "destructive",
        });
      } else if (e.error === "no-speech") {
        toast({ title: "No speech detected", description: "Please try again." });
      } else if (e.error !== "aborted") {
        toast({ title: "Voice search error", description: e.error, variant: "destructive" });
      }
    };

    rec.onend = () => {
      setListening(false);
      const captured = captureRef.current;
      captureRef.current = null;

      if (captured && captured.transcript) {
        setProcessing(true);
        setTimeout(() => {
          // Always accept whatever the browser captured
          onResult(captured.transcript);
          onSuccess?.();
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
  }, [onResult, onSuccess]);

  const toggle = () => {
    if (!recRef.current) return;
    if (listening || processing) {
      try { recRef.current.stop(); } catch {}
      setListening(false);
      setProcessing(false);
      captureRef.current = null;
    } else {
      try {
        captureRef.current = null;
        recRef.current.start();
        setListening(true);
      } catch (err) {
        console.error("[VoiceSearch] start failed:", err);
      }
    }
  };

  if (!supported) return null;

  const active = listening || processing;
  const tooltipLabel = processing ? "Processing..." : listening ? "Listening..." : "Voice search";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggle}
          aria-label={tooltipLabel}
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
