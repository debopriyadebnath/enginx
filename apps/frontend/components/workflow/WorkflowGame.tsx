"use client";

import "@xyflow/react/dist/style.css";

import { AnimatePresence, motion } from "framer-motion";
import {
  Background,
  Controls,
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
import { WorkflowNode } from "./WorkflowNode";
import { flowEdgesToJson, flowNodesToJson } from "./flowUtils";

const data = pack as WorkflowPack;

const nodeTypes = { workflow: WorkflowNode };

function edgeKey(source: string, target: string) {
  return `${source}|${target}`;
}

function FitViewEffect({ puzzleId }: { puzzleId: string }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      fitView({ padding: 0.22, duration: 280 });
    });
    return () => window.cancelAnimationFrame(id);
  }, [puzzleId, fitView]);
  return null;
}

function GraphCapture({
  onReady,
}: {
  onReady: (api: {
    getNodes: () => Node[];
    getEdges: () => Edge[];
  }) => void;
}) {
  const rf = useReactFlow();
  useEffect(() => {
    onReady({
      getNodes: () => rf.getNodes(),
      getEdges: () => rf.getEdges(),
    });
  }, [rf, onReady]);
  return null;
}

function WorkflowCanvasInner({
  puzzle,
  locked,
  highlightBadEdges,
  onReady,
}: {
  puzzle: WorkflowPuzzle;
  locked: boolean;
  highlightBadEdges: Set<string>;
  onReady: (api: {
    getNodes: () => Node[];
    getEdges: () => Edge[];
  }) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    nodesToFlow(puzzle.shuffledNodes, puzzle.layoutAxis)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    edgesToFlow(puzzle.shuffledEdges)
  );

  useEffect(() => {
    setNodes(nodesToFlow(puzzle.shuffledNodes, puzzle.layoutAxis));
    setEdges(edgesToFlow(puzzle.shuffledEdges));
  }, [puzzle.id, puzzle, setEdges, setNodes]);

  const draggable = !locked && (puzzle.mode === "arrange" || puzzle.mode === "hybrid");
  const connectable = !locked && (puzzle.mode === "connect" || puzzle.mode === "hybrid");

  const styledEdges = useMemo(() => {
    return edges.map((e) => {
      const k = edgeKey(e.source, e.target);
      const bad = highlightBadEdges.has(k);
      return {
        ...e,
        animated: !bad,
        style: {
          ...e.style,
          stroke: bad ? "rgba(255, 80, 80, 0.95)" : "rgba(111, 255, 0, 0.55)",
          strokeWidth: bad ? 3 : 2,
        },
      };
    });
  }, [edges, highlightBadEdges]);

  const onConnect = useCallback(
    (c: Connection) => {
      if (!connectable) return;
      const uid =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now());
      setEdges((eds) =>
        addEdge(
          {
            ...c,
            id: `${c.source}-${c.target}-${uid}`,
            animated: true,
            style: { stroke: "rgba(111, 255, 0, 0.55)", strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [connectable, setEdges]
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
      snapToGrid
      snapGrid={[16, 16]}
      fitView
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{
        type: "smoothstep",
        style: { strokeWidth: 2 },
      }}
    >
      <GraphCapture onReady={onReady} />
      <FitViewEffect puzzleId={puzzle.id} />
      <Background color="rgba(255,255,255,0.04)" gap={20} />
      <Controls
        className="!border-white/15 !bg-[#0a1228]/95 !shadow-lg [&_button]:!fill-cream"
        showInteractive={false}
      />
    </ReactFlow>
  );
}

export function WorkflowGame() {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const puzzle = data.puzzles[puzzleIndex]!;
  const [locked, setLocked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [badEdgeKeys, setBadEdgeKeys] = useState<Set<string>>(new Set());

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

  const timerEnabled = !submitted && !locked;
  const timer = useWorkflowTimer(puzzle.timeLimitSeconds, timerEnabled);

  useEffect(() => {
    if (timer.expired && !submitted) {
      setLocked(true);
      setFeedback("Time's up — submit to see your score.");
    }
  }, [timer.expired, submitted]);

  useEffect(() => {
    setSubmitted(false);
    setLocked(false);
    setValidation(null);
    setScore(null);
    setFeedback(null);
    setBadEdgeKeys(new Set());
    graphRef.current = null;
  }, [puzzle.id]);

  const handleSubmit = useCallback(() => {
    const g = graphRef.current;
    if (!g) {
      setFeedback("Canvas not ready yet.");
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
    for (const e of v.extraEdges) {
      bad.add(edgeKey(e.source, e.target));
    }
    setBadEdgeKeys(bad);

    if (v.ok) {
      setFeedback("Perfect — structure matches the solution.");
    } else {
      const parts: string[] = [];
      if (v.misplacedNodeIds.length)
        parts.push(`${v.misplacedNodeIds.length} node(s) out of place`);
      if (v.missingEdges.length)
        parts.push(`${v.missingEdges.length} missing edge(s)`);
      if (v.extraEdges.length)
        parts.push(`${v.extraEdges.length} extra edge(s)`);
      if (v.orderViolations.length)
        parts.push(`order: ${v.orderViolations[0]}`);
      setFeedback(parts.join(" · ") || "Not quite — reset and try again.");
    }
  }, [puzzle, timer.remainingSeconds]);

  const departmentLabel = useMemo(() => {
    const d = puzzle.department;
    const map: Record<string, string> = {
      cs: "Computer Science",
      aiml: "AI / ML",
      electronics: "Electronics",
      maths: "Mathematics",
      bonus: "Bonus",
    };
    return map[d] ?? d;
  }, [puzzle.department]);

  const resetPuzzle = () => {
    setSubmitted(false);
    setLocked(false);
    setValidation(null);
    setScore(null);
    setFeedback(null);
    setBadEdgeKeys(new Set());
    setResetKey((k) => k + 1);
    timer.reset(puzzle.timeLimitSeconds);
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[#010828]">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-35"
        style={{
          backgroundImage: "url(/texture.png)",
          backgroundSize: "cover",
          mixBlendMode: "lighten",
        }}
      />

      <header className="relative z-10 border-b border-white/10 bg-[#010828]/80 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/play"
              className="font-mono text-xs text-neon/85 hover:underline"
            >
              ← Back to play
            </Link>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neon/80">
              Single-player · timer
            </p>
            <h1 className="font-anton text-2xl uppercase text-cream">
              Workflow graph lab
            </h1>
            <p className="mt-1 max-w-xl font-mono text-xs text-cream/65">
              Arrange nodes and/or connect edges to match the engineering
              structure. Puzzles load from{" "}
              <code className="text-neon/90">workflow.json</code>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="font-mono text-[10px] uppercase text-cream/45">
              Puzzle
            </label>
            <select
              value={puzzleIndex}
              onChange={(e) => {
                setPuzzleIndex(Number(e.target.value));
                setResetKey((k) => k + 1);
              }}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-mono text-xs text-cream"
            >
              {data.puzzles.map((p, i) => (
                <option key={p.id} value={i}>
                  {p.title} ({p.mode})
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6">
        <div className="liquid-glass flex flex-col gap-3 rounded-[20px] border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-cream/45">
              {departmentLabel}
            </p>
            <h2 className="font-grotesk text-lg text-cream">{puzzle.title}</h2>
            <p className="mt-1 font-mono text-xs text-cream/60">
              {puzzle.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 font-mono text-sm">
            <div className="rounded-xl border border-neon/25 bg-neon/[0.07] px-4 py-2">
              <p className="text-[10px] uppercase text-cream/50">Mode</p>
              <p className="text-cream">{puzzle.mode}</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2">
              <p className="text-[10px] uppercase text-cream/50">Time left</p>
              <p
                className={
                  timer.remainingSeconds <= 10
                    ? "text-amber-300"
                    : "text-cream"
                }
              >
                {timer.remainingSeconds}s / {puzzle.timeLimitSeconds}s
              </p>
            </div>
          </div>
        </div>

        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/12 bg-white/[0.05] px-4 py-3 font-mono text-xs text-cream/85"
          >
            {feedback}
          </motion.div>
        )}

        <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_280px]">
          <div className="relative h-[min(62vh,640px)] min-h-[420px] w-full overflow-hidden rounded-[20px] border border-white/12 bg-[#050c1c] shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <ReactFlowProvider key={`${puzzle.id}-${resetKey}`}>
              <WorkflowCanvasInner
                puzzle={puzzle}
                locked={locked}
                highlightBadEdges={badEdgeKeys}
                onReady={onGraphReady}
              />
            </ReactFlowProvider>
          </div>

          <aside className="flex flex-col gap-3">
            <div className="liquid-glass rounded-[20px] border border-white/10 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-cream/45">
                Scoring
              </p>
              <ul className="mt-2 space-y-1 font-mono text-[11px] leading-relaxed text-cream/70">
                <li>Nodes: +{puzzle.scoring.correctNodePoints} each</li>
                {(puzzle.mode === "connect" || puzzle.mode === "hybrid") && (
                  <li>Edges: +{puzzle.scoring.correctEdgePoints} each</li>
                )}
                <li>Time bonus: up to {puzzle.scoring.timeBonusMax}</li>
                <li>Position tolerance: {puzzle.scoring.positionTolerancePx}px</li>
              </ul>
            </div>

            <AnimatePresence mode="wait">
              {score && validation && (
                <motion.div
                  key="score"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="liquid-glass rounded-[20px] border border-neon/30 bg-neon/[0.06] p-4"
                >
                  <p className="font-mono text-[10px] uppercase text-neon/80">
                    Result
                  </p>
                  <p className="mt-2 font-anton text-3xl text-cream">
                    {score.total}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-cream/65">
                    Nodes {validation.correctNodes}/{validation.totalNodes} · Edges{" "}
                    {validation.correctEdges}/{validation.totalEdges} · Time +{score.timeBonus}{" "}
                    · Penalties −{score.penalties}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-auto flex flex-col gap-2">
              <button
                type="button"
                disabled={submitted}
                onClick={handleSubmit}
                className="rounded-xl bg-neon px-4 py-3 font-anton uppercase tracking-wide text-[#010828] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitted ? "Submitted" : "Submit solution"}
              </button>
              <button
                type="button"
                onClick={resetPuzzle}
                className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 font-mono text-xs text-cream hover:bg-white/[0.08]"
              >
                Reset puzzle
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
