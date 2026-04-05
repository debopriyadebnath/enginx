export type MindSnapScoring = {
  correctClick: number;
  wrongClick: number;
  missedPenalty: number;
};

export type MindSnapCellTarget = {
  row: number;
  col: number;
  value: string;
};

export type MindSnapPuzzle = {
  id: string;
  mode: string;
  department: string;
  difficulty: number;
  displayTime: number;
  recallTime: number;
  grid: string[][];
  correctCells: MindSnapCellTarget[];
  scoring: MindSnapScoring;
  hint: string;
  explanation: string;
};

export type MindSnapPack = {
  puzzles: MindSnapPuzzle[];
};
