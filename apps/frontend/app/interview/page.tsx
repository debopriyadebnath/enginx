"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ConversationProvider,
  useConversation,
} from "@elevenlabs/react";
import { Headphones, Mic, MicOff, PhoneOff, Sparkles } from "lucide-react";
import { HR_SCENARIOS } from "@/lib/interviewScenarios";
import { useAuthState } from "@/lib/auth";

function InterviewSession() {
  const router = useRouter();
  const { isLoading, isAuthenticated, user } = useAuthState();
  const [scenarioId, setScenarioId] = useState(HR_SCENARIOS[0]!.id);
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    status,
    startSession,
    endSession,
    isSpeaking,
    isListening,
    setMuted,
    isMuted,
  } = useConversation({
    onConnect: () => setApiError(null),
    onError: (e) => {
      console.error(e);
      setApiError(
        typeof e === "object" && e && "message" in e
          ? String((e as { message: unknown }).message)
          : "Connection error"
      );
    },
    onDisconnect: () => {},
  });

  const scenario = HR_SCENARIOS.find((s) => s.id === scenarioId) ?? HR_SCENARIOS[0]!;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleStart = useCallback(async () => {
    setApiError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/elevenlabs/signed-url", { method: "POST" });
      const data = (await res.json()) as { signedUrl?: string; error?: string };
      if (!res.ok || !data.signedUrl) {
        setApiError(data.error ?? "Could not start session");
        setBusy(false);
        return;
      }

      const name =
        user?.name ?? user?.email?.split("@")[0] ?? "Candidate";

      startSession({
        signedUrl: data.signedUrl,
        connectionType: "websocket",
        dynamicVariables: {
          candidate_name: name,
          interview_scenario: scenario.id,
          interview_label: scenario.label,
        },
        overrides: {
          agent: {
            firstMessage: scenario.firstMessage,
          },
        },
      });
    } catch {
      setApiError("Network error");
    } finally {
      setBusy(false);
    }
  }, [startSession, scenario, user]);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, [endSession]);

  if (isLoading || !isAuthenticated || user === undefined) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#010828]">
        <p className="font-mono text-cream/60 text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = user.name ?? user.email ?? "Candidate";
  const connected = status === "connected";
  const connecting = status === "connecting";

  return (
    <div className="relative min-h-[100dvh] bg-[#010828]">
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(111,255,0,0.12), transparent 55%)",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link
          href="/dashboard"
          className="font-mono text-sm text-neon hover:underline"
        >
          ← Dashboard
        </Link>
        <span className="font-anton text-xs uppercase tracking-widest text-cream/50">
          Voice practice
        </span>
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-16">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6fff00]/15 text-[#6fff00]">
            <Sparkles size={26} />
          </div>
          <h1 className="font-anton text-3xl uppercase text-cream sm:text-4xl">
            HR voice interview
          </h1>
          <p className="mt-2 font-mono text-sm text-cream/65">
            One-to-one voice session with an AI interviewer. Use headphones and a
            quiet space. Speak naturally — this builds communication confidence.
          </p>
        </div>

        {/* Scenario */}
        <div className="liquid-glass mb-8 rounded-[20px] border border-white/10 p-5">
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
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="mt-3 font-mono text-xs leading-relaxed text-cream/55">
            {scenario.description}
          </p>
        </div>

        {/* Status orb */}
        <div className="mb-8 flex flex-col items-center">
          <div
            className={`relative flex h-44 w-44 items-center justify-center rounded-full border-2 transition-all duration-500 sm:h-52 sm:w-52 ${
              connected
                ? isSpeaking
                  ? "border-[#6fff00] bg-[#6fff00]/15 shadow-[0_0_60px_rgba(111,255,0,0.25)]"
                  : isListening
                    ? "border-cyan-400/70 bg-cyan-500/10 shadow-[0_0_40px_rgba(34,211,238,0.15)]"
                    : "border-white/20 bg-white/[0.04]"
                : "border-white/15 bg-white/[0.03]"
            }`}
          >
            <span className="font-mono text-[11px] uppercase tracking-widest text-cream/40">
              {connecting
                ? "Connecting…"
                : connected
                  ? isSpeaking
                    ? "Interviewer"
                    : isListening
                      ? "Listening"
                      : "Live"
                  : "Ready"}
            </span>
          </div>
          <p className="mt-4 font-mono text-sm text-cream/70">
            {displayName}
          </p>
        </div>

        {apiError ? (
          <div className="mb-6 rounded-[14px] border border-rose-500/40 bg-rose-950/40 px-4 py-3 font-mono text-sm text-rose-100">
            {apiError}
            <p className="mt-2 text-xs text-rose-200/80">
              Create an{" "}
              <span className="text-cream">Conversational AI agent</span> in ElevenLabs,
              set <code className="text-neon">ELEVENLABS_AGENT_ID</code> and{" "}
              <code className="text-neon">ELEVENLABS_API_KEY</code> in{" "}
              <code className="text-cream/80">.env.local</code>, then restart the dev
              server.
            </p>
          </div>
        ) : null}

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

        <div className="mt-10 rounded-[16px] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start gap-3">
            <Headphones className="mt-0.5 shrink-0 text-cream/50" size={18} />
            <div className="font-mono text-xs leading-relaxed text-cream/50">
              <p className="font-semibold text-cream/70">Tips</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Allow microphone access when the browser asks.</li>
                <li>Your agent&apos;s personality and rules are set in the ElevenLabs dashboard.</li>
                <li>Scenario + first message here nudge the agent; align the prompt in ElevenLabs for best HR behavior.</li>
              </ul>
            </div>
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
