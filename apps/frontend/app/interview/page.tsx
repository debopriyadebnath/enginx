"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Headphones, Mic, MicOff, PhoneOff, Sparkles, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { HR_SCENARIOS } from "@/lib/interviewScenarios";
import { useAuthState } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TranscriptEntry = {
  source: "user" | "ai";
  message: string;
  ts: number;
};

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function InterviewSession() {
  const router = useRouter();
  const { isLoading, isAuthenticated, user } = useAuthState();
  const [scenarioId, setScenarioId] = useState(HR_SCENARIOS[0]!.id);
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [copied, setCopied] = useState(false);
  const sessionStartRef = useRef<number | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const {
    status,
    startSession,
    endSession,
    isSpeaking,
    isListening,
    setMuted,
    isMuted,
  } = useConversation({
    onConnect: () => {
      sessionStartRef.current = Date.now();
      setApiError(null);
      setTranscript([]);
      setSessionSeconds(0);
      toast.success("Connected to AI interviewer");
    },
    onDisconnect: () => {
      toast("Session ended", { description: `Duration: ${formatDuration(sessionSeconds)}` });
    },
    onMessage: ({ message, source }: { message: string; source: "user" | "ai" }) => {
      setTranscript((prev) => [...prev, { source, message, ts: Date.now() }]);
    },
    onError: (e: unknown) => {
      const msg =
        typeof e === "object" && e && "message" in e
          ? String((e as { message: unknown }).message)
          : "Connection error";
      setApiError(msg);
      toast.error(msg);
    },
  });

  const scenario = HR_SCENARIOS.find((s) => s.id === scenarioId) ?? HR_SCENARIOS[0]!;
  const connected = status === "connected";
  const connecting = status === "connecting";

  // Session duration counter
  useEffect(() => {
    if (!connected) return;
    const id = setInterval(() => {
      if (sessionStartRef.current) {
        setSessionSeconds(Math.floor((Date.now() - sessionStartRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [connected]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { endSession(); };
  }, [endSession]);

  const handleStart = useCallback(async () => {
    setApiError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/elevenlabs/signed-url", { method: "POST" });
      const data = (await res.json()) as { signedUrl?: string; error?: string };
      if (!res.ok || !data.signedUrl) {
        const errMsg = data.error ?? "Could not start session";
        setApiError(errMsg);
        toast.error(errMsg);
        return;
      }
      const name = user?.name ?? user?.email?.split("@")[0] ?? "Candidate";
      startSession({
        signedUrl: data.signedUrl,
        connectionType: "websocket",
        dynamicVariables: {
          candidate_name: name,
          interview_scenario: scenario.id,
          interview_label: scenario.label,
        },
        overrides: { agent: { firstMessage: scenario.firstMessage } },
      });
    } catch {
      const errMsg = "Network error — check your connection";
      setApiError(errMsg);
      toast.error(errMsg);
    } finally {
      setBusy(false);
    }
  }, [startSession, scenario, user]);

  const handleCopyTranscript = useCallback(() => {
    if (transcript.length === 0) return;
    const text = transcript
      .map((e) => `[${e.source === "ai" ? "Interviewer" : "You"}] ${e.message}`)
      .join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Transcript copied");
      setTimeout(() => setCopied(false), 2000);
    });
  }, [transcript]);

  if (isLoading || !isAuthenticated || user === undefined) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#010828]">
        <p className="font-mono text-cream/60 text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  const displayName = user.name ?? user.email ?? "Candidate";

  return (
    <div className="relative min-h-[100dvh] bg-[#010828]">
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(111,255,0,0.12), transparent 55%)",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <Link href="/dashboard" className="font-mono text-sm text-neon hover:underline">
          ← Dashboard
        </Link>
        <div className="flex items-center gap-3">
          {connected && (
            <span className="font-mono text-xs text-cream/50 tabular-nums">
              {formatDuration(sessionSeconds)}
            </span>
          )}
          <Badge variant={connected ? "success" : connecting ? "warning" : "default"}>
            {connecting ? "Connecting" : connected ? "Live" : "Ready"}
          </Badge>
          <span className="font-anton text-xs uppercase tracking-widest text-cream/50">
            Voice practice
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-4 pb-16">
        {/* Title */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6fff00]/15 text-[#6fff00]">
            <Sparkles size={26} />
          </div>
          <h1 className="font-anton text-3xl uppercase text-cream sm:text-4xl">
            HR voice interview
          </h1>
          <p className="mt-2 font-mono text-sm text-cream/65">
            One-to-one voice session with an AI interviewer. Use headphones.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Left column — controls */}
          <div className="space-y-6">
            {/* Scenario picker */}
            <div className="liquid-glass rounded-[20px] border border-white/10 p-5">
              <label className="font-mono text-[10px] uppercase tracking-wider text-cream/50">
                Interview focus
              </label>
              <select
                value={scenarioId}
                disabled={connected || connecting}
                onChange={(e) => setScenarioId(e.target.value)}
                className="mt-2 w-full rounded-[12px] border border-white/15 bg-[#010828]/80 px-4 py-3 font-mono text-sm text-cream focus:border-[#6fff00]/50 focus:outline-none disabled:opacity-50"
              >
                {HR_SCENARIOS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <p className="mt-3 font-mono text-xs leading-relaxed text-cream/55">
                {scenario.description}
              </p>
            </div>

            {/* Status orb */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "relative flex h-36 w-36 items-center justify-center rounded-full border-2 transition-all duration-500 sm:h-44 sm:w-44",
                  connected
                    ? isSpeaking
                      ? "border-[#6fff00] bg-[#6fff00]/15 shadow-[0_0_60px_rgba(111,255,0,0.3)]"
                      : isListening
                        ? "border-cyan-400/70 bg-cyan-500/10 shadow-[0_0_40px_rgba(34,211,238,0.18)]"
                        : "border-white/20 bg-white/[0.04]"
                    : "border-white/15 bg-white/[0.03]"
                )}
              >
                {/* Pulse ring when AI is speaking */}
                {connected && isSpeaking && (
                  <span className="absolute inset-0 animate-ping rounded-full border border-[#6fff00]/25" />
                )}
                <div className="text-center">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-cream/40">
                    {connecting ? "Connecting…" : connected
                      ? isSpeaking ? "Interviewer" : isListening ? "Listening" : "Live"
                      : "Ready"}
                  </p>
                  {connected && (
                    <p className="mt-1 font-mono text-xs text-cream/30">{displayName}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Error */}
            {apiError && (
              <div className="rounded-[14px] border border-rose-500/40 bg-rose-950/40 px-4 py-3 font-mono text-sm text-rose-100">
                {apiError}
                <p className="mt-2 text-xs text-rose-200/80">
                  Create a <span className="text-cream">Conversational AI agent</span> in
                  ElevenLabs, set{" "}
                  <code className="text-neon">ELEVENLABS_AGENT_ID</code> and{" "}
                  <code className="text-neon">ELEVENLABS_API_KEY</code> in{" "}
                  <code className="text-cream/80">.env.local</code>.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              {!connected && !connecting ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleStart()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#6fff00] px-6 py-4 font-anton uppercase tracking-wide text-[#010828] shadow-[0_0_28px_rgba(111,255,0,0.2)] transition hover:brightness-110 disabled:opacity-50"
                >
                  <Mic size={20} />
                  {busy ? "Starting…" : "Start voice session"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setMuted(!isMuted)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[14px] border border-white/20 bg-white/5 px-4 py-4 font-mono text-sm text-cream hover:bg-white/10"
                  >
                    {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                    {isMuted ? "Unmute mic" : "Mute mic"}
                  </button>
                  <button
                    type="button"
                    onClick={() => endSession()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[14px] border border-rose-500/40 bg-rose-950/30 px-4 py-4 font-anton uppercase tracking-wide text-rose-100 hover:bg-rose-950/50"
                  >
                    <PhoneOff size={18} />
                    End session
                  </button>
                </>
              )}
            </div>

            {/* Tips */}
            <div className="rounded-[16px] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start gap-3">
                <Headphones className="mt-0.5 shrink-0 text-cream/50" size={18} />
                <div className="font-mono text-xs leading-relaxed text-cream/50">
                  <p className="font-semibold text-cream/70">Tips</p>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    <li>Allow microphone access when prompted.</li>
                    <li>Agent personality is configured in your ElevenLabs dashboard.</li>
                    <li>Scenario nudges the first message; align your ElevenLabs prompt for full HR behavior.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Right column — transcript */}
          <div className="liquid-glass flex flex-col rounded-[20px] border border-white/10 p-4" style={{ minHeight: 420 }}>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-cream/50">
                Transcript
              </span>
              {transcript.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyTranscript}
                  className="flex items-center gap-1.5 rounded-[8px] border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] text-cream/60 hover:bg-white/10 hover:text-cream/90 transition"
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ maxHeight: 480 }}>
              {transcript.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 py-12">
                  <span className="font-mono text-xs text-cream/30">
                    {connected ? "Conversation will appear here…" : "Start a session to see the live transcript"}
                  </span>
                </div>
              ) : (
                transcript.map((entry, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-2",
                      entry.source === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-[12px] px-3 py-2 font-mono text-xs leading-relaxed",
                        entry.source === "ai"
                          ? "bg-[#6fff00]/10 text-cream/90 border border-[#6fff00]/15"
                          : "bg-white/8 text-cream/75 border border-white/10"
                      )}
                    >
                      <p className={cn("mb-1 text-[9px] uppercase tracking-wider", entry.source === "ai" ? "text-[#6fff00]/60" : "text-cream/40")}>
                        {entry.source === "ai" ? "Interviewer" : "You"}
                      </p>
                      {entry.message}
                    </div>
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>

            {connected && transcript.length > 0 && (
              <div className="mt-3 border-t border-white/8 pt-3">
                <p className="font-mono text-[9px] text-cream/30 text-center">
                  {transcript.length} message{transcript.length !== 1 ? "s" : ""} · {formatDuration(sessionSeconds)}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <ConversationProvider>
      <InterviewSession />
    </ConversationProvider>
  );
}
