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
    <div className="relative flex min-h-[100dvh] flex-col bg-[#010828]">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-30"
        style={{
          backgroundImage: "url(/texture.png)",
          backgroundSize: "cover",
          mixBlendMode: "lighten",
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-[#010828]/85 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="font-mono text-xs text-neon/80 hover:text-neon hover:underline"
            >
              ← Dashboard
            </Link>
            <span className="hidden h-4 w-px bg-white/15 sm:block" />
            <div className="hidden sm:block">
              <span className="font-mono text-[10px] uppercase tracking-widest text-cream/40">
                Single-player · timer
              </span>
              <h1 className="font-anton text-lg uppercase text-cream leading-tight">
                Workflow Graph Lab
              </h1>
            </div>
          </div>

          {/* Puzzle selector using shadcn */}
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-[10px] uppercase text-cream/40 sm:block">
              Puzzle
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
                className="w-[220px] rounded-xl border border-white/15 bg-[#0a1228] px-3 py-2 font-mono text-xs text-cream hover:bg-[#111c3a] data-[state=open]:border-neon/50"
              >
                <SelectValue placeholder="Pick a puzzle" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-white/15 bg-[#0a1228] text-cream">
                {data.puzzles.map((p, i) => (
                  <SelectItem
                    key={p.id}
                    value={String(i)}
                    className="font-mono text-xs hover:bg-neon/10 focus:bg-neon/10 focus:text-neon"
                  >
                    {p.title}{" "}
                    <span className="ml-1 text-cream/40">({p.mode})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 px-4 py-4">

        {/* Puzzle meta bar */}
        <div className="flex flex-col gap-3 rounded-[18px] border border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-cream/40">
              {departmentLabel[puzzle.department] ?? puzzle.department}
            </p>
            <h2 className="font-grotesk mt-0.5 truncate text-lg text-cream">
              {puzzle.title}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-cream/55">
              {puzzle.description}
            </p>
            <p className="mt-1.5 rounded-lg border border-neon/20 bg-neon/[0.06] px-2 py-1 font-mono text-[10px] text-neon/80 inline-block">
              {modeHint}
            </p>
          </div>

          <div className="flex shrink-0 gap-3 font-mono text-sm">
            <div className="rounded-xl border border-neon/25 bg-neon/[0.07] px-4 py-2 text-center">
              <p className="text-[9px] uppercase text-cream/40">Mode</p>
              <p className="mt-0.5 text-xs font-semibold text-cream uppercase">{puzzle.mode}</p>
            </div>
            <div className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2 text-center">
              <p className="text-[9px] uppercase text-cream/40">Time</p>
              <p className={`mt-0.5 text-sm font-semibold tabular-nums ${timerColor}`}>
                {timer.remainingSeconds}
                <span className="text-[10px] text-cream/40">
                  /{puzzle.timeLimitSeconds}s
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Feedback banner */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              key={feedback}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`rounded-xl border px-4 py-2.5 font-mono text-xs ${
                feedbackOk
                  ? "border-neon/35 bg-neon/[0.08] text-neon"
                  : "border-white/12 bg-white/[0.04] text-cream/80"
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
            <div className="rounded-[18px] border border-white/10 bg-white/[0.025] p-4">
              <p className="font-mono text-[9px] uppercase tracking-widest text-cream/40">
                Scoring
              </p>
              <ul className="mt-2 space-y-1.5 font-mono text-[11px] text-cream/65">
                {puzzle.scoring.correctNodePoints > 0 && (
                  <li className="flex justify-between">
                    <span>Per node</span>
                    <span className="text-neon">+{puzzle.scoring.correctNodePoints}</span>
                  </li>
                )}
                {(puzzle.mode === "connect" || puzzle.mode === "hybrid") && (
                  <li className="flex justify-between">
                    <span>Per edge</span>
                    <span className="text-neon">+{puzzle.scoring.correctEdgePoints}</span>
                  </li>
                )}
                <li className="flex justify-between">
                  <span>Time bonus</span>
                  <span className="text-sky-300">up to {puzzle.scoring.timeBonusMax}</span>
                </li>
                {puzzle.scoring.wrongPositionPenalty > 0 && (
                  <li className="flex justify-between">
                    <span>Wrong position</span>
                    <span className="text-red-400">−{puzzle.scoring.wrongPositionPenalty}</span>
                  </li>
                )}
                {puzzle.scoring.wrongEdgePenalty > 0 && (
                  <li className="flex justify-between">
                    <span>Wrong edge</span>
                    <span className="text-red-400">−{puzzle.scoring.wrongEdgePenalty}</span>
                  </li>
                )}
                <li className="flex justify-between border-t border-white/8 pt-1">
                  <span>Tolerance</span>
                  <span className="text-cream/50">{puzzle.scoring.positionTolerancePx}px</span>
                </li>
              </ul>
            </div>

            {/* Score result */}
            <AnimatePresence mode="wait">
              {score && validation && (
                <motion.div
                  key="score"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`rounded-[18px] border p-4 ${
                    validation.ok
                      ? "border-neon/35 bg-neon/[0.07]"
                      : "border-white/10 bg-white/[0.025]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-cream/40">
                      Result
                    </p>
                    {syncState === "saving" && (
                      <span className="font-mono text-[9px] text-cream/40">
                        Saving…
                      </span>
                    )}
                    {syncState === "saved" && (
                      <span className="font-mono text-[9px] text-neon">
                        ✓ Saved to profile
                      </span>
                    )}
                    {syncState === "error" && (
                      <span className="font-mono text-[9px] text-red-400">
                        ✗ Save failed
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-anton text-4xl text-cream">
                    +{score.total}
                  </p>
                  <div className="mt-2 space-y-1 font-mono text-[10px] text-cream/55">
                    <div className="flex justify-between">
                      <span>Nodes</span>
                      <span>{validation.correctNodes}/{validation.totalNodes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Edges</span>
                      <span>{validation.correctEdges}/{validation.totalEdges}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time bonus</span>
                      <span className="text-sky-300">+{score.timeBonus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Penalties</span>
                      <span className="text-red-400">−{score.penalties}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="mt-auto flex flex-col gap-2">
              <button
                type="button"
                disabled={submitted}
                onClick={handleSubmit}
                className="rounded-xl bg-neon px-4 py-3 font-anton uppercase tracking-wide text-[#010828] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitted ? "Submitted ✓" : "Submit solution"}
              </button>
              <button
                type="button"
                onClick={resetPuzzle}
                className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 font-mono text-xs text-cream/80 transition hover:bg-white/[0.09] hover:text-cream"
              >
                Reset puzzle
              </button>
              {submitted && (
                <button
                  type="button"
                  onClick={nextRandomPuzzle}
                  className="rounded-xl border border-neon/40 bg-neon/10 px-4 py-2.5 font-mono text-xs text-neon transition hover:bg-neon/20"
                >
                  Next random puzzle →
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
