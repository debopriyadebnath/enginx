"use client";

import "@xyflow/react/dist/style.css";

import { AnimatePresence, motion } from "framer-motion";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/lib/session";
import pack from "@/data/workflow.json";
import { useWorkflowTimer } from "@/hooks/useWorkflowTimer";
import { computeScore } from "@/lib/workflow/score";
import type {
  ScoreBreakdown,
  ValidationResult,
  WorkflowPack,
  WorkflowPuzzle,
} from "@/lib/workflow/types";
import { edgesToFlow, nodesToFlow } from "@/lib/workflow/toFlow";
import { validatePuzzle } from "@/lib/workflow/validate";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkflowNode } from "./WorkflowNode";
import { flowEdgesToJson, flowNodesToJson } from "./flowUtils";

const data = pack as WorkflowPack;

// Defined outside component so nodeTypes ref is stable — prevents RF re-render loops
const nodeTypes = { workflow: WorkflowNode };

function ek(source: string, target: string) {
  return `${source}|${target}`;
}

// ── Fit view after mount ────────────────────────────────────────────────────
function FitViewEffect({ puzzleId }: { puzzleId: string }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      fitView({ padding: 0.25, duration: 300 });
    });
    return () => cancelAnimationFrame(id);
  }, [puzzleId, fitView]);
  return null;
}

