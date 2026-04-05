"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Headphones, Mic, MicOff, PhoneOff, Sparkles, CheckCircle, BarChart3, Target } from "lucide-react";
import { HR_SCENARIOS } from "@/lib/interviewScenarios";
import { useAuthState } from "@/lib/auth";

type Message = {
  role: "interviewer" | "candidate";
  text: string;
};

type Evaluation = {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
};

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function InterviewSession() {
  const router = useRouter();
  const { isLoading, isAuthenticated, user } = useAuthState();
  const [scenarioId, setScenarioId] = useState(HR_SCENARIOS[0]!.id);
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Core state
  const [status, setStatus] = useState<"idle" | "speaking" | "listening" | "thinking" | "evaluation">("idle");
  const [history, setHistory] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<HTMLAudioElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // We track the latest transcript in a ref so the timeout callback can access it
  const currentTranscriptRef = useRef("");
  // We also track status in a ref for the timeout callback
  const currentStatusRef = useRef(status);

  const SILENCE_MS = 2500;
  const MAX_QUESTIONS = 10;

  const scenario = HR_SCENARIOS.find((s) => s.id === scenarioId) ?? HR_SCENARIOS[0]!;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, transcript, evaluation]);

  useEffect(() => {
    currentStatusRef.current = status;
  }, [status]);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  const getCandidateTurnCount = useCallback((currentHistory: Message[]) => {
    return currentHistory.filter((m) => m.role === "candidate").length;
  }, []);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    silenceTimeoutRef.current = setTimeout(() => {
      // If we are listening and actually have text, auto-submit
      if (currentStatusRef.current === "listening" && currentTranscriptRef.current.trim()) {
        handleUserFinishedSpeaking();
      }
    }, SILENCE_MS);
  }, []);

  const initSpeechRecognition = useCallback(() => {
    if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      setApiError("Your browser does not support the Web Speech API. Please use Chrome or Edge.");
      return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
      currentTranscriptRef.current = currentTranscript;
      
      // Auto-submit via silence detection
      resetSilenceTimer();
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error === "not-allowed") {
        setApiError("Microphone access denied. Please allow microphone access.");
        endSession();
      }
    };

    return recognition;
  }, [resetSilenceTimer]);

  const playTTS = async (text: string) => {
    setStatus("thinking");
    try {
      const res = await fetch("/api/elevenlabs/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate speech");
      }

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioContextRef.current) {
        audioContextRef.current.pause();
        URL.revokeObjectURL(audioContextRef.current.src);
      }

      const audio = new Audio(audioUrl);
      audioContextRef.current = audio;

      audio.addEventListener("play", () => {
        setStatus("speaking");
      });

      const finishSpeaking = () => {
        if (currentStatusRef.current === "speaking") {
          URL.revokeObjectURL(audioUrl);
          
          if (isSessionActive && currentStatusRef.current !== "evaluation" && recognitionRef.current) {
            setStatus("listening");
            setTranscript("");
            currentTranscriptRef.current = "";
            try {
               recognitionRef.current.start();
            } catch (e) {
               console.error("Failed to start recognition", e);
            }
          }
        }
      };

      audio.addEventListener("ended", finishSpeaking);
      audio.addEventListener("pause", () => {
         // Fallback in case the browser pauses the audio at the end instead of firing 'ended'
         // We check duration to see if it's near the end
         if (audio.currentTime > 0 && Math.abs(audio.duration - audio.currentTime) < 0.5) {
             finishSpeaking();
         }
      });
      
      audio.addEventListener("error", (e) => {
         console.error("Audio playback error", e);
         finishSpeaking();
      });

      await audio.play();
    } catch (error) {
      console.error("TTS Error:", error);
      setStatus("idle");
    }
  };

  const getNextResponse = async (userText: string, updatedHistory: Message[]) => {
    setStatus("thinking");
    try {
      const turns = getCandidateTurnCount(updatedHistory);
      const isEval = turns >= MAX_QUESTIONS;

      const res = await fetch("/api/interview/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: userText,
          scenarioId: scenario.id,
          history: updatedHistory,
          isEval,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const data = await res.json();

      if (isEval) {
        // Handle Evaluation response
        const evalData = data as Evaluation;
        setEvaluation(evalData);
        setStatus("evaluation");
        setIsSessionActive(false);
        // Play the short wrap up string
        await playTTS(evalData.summary);
      } else {
        // Handle normal conversational turn
        const nextQuestion = data.question;
        setHistory((prev) => [...prev, { role: "interviewer", text: nextQuestion }]);
        await playTTS(nextQuestion);
      }
    } catch (error) {
      console.error("LLM Error:", error);
      setApiError("Unable to generate next question or evaluation.");
      endSession();
    }
  };

  const handleStart = async () => {
    setApiError(null);
    setBusy(true);
    setHistory([]);
    setTranscript("");
    currentTranscriptRef.current = "";
    setEvaluation(null);

    // Request permissions explicitly FIRST, as doing this inside audio.onended will be blocked by browsers
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the explicit stream immediately, we just needed the permission grant
      stream.getTracks().forEach(track => track.stop());
    } catch (e) {
      setApiError("Microphone access denied. Please allow microphone access.");
      setBusy(false);
      return;
    }

    const recognition = initSpeechRecognition();
    if (!recognition) {
       setBusy(false);
       return;
    }
    
    recognition.onend = () => {
      // Auto-restart if we are still meant to be listening and it dropped
      if (currentStatusRef.current === "listening") {
        try {
           recognition.start();
        } catch (e) {}
      }
    };

    recognitionRef.current = recognition;
    setIsSessionActive(true);
    setStatus("speaking");

    const firstMsg = scenario.firstMessage;
    const name = user?.name ?? user?.email?.split("@")[0] ?? "Candidate";
    const personalizedFirstMsg = firstMsg.replace("candidate_name", name);

    setHistory([{ role: "interviewer", text: personalizedFirstMsg }]);
    await playTTS(personalizedFirstMsg);
    setBusy(false);
  };

  // Called manually or by silence timeout
  const handleUserFinishedSpeaking = () => {
    if (currentStatusRef.current !== "listening" || !currentTranscriptRef.current.trim()) return;

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const currentTranscript = currentTranscriptRef.current;
    setTranscript("");
    currentTranscriptRef.current = "";
    
    const newHistoryEntry: Message = { role: "candidate", text: currentTranscript };
    setHistory((prev) => {
      const updatedHistory = [...prev, newHistoryEntry];
      getNextResponse(currentTranscript, updatedHistory);
      return updatedHistory;
    });
  };

  const endSession = () => {
    setIsSessionActive(false);
    
    // Once evaluated, we don't return to idle to leave the report on screen
    if (currentStatusRef.current !== "evaluation") {
      setStatus("idle");
    }
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.pause();
    }
  };

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
  const currentTurn = getCandidateTurnCount(history);

  return (
    <div className="relative min-h-[100dvh] bg-[#010828]">
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background: status === "evaluation" 
             ? "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(183,36,255,0.12), transparent 55%)"
             : "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(111,255,0,0.12), transparent 55%)",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link
          href="/dashboard"
          className="font-mono text-sm text-neon hover:underline"
          onClick={endSession}
        >
          ← Dashboard
        </Link>
        <span className="font-anton text-xs uppercase tracking-widest text-cream/50">
          Voice practice
        </span>
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-16">
        <div className="mb-8 text-center">
          <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${status === "evaluation" ? "bg-[#b724ff]/15 text-[#b724ff]" : "bg-[#6fff00]/15 text-[#6fff00]"}`}>
            {status === "evaluation" ? <CheckCircle size={26} /> : <Sparkles size={26} />}
          </div>
          <h1 className="font-anton text-3xl uppercase text-cream sm:text-4xl">
            {status === "evaluation" ? "Interview Complete" : "HR voice interview"}
          </h1>
          <p className="mt-2 font-mono text-sm text-cream/65">
            {status === "evaluation" 
              ? "Great job! Review your automated feedback below."
              : "One-to-one voice session with an AI interviewer. Speak naturally — it will automatically detect when you finish your sentence."}
          </p>
        </div>

        {status !== "evaluation" && (
          <div className="liquid-glass mb-8 rounded-[20px] border border-white/10 p-5">
            <div className="flex items-center justify-between">
               <label className="font-mono text-[10px] uppercase tracking-wider text-cream/50">
                 Interview focus
               </label>
               {isSessionActive && (
                 <span className="font-anton text-xs uppercase tracking-widest text-[#6fff00]/80">
                   Question {currentTurn + 1} / {MAX_QUESTIONS}
                 </span>
               )}
            </div>
            <select
              value={scenarioId}
              disabled={isSessionActive}
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
        )}

        {apiError ? (
          <div className="mb-6 rounded-[14px] border border-rose-500/40 bg-rose-950/40 px-4 py-3 font-mono text-sm text-rose-100">
            {apiError}
          </div>
        ) : null}

        {/* Evaluation Output UI */}
        {status === "evaluation" && evaluation && (
          <div className="liquid-glass mb-8 flex flex-col gap-6 rounded-[20px] border border-[#b724ff]/30 p-6 shadow-[0_0_40px_rgba(183,36,255,0.08)]">
             <div className="flex flex-col items-center border-b border-white/10 pb-6 text-center">
                <span className="font-anton text-5xl text-[#b724ff] drop-shadow-[0_0_15px_rgba(183,36,255,0.4)]">
                   {evaluation.score}
                </span>
                <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-cream/50">
                   Overall Score
                </span>
             </div>
             
             <div className="grid gap-6 sm:grid-cols-2">
                <div>
                   <div className="mb-3 flex items-center gap-2">
                      <Target size={16} className="text-[#6fff00]" />
                      <h3 className="font-anton text-sm uppercase tracking-wider text-cream/80">Strengths</h3>
                   </div>
                   <ul className="flex flex-col gap-2 font-mono text-xs text-cream/60">
                     {evaluation.strengths.map((str, i) => (
                       <li key={i} className="flex gap-2">
                         <span className="text-[#6fff00]">›</span> {str}
                       </li>
                     ))}
                   </ul>
                </div>
                <div>
                   <div className="mb-3 flex items-center gap-2">
                      <BarChart3 size={16} className="text-rose-400" />
                      <h3 className="font-anton text-sm uppercase tracking-wider text-cream/80">Areas to Improve</h3>
                   </div>
                   <ul className="flex flex-col gap-2 font-mono text-xs text-cream/60">
                     {evaluation.weaknesses.map((weak, i) => (
                       <li key={i} className="flex gap-2">
                         <span className="text-rose-400">›</span> {weak}
                       </li>
                     ))}
                   </ul>
                </div>
             </div>

             <div className="mt-2 rounded-[12px] bg-white/[0.03] p-4 text-sm leading-relaxed text-[#eff4ff]/80">
                <p className="font-semibold text-cream/90 mb-1">Feedback Summarized:</p>
                {evaluation.feedback}
             </div>
          </div>
        )}

        {/* Status orb */}
        {status !== "evaluation" && (
          <div className="mb-8 flex flex-col items-center">
            <div
              className={`relative flex h-44 w-44 items-center justify-center rounded-full border-2 transition-all duration-500 sm:h-52 sm:w-52 ${
                status === "speaking"
                  ? "border-[#6fff00] bg-[#6fff00]/15 shadow-[0_0_60px_rgba(111,255,0,0.25)]"
                  : status === "listening"
                    ? "border-cyan-400/70 bg-cyan-500/10 shadow-[0_0_40px_rgba(34,211,238,0.15)]"
                    : status === "thinking"
                      ? "border-[#b724ff] bg-[#b724ff]/10 shadow-[0_0_40px_rgba(183,36,255,0.15)]"
                      : "border-white/20 bg-white/[0.04]"
              }`}
            >
              <span className="font-mono text-[11px] uppercase tracking-widest text-cream/40">
                {status === "thinking"
                  ? "Thinking..."
                  : status === "speaking"
                    ? "Interviewer"
                    : status === "listening"
                      ? "Listening"
                      : "Ready"}
              </span>
            </div>
            <p className="mt-4 font-mono text-sm text-cream/70">
              {displayName}
            </p>
          </div>
        )}

        {/* Live Transcript Panel */}
        {status !== "evaluation" && isSessionActive && (history.length > 0 || transcript) && (
          <div className="liquid-glass mb-8 flex flex-col gap-4 rounded-[20px] border border-white/10 p-5 max-h-64 overflow-y-auto">
            {history.map((msg, i) => (
              <div key={i} className="flex flex-col gap-1">
                <span
                  className={`font-anton text-[10px] tracking-widest uppercase ${
                    msg.role === "interviewer" ? "text-[#6fff00]/60" : "text-[#eff4ff]/40"
                  }`}
                >
                  {msg.role === "interviewer" ? "Interviewer" : "You"}
                </span>
                <p
                  className={`font-mono text-sm leading-relaxed ${
                    msg.role === "interviewer" ? "text-[#6fff00]" : "text-[#eff4ff]"
                  }`}
                >
                  {msg.text}
                </p>
              </div>
            ))}
            {transcript && (
              <div className="flex flex-col gap-1">
                <span className="font-anton text-[10px] tracking-widest uppercase text-[#eff4ff]/40">
                  You (Speaking...)
                </span>
                <p className="font-mono text-sm leading-relaxed text-[#eff4ff]/60 italic">
                  {transcript}
                </p>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>
        )}

        {status !== "evaluation" && (
           <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
             {!isSessionActive ? (
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
                 {status === "speaking" ? (
                   <button
                     type="button"
                     onClick={() => {
                        if (audioContextRef.current) {
                           // this will trigger the pause event listener we just added
                           // or we can manually transition state
                           audioContextRef.current.pause();
                           setStatus("listening");
                           try { recognitionRef.current?.start(); } catch(e){}
                        }
                     }}
                     className="flex flex-1 items-center justify-center gap-2 rounded-[14px] border border-cyan-400/40 bg-cyan-500/20 px-4 py-4 font-mono text-sm text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50"
                   >
                     <Mic size={18} />
                     Answer
                   </button>
                 ) : status === "listening" ? (
                   <button
                     type="button"
                     onClick={handleUserFinishedSpeaking}
                     disabled={!transcript.trim()}
                     className="flex flex-1 items-center justify-center gap-2 rounded-[14px] border border-cyan-400/40 bg-cyan-500/20 px-4 py-4 font-mono text-sm text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50"
                   >
                     <Mic size={18} />
                     {transcript.trim() ? "Submit Answer" : "Listening..."}
                   </button>
                 ) : status === "idle" && isSessionActive ? (
                   <button
                     type="button"
                     onClick={() => {
                        setStatus("listening");
                        try { recognitionRef.current?.start(); } catch(e){}
                     }}
                     className="flex flex-1 items-center justify-center gap-2 rounded-[14px] border border-white/20 bg-white/5 px-4 py-4 font-mono text-sm text-cream hover:bg-white/10"
                   >
                     <MicOff size={18} />
                     Turn Mic On
                   </button>
                 ) : null}
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
        )}

        {status === "evaluation" && (
           <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
             <button
               type="button"
               onClick={() => { setStatus("idle"); setHistory([]); setTranscript(""); setEvaluation(null); }}
               className="flex flex-1 items-center justify-center gap-2 rounded-[14px] border border-white/20 bg-white/5 px-4 py-4 font-mono text-sm text-cream hover:bg-white/10"
             >
               Practice Again
             </button>
           </div>
        )}

        {status !== "evaluation" && (
           <div className="mt-10 rounded-[16px] border border-white/10 bg-white/[0.03] p-4">
             <div className="flex items-start gap-3">
               <Headphones className="mt-0.5 shrink-0 text-cream/50" size={18} />
               <div className="font-mono text-xs leading-relaxed text-cream/50">
                 <p className="font-semibold text-cream/70">Tips</p>
                 <ul className="mt-2 list-inside list-disc space-y-1">
                   <li>Allow microphone access when the browser asks.</li>
                   <li>Simply talk normally — the interviewer will wait for you to pause before responding.</li>
                 </ul>
               </div>
             </div>
           </div>
        )}
      </main>
    </div>
  );
}