// ── Exposes RF getNodes/getEdges through a ref ──────────────────────────────
function GraphCapture({
  onReady,
}: {
  onReady: (api: { getNodes: () => Node[]; getEdges: () => Edge[] }) => void;
}) {
  const rf = useReactFlow();
  useEffect(() => {
    onReady({ getNodes: rf.getNodes, getEdges: rf.getEdges });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ── The actual canvas ───────────────────────────────────────────────────────
function WorkflowCanvasInner({
  puzzle,
  locked,
  highlightBadEdges,
  onReady,
}: {
  puzzle: WorkflowPuzzle;
  locked: boolean;
  highlightBadEdges: Set<string>;
  onReady: (api: { getNodes: () => Node[]; getEdges: () => Edge[] }) => void;
}) {
  const puzzleId = puzzle.id;

  const initNodes = useMemo(
    () => nodesToFlow(puzzle.shuffledNodes, puzzle.layoutAxis),
    // Only recalculate when the puzzle actually changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [puzzleId]
  );
  const initEdges = useMemo(
    () => edgesToFlow(puzzle.shuffledEdges),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [puzzleId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);

  // Sync to new puzzle on id change
  useEffect(() => {
    setNodes(nodesToFlow(puzzle.shuffledNodes, puzzle.layoutAxis));
    setEdges(edgesToFlow(puzzle.shuffledEdges));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzleId]);

  const draggable =
    !locked && (puzzle.mode === "arrange" || puzzle.mode === "hybrid");
  const connectable =
    !locked && (puzzle.mode === "connect" || puzzle.mode === "hybrid");

  const styledEdges = useMemo(
    () =>
      edges.map((e) => {
        const bad = highlightBadEdges.has(ek(e.source, e.target));
        return {
          ...e,
          type: "default",
          animated: false,
          style: {
            stroke: bad ? "rgba(255,100,100,0.85)" : "rgba(160,160,180,0.65)",
            strokeWidth: bad ? 3 : 2,
          },
        };
      }),
    [edges, highlightBadEdges]
  );

  const onConnect = useCallback(
    (c: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...c,
            id: `${c.source}-${c.target}-${Date.now()}`,
            animated: false,
            type: "default",
            style: { stroke: "rgba(160,160,180,0.65)", strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={styledEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      nodesDraggable={draggable}
      nodesConnectable={connectable}
      elementsSelectable={!locked}
      /* ← Critical: without explicit style RF can't measure mouse offsets */
      style={{ width: "100%", height: "100%" }}
      /* Loose mode: connect from anywhere on the node border, not just exact handle */
      connectionMode={ConnectionMode.Loose}
      /* 40px snap radius → much easier to land a connection */
      connectionRadius={40}
      /* Small grid feels better than 16px */
      snapToGrid
      snapGrid={[8, 8]}
      fitView
      minZoom={0.4}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      connectionLineStyle={{
        stroke: "rgba(160,160,180,0.7)",
        strokeWidth: 2,
        strokeDasharray: "6 3",
      }}
      defaultEdgeOptions={{
        type: "default",
        animated: false,
        style: { stroke: "rgba(160,160,180,0.65)", strokeWidth: 2 },
      }}
    >
      <GraphCapture onReady={onReady} />
      <FitViewEffect puzzleId={puzzleId} />
      <Background
        variant={BackgroundVariant.Dots}
        color="rgba(255,255,255,0.05)"
        gap={20}
        size={1.5}
      />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor="rgba(111,255,0,0.2)"
        maskColor="rgba(1,8,40,0.7)"
        style={{ bottom: 60, right: 12 }}
      />
    </ReactFlow>
  );
}

// ── Top-level game controller ───────────────────────────────────────────────
export function WorkflowGame() {
  const { token } = useSession();
  const applyPoints = useMutation(api.quizGame.applyLocalQuizPoints);

  // Start on a random puzzle each session
  const [puzzleIndex, setPuzzleIndex] = useState(() =>
    Math.floor(Math.random() * data.puzzles.length)
  );
  const [resetKey, setResetKey] = useState(0);
  const [seenPuzzleIds, setSeenPuzzleIds] = useState<Set<string>>(
    () => new Set()
  );
  const puzzle = data.puzzles[puzzleIndex]!;

  const [locked, setLocked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackOk, setFeedbackOk] = useState(false);
  const [badEdgeKeys, setBadEdgeKeys] = useState<Set<string>>(new Set());
  const [syncState, setSyncState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const graphRef = useRef<{
    getNodes: () => Node[];
    getEdges: () => Edge[];
  } | null>(null);

  const onGraphReady = useCallback(
    (api: { getNodes: () => Node[]; getEdges: () => Edge[] }) => {
      graphRef.current = api;
    },
    []
  );

  const timer = useWorkflowTimer(puzzle.timeLimitSeconds, !submitted && !locked);

  // Time-up
  useEffect(() => {
    if (timer.expired && !submitted) {
      setLocked(true);
      setFeedbackOk(false);
      setFeedback("⏱ Time's up — hit Submit to see your score.");
    }
  }, [timer.expired, submitted]);

  // Reset state when puzzle changes
  useEffect(() => {
    setSubmitted(false);
    setLocked(false);
    setValidation(null);
    setScore(null);
    setFeedback(null);
    setFeedbackOk(false);
    setBadEdgeKeys(new Set());
    graphRef.current = null;
  }, [puzzle.id]);

  const handleSubmit = useCallback(async () => {
    const g = graphRef.current;
    if (!g) {
      setFeedback("Canvas not ready yet — try again in a moment.");
      return;
    }
    const nodes = flowNodesToJson(g.getNodes(), puzzle);
    const edges = flowEdgesToJson(g.getEdges());
    const v = validatePuzzle(puzzle.mode, puzzle, nodes, edges);
    const sc = computeScore(puzzle, v, timer.remainingSeconds);
    setValidation(v);
    setScore(sc);
    setSubmitted(true);
    setLocked(true);

    const bad = new Set<string>();
    for (const e of v.extraEdges) bad.add(ek(e.source, e.target));
    setBadEdgeKeys(bad);

    if (v.ok) {
      setFeedbackOk(true);
      setFeedback("✓ Perfect — structure matches the solution!");
    } else {
      setFeedbackOk(false);
      const parts: string[] = [];
      if (v.misplacedNodeIds.length)
        parts.push(`${v.misplacedNodeIds.length} node(s) out of place`);
      if (v.missingEdges.length)
        parts.push(`${v.missingEdges.length} missing edge(s)`);
      if (v.extraEdges.length)
        parts.push(`${v.extraEdges.length} extra edge(s)`);
      if (v.orderViolations.length)
        parts.push(`order: ${v.orderViolations[0]}`);
      setFeedback(parts.join(" · ") || "Not quite right — reset and try again.");
    }

    // Persist score to Convex (users.score += sc.total)
    if (sc.total > 0 && token) {
      setSyncState("saving");
      try {
        // Use correctNodes as streak proxy (0–totalNodes)
        await applyPoints({
          sessionToken: token,
          pointsEarned: sc.total,
          streak: v.correctNodes,
        });
        setSyncState("saved");
      } catch {
        setSyncState("error");
      }
    }
  }, [puzzle, timer.remainingSeconds, token, applyPoints]);

  const resetPuzzle = () => {
    setSubmitted(false);
    setLocked(false);
    setValidation(null);
    setScore(null);
    setFeedback(null);
    setFeedbackOk(false);
    setBadEdgeKeys(new Set());
    setSyncState("idle");
    setResetKey((k) => k + 1);
    timer.reset(puzzle.timeLimitSeconds);
    graphRef.current = null;
  };

  /** Pick a random puzzle the player hasn't seen yet this session */
  const nextRandomPuzzle = () => {
    const total = data.puzzles.length;
    const updatedSeen = new Set([...seenPuzzleIds, puzzle.id]);
    // Unseen candidates; if all exhausted, reset pool
    const candidates = data.puzzles
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => !updatedSeen.has(p.id));
    const pool =
      candidates.length > 0
        ? candidates
        : data.puzzles.map((p, i) => ({ p, i })).filter((_, i) => i !== puzzleIndex);

    const { i: nextIdx } = pool[Math.floor(Math.random() * pool.length)] ?? { i: (puzzleIndex + 1) % total };
    setSeenPuzzleIds(candidates.length > 0 ? updatedSeen : new Set([data.puzzles[nextIdx]!.id]));
    setPuzzleIndex(nextIdx);
    setSubmitted(false);
    setLocked(false);
    setValidation(null);
    setScore(null);
    setFeedback(null);
    setFeedbackOk(false);
    setBadEdgeKeys(new Set());
    setSyncState("idle");
    setResetKey((k) => k + 1);
    graphRef.current = null;
  };

  const departmentLabel: Record<string, string> = {
    cs: "Computer Science",
    aiml: "AI / ML",
    electronics: "Electronics",
    maths: "Mathematics",
    bonus: "Bonus",
  };

  const timerFraction = timer.remainingSeconds / puzzle.timeLimitSeconds;
  const timerColor =
    timerFraction > 0.4
      ? "text-neon"
      : timerFraction > 0.2
        ? "text-amber-300"
        : "text-red-400";

  const modeHint =
    puzzle.mode === "arrange"
      ? "Drag nodes into the correct order."
      : puzzle.mode === "connect"
        ? "Draw edges between nodes to connect them. Drag from the dot on one node to another."
        : "Arrange nodes AND draw edges between them.";

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#010828]">
      {/* Background Image & Texture */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/Game-bg.png)" }}
      />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[#010828]/60" />
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: "url(/texture.png)",
          backgroundSize: "cover",
          mixBlendMode: "lighten",
          opacity: 0.4,
        }}
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="liquid-glass relative z-40 flex items-center justify-between border-b border-white/10 px-6 py-3 !rounded-none shadow-[0_4px_30px_rgba(0,0,0,0.3)]"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-4 group">
            <Link
              href="/dashboard"
              className="font-mono text-xs text-neon/60 hover:text-neon hover:drop-shadow-[0_0_8px_rgba(111,255,0,0.8)] transition-all flex items-center gap-2"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Dashboard
            </Link>
            <span className="hidden h-4 w-px bg-white/15 sm:block" />
            <div className="hidden sm:block">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#a694ff]">
                Single-player · timer
              </span>
              <h1 className="font-anton text-lg uppercase text-cream leading-tight tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
                Workflow Graph Lab
              </h1>
            </div>
          </div>

          {/* Puzzle selector using shadcn */}
          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-[10px] uppercase text-cream/40 sm:block">
              Puzzle Level
            </span>
            <Select
              value={String(puzzleIndex)}
              onValueChange={(v: string | null) => {
                if (v == null) return;
                setPuzzleIndex(Number(v));
                setResetKey((k) => k + 1);
              }}
            >
              <SelectTrigger
                className="liquid-glass w-[220px] rounded-xl border border-white/10 px-4 py-2 font-mono text-xs text-cream hover:bg-white/5 transition-all data-[state=open]:border-neon/50 data-[state=open]:shadow-[0_0_20px_rgba(111,255,0,0.1)] [--glass-bg:rgba(0,0,0,0.5)] backdrop-blur-md"
              >
                <SelectValue placeholder="Pick a puzzle" />
              </SelectTrigger>
              <SelectContent className="liquid-glass rounded-xl border border-white/10 text-cream [--glass-bg:rgba(5,10,25,0.95)] backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-1">
                {data.puzzles.map((p, i) => (
                  <SelectItem
                    key={p.id}
                    value={String(i)}
                    className="font-mono text-xs hover:bg-neon/15 hover:text-neon focus:bg-neon/15 focus:text-neon cursor-pointer transition-colors rounded-lg mb-0.5 last:mb-0"
                  >
                    {p.title}{" "}
                    <span className="ml-1 opacity-50">({p.mode})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.header>

      {/* Main layout */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 px-4 py-4">

        {/* Puzzle meta bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="liquid-glass overflow-hidden relative flex flex-col gap-4 rounded-[28px] p-6 sm:flex-row sm:items-center sm:justify-between [--glass-bg:rgba(0,0,0,0.65)] hover:[--glass-bg:rgba(0,0,0,0.8)] transition-all duration-500 shadow-xl group border-white/5"
        >
          {/* Subtle gradient blob behind meta bar */}
          <div className="absolute -left-20 -top-20 w-64 h-64 bg-[#7b5cff]/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

          <div className="min-w-0 relative z-10">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#a694ff] shadow-black drop-shadow-sm">
              {departmentLabel[puzzle.department] ?? puzzle.department}
            </p>
            <h2 className="font-grotesk mt-1 truncate text-3xl tracking-wider text-white drop-shadow-md">
              {puzzle.title}
            </h2>
            <p className="mt-1.5 font-mono text-xs text-cream/70 max-w-2xl leading-relaxed">
              {puzzle.description}
            </p>
            <p className="mt-3 inline-flex items-center rounded-lg border border-neon/30 bg-neon/5 px-3 py-1 text-bold font-mono text-[10px] text-neon shadow-[0_0_10px_rgba(111,255,0,0.05)] backdrop-blur-sm">
              {modeHint}
            </p>
          </div>

          <div className="flex shrink-0 gap-3 font-mono text-sm relative z-10">
            <div className="liquid-glass rounded-[20px] px-6 py-3 text-center [--glass-bg:rgba(111,255,0,0.03)] border-neon/10 shadow-[0_0_15px_rgba(111,255,0,0.05)] transition-all hover:scale-[1.05] hover:shadow-[0_0_20px_rgba(111,255,0,0.15)] group/mode cursor-default">
              <p className="text-[9px] uppercase tracking-widest text-cream/40 group-hover/mode:text-cream/60 transition-colors">Mode</p>
              <p className="mt-0.5 text-sm font-semibold text-neon uppercase drop-shadow-[0_0_8px_rgba(111,255,0,0.6)]">{puzzle.mode}</p>
            </div>
            <div className="liquid-glass rounded-[20px] px-6 py-3 text-center [--glass-bg:rgba(0,0,0,0.5)] border-white/5 transition-all hover:scale-[1.05] hover:border-white/10 group/time cursor-default">
              <p className="text-[9px] uppercase tracking-widest text-cream/40 group-hover/time:text-cream/60 transition-colors">Time</p>
              <p className={`mt-0.5 text-lg leading-none font-semibold tabular-nums drop-shadow-md ${timerColor}`}>
                {timer.remainingSeconds}
                <span className="text-[11px] text-cream/30 px-1 font-normal">/</span>
                <span className="text-[11px] text-cream/40 tabular-nums font-normal">{puzzle.timeLimitSeconds}s</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Feedback banner */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              key={feedback}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`liquid-glass rounded-xl border px-5 py-3 font-mono text-sm shadow-lg backdrop-blur-md transition-all ${feedbackOk
                  ? "[--glass-bg:rgba(111,255,0,0.2)] border-neon/50 text-neon shadow-[0_0_20px_rgba(111,255,0,0.2)]"
                  : "[--glass-bg:rgba(111,255,0,0.1)] border-neon/30 text-cream/90 shadow-[0_0_15px_rgba(111,255,0,0.1)]"
                }`}
            >
              {feedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Canvas + sidebar */}
        <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_260px]">

          {/* React Flow canvas — explicit dimensions so RF can measure correctly */}
          <div
            className="relative min-h-[440px] w-full rounded-[20px] border border-white/12 bg-[#050c1c] shadow-[0_20px_80px_rgba(0,0,0,0.5)]"
            style={{ height: "min(62vh, 640px)" }}
          >
            <ReactFlowProvider key={`${puzzle.id}-${resetKey}`}>
              <WorkflowCanvasInner
                puzzle={puzzle}
                locked={locked}
                highlightBadEdges={badEdgeKeys}
                onReady={onGraphReady}
              />
            </ReactFlowProvider>

            {/* Mode badge overlay */}
            <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/10 bg-[#010828]/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-cream/50 backdrop-blur-sm">
              {puzzle.mode === "arrange" && "Drag nodes to reorder"}
              {puzzle.mode === "connect" && "Draw edges between nodes"}
              {puzzle.mode === "hybrid" && "Arrange + connect"}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-3">

            {/* Scoring info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="liquid-glass relative flex flex-col gap-3 rounded-[28px] p-6 shadow-xl [--glass-bg:rgba(0,0,0,0.5)] hover:[--glass-bg:rgba(0,0,0,0.7)] transition-all duration-500 overflow-hidden border-white/5"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#a694ff]/5 rounded-full blur-3xl" />
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#a694ff] mb-1 relative z-10">
                Scoring Metrics
              </p>
              <ul className="space-y-2 font-mono text-xs text-cream/80 relative z-10">
                {puzzle.scoring.correctNodePoints > 0 && (
                  <li className="flex justify-between items-center group bg-white/[0.02] hover:bg-[#a694ff]/10 rounded-xl px-3 py-2 transition-colors">
                    <span className="group-hover:text-cream transition-colors">Per node</span>
                    <span className="text-neon group-hover:drop-shadow-[0_0_8px_rgba(111,255,0,0.8)] transition-all">+{puzzle.scoring.correctNodePoints}</span>
                  </li>
                )}
                {(puzzle.mode === "connect" || puzzle.mode === "hybrid") && (
                  <li className="flex justify-between items-center group bg-white/[0.02] hover:bg-[#a694ff]/10 rounded-xl px-3 py-2 transition-colors">
                    <span className="group-hover:text-cream transition-colors">Per edge</span>
                    <span className="text-neon group-hover:drop-shadow-[0_0_8px_rgba(111,255,0,0.8)] transition-all">+{puzzle.scoring.correctEdgePoints}</span>
                  </li>
                )}
                <li className="flex justify-between items-center group bg-white/[0.02] hover:bg-[#a694ff]/10 rounded-xl px-3 py-2 transition-colors">
                  <span className="group-hover:text-cream transition-colors">Time bonus</span>
                  <span className="text-sky-300 group-hover:drop-shadow-[0_0_8px_rgba(56,189,248,0.8)] transition-all">up to {puzzle.scoring.timeBonusMax}</span>
                </li>
                {puzzle.scoring.wrongPositionPenalty > 0 && (
                  <li className="flex justify-between items-center group bg-white/[0.02] hover:bg-red-500/10 rounded-xl px-3 py-2 transition-colors">
                    <span className="group-hover:text-cream transition-colors">Wrong position</span>
                    <span className="text-red-400 group-hover:drop-shadow-[0_0_8px_rgba(248,113,113,0.8)] transition-all">−{puzzle.scoring.wrongPositionPenalty}</span>
                  </li>
                )}
                {puzzle.scoring.wrongEdgePenalty > 0 && (
                  <li className="flex justify-between items-center group bg-white/[0.02] hover:bg-red-500/10 rounded-xl px-3 py-2 transition-colors">
                    <span className="group-hover:text-cream transition-colors">Wrong edge</span>
                    <span className="text-red-400 group-hover:drop-shadow-[0_0_8px_rgba(248,113,113,0.8)] transition-all">−{puzzle.scoring.wrongEdgePenalty}</span>
                  </li>
                )}
                <li className="flex justify-between items-center pt-2 mt-2 px-3">
                  <span className="text-cream/40 text-[10px]">Tolerance Radius</span>
                  <span className="text-cream/60 text-[10px]">{puzzle.scoring.positionTolerancePx}px</span>
                </li>
              </ul>
            </motion.div>

            {/* Score result */}
            <AnimatePresence mode="wait">
              {score && validation && (
                <motion.div
                  key="score"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className={`liquid-glass relative flex flex-col gap-2 rounded-[28px] p-6 shadow-2xl transition-all duration-500 ${validation.ok
                      ? "[--glass-border-start:rgba(111,255,0,0.5)] [--glass-bg:rgba(111,255,0,0.08)] hover:shadow-[0_0_40px_rgba(111,255,0,0.25)]"
                      : "[--glass-bg:rgba(0,0,0,0.7)] hover:[--glass-bg:rgba(0,0,0,0.85)] border-red-500/20 hover:shadow-xl"
                    }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-cream/50">
                      Final Result
                    </p>
                    {syncState === "saving" && (
                      <span className="font-mono text-[10px] text-cream/50 animate-pulse">
                        Saving Data…
                      </span>
                    )}
                    {syncState === "saved" && (
                      <span className="font-mono text-[10px] text-neon drop-shadow-[0_0_8px_rgba(111,255,0,0.8)]">
                        ✓ Recorded
                      </span>
                    )}
                    {syncState === "error" && (
                      <span className="font-mono text-[10px] text-red-400">
                        ✗ Network Error
                      </span>
                    )}
                  </div>
                  <p className={`font-anton text-[3.5rem] leading-tight drop-shadow-xl mt-3 ${validation.ok ? 'text-neon' : 'text-cream'}`}>
                    +{score.total} <span className="font-mono text-sm tracking-widest opacity-40 uppercase ml-1 align-middle inline-block -translate-y-2">XP</span>
                  </p>
                  <div className="mt-4 space-y-2 font-mono text-xs text-cream/70">
                    <div className="flex justify-between bg-black/20 px-3 py-2 rounded-xl backdrop-blur-sm">
                      <span>Nodes Mapped</span>
                      <span className={validation.correctNodes === validation.totalNodes ? 'text-neon drop-shadow-md' : 'text-cream'}>{validation.correctNodes}/{validation.totalNodes}</span>
                    </div>
                    <div className="flex justify-between bg-black/20 px-3 py-2 rounded-xl backdrop-blur-sm">
                      <span>Edges Connected</span>
                      <span className={validation.correctEdges === validation.totalEdges ? 'text-neon drop-shadow-md' : 'text-cream'}>{validation.correctEdges}/{validation.totalEdges}</span>
                    </div>
                    <div className="flex justify-between bg-sky-500/5 px-3 py-2 rounded-xl backdrop-blur-sm border border-sky-500/10">
                      <span>Time Bonus</span>
                      <span className="text-sky-300 drop-shadow-md">+{score.timeBonus}</span>
                    </div>
                    <div className="flex justify-between bg-red-500/5 px-3 py-2 rounded-xl backdrop-blur-sm border border-red-500/10 hover:border-red-500/30 transition-colors">
                      <span className="text-red-300">Penalties Applied</span>
                      <span className="text-red-400 font-bold drop-shadow-md">−{score.penalties}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-auto flex flex-col gap-3"
            >
              <button
                type="button"
                disabled={submitted}
                onClick={handleSubmit}
                className="liquid-glass group relative w-full flex-1 rounded-[20px] px-4 py-5 text-center font-anton text-xl uppercase tracking-widest transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 hover:scale-[1.03] [--glass-bg:rgba(111,255,0,0.1)] [--glass-border-start:rgba(111,255,0,0.5)] hover:shadow-[0_10px_40px_rgba(111,255,0,0.25)] text-neon cursor-pointer shadow-xl active:scale-[0.98]"
              >
                <div className="absolute inset-0 rounded-[20px] bg-gradient-to-tr from-neon/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative z-10 group-hover:drop-shadow-[0_0_12px_rgba(111,255,0,0.9)] transition-all">
                  {submitted ? "Submitted ✓" : "Commit Solution"}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={resetPuzzle}
                  className="liquid-glass rounded-[16px] px-2 py-3.5 font-mono text-xs uppercase tracking-widest text-[#a694ff] hover:text-white transition-all border border-[#a694ff]/20 hover:[--glass-bg:rgba(166,148,255,0.15)] shadow-md hover:border-[#a694ff]/50 cursor-pointer active:scale-95 text-center"
                >
                  Reset
                </button>
                {submitted ? (
                  <button
                    type="button"
                    onClick={nextRandomPuzzle}
                    className="liquid-glass rounded-[16px] px-2 py-3.5 font-mono text-[10px] sm:text-xs uppercase tracking-widest text-sky-400 transition-all border border-sky-400/20 hover:text-white hover:[--glass-bg:rgba(56,189,248,0.2)] shadow-md hover:shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:border-sky-400 cursor-pointer active:scale-95 text-center"
                  >
                    Next →
                  </button>
                ) : (
                  <div className="liquid-glass rounded-[16px] px-2 py-3.5 font-mono text-[10px] uppercase tracking-widest text-cream/20 border border-white/5 text-center cursor-not-allowed bg-black/20">
                    Next Lock
                  </div>
                )}
              </div>
            </motion.div>
          </aside>
        </div>
      </div>
    </div>
  );
}
