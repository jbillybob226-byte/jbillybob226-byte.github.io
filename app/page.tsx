"use client";
import { useState, useRef, useEffect } from "react";
import Fraction from "fraction.js";
import { ArrowLeft, ArrowRight, Lightbulb, Bolt, Dice5, Edit, ArrowLeftRight, Plus, X, AlertCircle, Check } from "lucide-react";

// Matrix utilities (from matrixState.ts)
function randomInt(min: number, max: number): Fraction {
  const rand = Math.floor(Math.random() * (max - min + 1) + min);
  return new Fraction(rand, 1);
}

function createMatrix(rows: number, columns: number): Fraction[][] {
  const matrix: Fraction[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Fraction[] = [];
    for (let c = 0; c < columns; c++) {
      row.push(randomInt(-10, 10));
    }
    matrix.push(row);
  }
  if (solver.hasContradiction(matrix)) {
    return createMatrix(rows, columns);
  }
  return matrix;
}

function cloneMatrix(matrix: Fraction[][]): Fraction[][] {
  const newMatrix: Fraction[][] = [];
  for (let r = 0; r < matrix.length; r++) {
    const newRow: Fraction[] = [];
    for (let c = 0; c < matrix[r].length; c++) {
      newRow.push(matrix[r][c].clone());
    }
    newMatrix.push(newRow);
  }
  return newMatrix;
}

class matrixSolution {
  private solution: Fraction[][][] = [];
  private cursor: number = 0;

  constructor(initialMatrix: Fraction[][]) {
    this.add(initialMatrix);
  }

  getSolution(): Fraction[][][] {
    return this.solution.map(matrix => cloneMatrix(matrix));
  }

  add(matrix: Fraction[][]) {
    if (this.cursor !== this.solution.length - 1) {
      this.solution = this.solution.slice(0, this.cursor + 1);
    }
    const matrixClone = cloneMatrix(matrix);
    this.solution.push(matrixClone);
    this.cursor = this.solution.length - 1;
  }

  canUndo(): boolean {
    return this.cursor > 0;
  }

  canRedo(): boolean {
    return this.cursor < this.solution.length - 1;
  }

  undo(): Fraction[][] | undefined {
    if (this.canUndo() === false) {
      return undefined;
    }
    this.cursor--;
    return cloneMatrix(this.solution[this.cursor]);
  }

  redo(): Fraction[][] | undefined {
    if (this.canRedo() === false) {
      return undefined;
    }
    this.cursor++;
    return cloneMatrix(this.solution[this.cursor]);
  }

  displayedState(): Fraction[][] {
    return cloneMatrix(this.solution[this.cursor]);
  }
}

// Operations (from operations.ts)
type ErrorCode = "DIVIDE_BY_ZERO" | "MULTIPLY_BY_ZERO" | "ROW_DNE" | "SAME_ROW";
type operationOutput = { success: true; matrix: Fraction[][] } | { success: false; errorCode: ErrorCode };
type solverOutput = { success: true; matrix: Fraction[][], solverHistory: matrixSolution } | { success: false; matrix: Fraction[][], solverHistory: matrixSolution };

const actions = {
  multiplyRow(rowToMod: number, factor: Fraction, displayed: Fraction[][], history: matrixSolution): operationOutput {
    if (factor.equals(0)) {
      return { success: false, errorCode: "MULTIPLY_BY_ZERO" };
    }
    if (rowToMod < 0 || rowToMod > displayed.length - 1) {
      return { success: false, errorCode: "ROW_DNE" };
    }
    const currentMatrix = cloneMatrix(displayed);
    for (let c = 0; c < currentMatrix[rowToMod].length; c++) {
      currentMatrix[rowToMod][c] = currentMatrix[rowToMod][c].mul(factor);
    }
    history.add(currentMatrix);
    return { success: true, matrix: currentMatrix };
  },

  addRows(rowToMod: number, rowToAdd: number, factor: Fraction, displayed: Fraction[][], history: matrixSolution): operationOutput {
    if (factor.equals(0)) {
      return { success: false, errorCode: "MULTIPLY_BY_ZERO" };
    }
    if (rowToMod < 0 || rowToMod > displayed.length - 1) {
      return { success: false, errorCode: "ROW_DNE" };
    }
    if (rowToAdd < 0 || rowToAdd > displayed.length - 1) {
      return { success: false, errorCode: "ROW_DNE" };
    }
    const currentMatrix = cloneMatrix(displayed);
    for (let c = 0; c < currentMatrix[rowToMod].length; c++) {
      currentMatrix[rowToMod][c] = currentMatrix[rowToMod][c].add(currentMatrix[rowToAdd][c].mul(factor));
    }
    history.add(currentMatrix);
    return { success: true, matrix: currentMatrix };
  },

  swapRows(rowA: number, rowB: number, displayed: Fraction[][], history: matrixSolution): operationOutput {
    if (rowA === rowB) {
      return { success: false, errorCode: "SAME_ROW" };
    }
    if (rowA < 0 || rowA > displayed.length - 1) {
      return { success: false, errorCode: "ROW_DNE" };
    }
    if (rowB < 0 || rowB > displayed.length - 1) {
      return { success: false, errorCode: "ROW_DNE" };
    }
    const currentMatrix = cloneMatrix(displayed);
    const tempRow = currentMatrix[rowA];
    currentMatrix[rowA] = currentMatrix[rowB];
    currentMatrix[rowB] = tempRow;
    history.add(currentMatrix);
    return { success: true, matrix: currentMatrix };
  }
};

const solver = {
  hasContradiction(matrix: Fraction[][]): boolean {
    for (let r = 0; r < matrix.length; r++) {
      let allZeros = true;
      for (let c = 0; c < matrix[r].length - 1; c++) {
        if (!matrix[r][c].equals(0)) {
          allZeros = false;
        }
      }
      if (allZeros && !matrix[r][matrix[r].length - 1].equals(0)) {
        return true;
      }
    }
    return false;
  },

  hasCorrectZeros(matrix: Fraction[][], diagonalIndex: number, rowToCheck: number): boolean {
    for (let c = 0; c < diagonalIndex; c++) {
      if (!matrix[rowToCheck][c].equals(0)) {
        return false;
      }
    }
    return true;
  },

  isSolved(matrix: Fraction[][]): boolean {
    let isSolved = true;
    let allZeroColumns: number[] = [];
    let allZeroColumn: boolean = false;
    for (let c = 0; c < matrix[0].length - 1; c++) {
      allZeroColumn = true;
      for (let r = 0; r < matrix.length; r++) {
        if (!matrix[r][c].equals(0)) {
          allZeroColumn = false;
          break;
        }
      }
      if (allZeroColumn) {
        allZeroColumns.push(c);
      }
    }
    for (let r = 0; r < matrix.length; r++) {
      if (!this.hasCorrectZeros(matrix, r, r)) {
        isSolved = false;
        return isSolved;
      }
      if (r !== matrix.length - 1 && !matrix[r][r].equals(1) && !allZeroColumns.includes(r)) {
        isSolved = false;
        return isSolved;
      }
    }
    return isSolved;
  },

  autoSolve(matrix: Fraction[][]): solverOutput {
    let currentMatrix = cloneMatrix(matrix);
    let solverHistory = new matrixSolution(currentMatrix);
    let result: operationOutput;
    let validCandidate: boolean;
    let exclusionList: number[] = [];
    let candidateCount = 0;

    for (let row = 0; row < currentMatrix.length; row++) {
      candidateCount = 0;
      let candidate = -1;
      for (let r = 0; r < currentMatrix.length; r++) {
        if (!currentMatrix[r][row].equals(0) && !exclusionList.includes(r)) {
          if (candidate === -1) {
            candidate = r;
          }
          candidateCount++;
        }
      }
      if (candidateCount === 1 && row !== currentMatrix.length - 1) {
        result = actions.swapRows(row, candidate, currentMatrix, solverHistory);
        exclusionList.push(row);
        if (result.success) {
          currentMatrix = result.matrix;
        }
      }
    }

    for (let row = 0; row < currentMatrix.length; row++) {
      let candidate = -1;
      if (currentMatrix[row][row].equals(0)) {
        for (let r = row; r < currentMatrix.length; r++) {
          if (!currentMatrix[r][row].equals(0) && !exclusionList.includes(r)) {
            candidate = r;
            break;
          }
        }
        if (candidate !== -1) {
          result = actions.swapRows(row, candidate, currentMatrix, solverHistory);
          if (result.success) {
            currentMatrix = result.matrix;
          }
        }
      }
    }

    for (let row = 0; row < currentMatrix.length; row++) {
      let candidate = -1;
      if (this.hasContradiction(currentMatrix)) {
        return { success: false, matrix: currentMatrix, solverHistory: solverHistory };
      }
      if (!this.hasCorrectZeros(currentMatrix, row, row)) {
        for (let c = 0; c < row; c++) {
          if (!currentMatrix[row][c].equals(0)) {
            validCandidate = false;
            candidate = -1;
            for (let r = 0; r < currentMatrix.length && !validCandidate; r++) {
              if (!currentMatrix[r][c].equals(0) && this.hasCorrectZeros(currentMatrix, c, r) && r !== row) {
                candidate = r;
                validCandidate = true;
                break;
              }
            }
            if (validCandidate) {
              result = actions.addRows(row, candidate, currentMatrix[row][c].div(currentMatrix[candidate][c]).neg(), currentMatrix, solverHistory);
              if (result.success) {
                currentMatrix = result.matrix;
              }
              if (this.hasContradiction(currentMatrix)) {
                return { success: false, matrix: currentMatrix, solverHistory: solverHistory };
              }
            }
          }
        }
      }
      if ((row === currentMatrix.length - 1 && !currentMatrix[row][row].equals(0) && !currentMatrix[row][row].equals(1)) || (row !== currentMatrix.length - 1 && !currentMatrix[row][row].equals(1))) {
        validCandidate = false;
        for (let r = 0; r < currentMatrix.length && !validCandidate; r++) {
          validCandidate = false;
          if (!currentMatrix[r][row].equals(0) && this.hasCorrectZeros(currentMatrix, row, r)) {
            candidate = r;
            validCandidate = true;
            break;
          }
        }
        if (validCandidate) {
          result = actions.addRows(row, candidate, currentMatrix[row][row].sub(1).neg().div(currentMatrix[candidate][row]), currentMatrix, solverHistory);
          if (result.success) {
            currentMatrix = result.matrix;
          }
        }
      }
    }
    return { success: true, matrix: currentMatrix, solverHistory: solverHistory };
  },

  giveHint(matrix: Fraction[][]): Fraction[][] | undefined {
    if (this.isSolved(matrix)) {
      return undefined;
    }
    return this.autoSolve(matrix).solverHistory.getSolution()[1];
  }
};

// Matrix Display Component
function MatrixDisplay({ matrix, title, isHint = false, isClickable = false, selectedRows = [], onRowClick }: {
  matrix: Fraction[][];
  title?: string;
  isHint?: boolean;
  isClickable?: boolean;
  selectedRows?: number[];
  onRowClick?: (index: number) => void;
}) {
  return (
    <div style={{ marginBottom: "20px" }}>
      {title && (
        <div style={{
          margin: "0 0 12px 0",
          fontSize: "13px",
          fontWeight: "600",
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          {title}
        </div>
      )}
      <table style={{
        borderCollapse: "separate",
        borderSpacing: 0,
        fontFamily: "monospace",
        fontSize: isHint ? "14px" : "16px",
        boxShadow: isHint ? "0 4px 16px rgba(16, 185, 129, 0.15)" : "0 4px 20px rgba(0, 0, 0, 0.08)",
        border: isHint ? "2px solid #10b981" : "1px solid #e2e8f0",
        borderRadius: "12px",
        backgroundColor: "white",
        overflow: "hidden"
      }}>
        <tbody>
          {matrix.map((row, r) => (
            <tr
              key={r}
              onClick={() => isClickable && onRowClick?.(r)}
              style={{
                cursor: isClickable ? "pointer" : "default",
                backgroundColor: isClickable && selectedRows.includes(r)
                  ? (selectedRows[0] === r ? "#10b981" : "#3b82f6")
                  : r % 2 === 0 ? "#ffffff" : "#f8fafc",
                color: isClickable && selectedRows.includes(r) ? "white" : "#1e293b",
                transition: "all 0.15s ease",
              }}
            >
              {row.map((cell, c) => (
                <td
                  key={c}
                  style={{
                    border: "none",
                    borderRight: c < row.length - 1 ? "1px solid #e2e8f0" : "none",
                    borderBottom: r < matrix.length - 1 ? "1px solid #e2e8f0" : "none",
                    padding: isHint ? "10px 16px" : "14px 20px",
                    textAlign: "center",
                    minWidth: isHint ? "60px" : "80px",
                    fontWeight: "500",
                    borderLeft: c === row.length - 1 ? "3px solid #94a3b8" : "none",
                  }}
                >
                  {cell.toFraction(false)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Home() {
  const [matrix, setMatrix] = useState<Fraction[][] | null>(null);
  const userSolutionRef = useRef<matrixSolution | null>(null);
  const [solverHistory, setSolverHistory] = useState<Fraction[][][] | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [operation, setOperation] = useState<"swap" | "add" | "multiply">("swap");
  const [factorNum, setFactorNum] = useState("1");
  const [factorDen, setFactorDen] = useState("1");
  const [hint, setHint] = useState<Fraction[][] | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputs, setCustomInputs] = useState<string[][]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const m = createMatrix(3, 4);
    setMatrix(m);
    userSolutionRef.current = new matrixSolution(m);
  }, []);

  function syncUndoRedo() {
    if (userSolutionRef.current) {
      setCanUndo(userSolutionRef.current.canUndo());
      setCanRedo(userSolutionRef.current.canRedo());
    }
  }

  function rerollMatrix() {
    const m = createMatrix(3, 4);
    setMatrix(m);
    userSolutionRef.current = new matrixSolution(m);
    setSolverHistory(null);
    setHint(null);
    setSelectedRows([]);
    setErrorMessage("");
    syncUndoRedo();
  }

  function openCustomInput() {
    if (!matrix) return;
    const inputs = matrix.map(row => row.map(cell => cell.toFraction(false)));
    setCustomInputs(inputs);
    setShowCustomInput(true);
    setErrorMessage("");
  }

  function applyCustomMatrix() {
    try {
      const newMatrix: Fraction[][] = customInputs.map(row =>
        row.map(cellStr => {
          const trimmed = cellStr.trim();
          if (!trimmed) return new Fraction(0);
          if (trimmed.includes('/')) {
            const [n, d] = trimmed.split('/').map(s => s.trim());
            const num = Number(n);
            const den = Number(d);
            if (isNaN(num) || isNaN(den) || den === 0) {
              throw new Error('Invalid fraction');
            }
            return new Fraction(num, den);
          }
          const num = Number(trimmed);
          if (isNaN(num)) throw new Error('Invalid number');
          return new Fraction(num);
        })
      );
      setMatrix(newMatrix);
      userSolutionRef.current = new matrixSolution(newMatrix);
      setSolverHistory(null);
      setHint(null);
      setSelectedRows([]);
      setErrorMessage("");
      syncUndoRedo();
      setShowCustomInput(false);
    } catch (e) {
      setErrorMessage('Invalid input. Enter numbers or fractions (e.g., 3/4)');
    }
  }

  function undo() {
    if (userSolutionRef.current) {
      let prev = userSolutionRef.current.undo();
      if (prev) {
        syncUndoRedo();
        setMatrix(prev);
        setSelectedRows([]);
        setHint(null);
        setErrorMessage("");
      }
    }
  }

  function redo() {
    if (userSolutionRef.current) {
      let next = userSolutionRef.current.redo();
      if (next) {
        syncUndoRedo();
        setMatrix(next);
        setSelectedRows([]);
        setHint(null);
        setErrorMessage("");
      }
    }
  }

  function handleRowClick(rowIndex: number) {
    setHint(null);
    setErrorMessage("");
    if (operation === "multiply") {
      setSelectedRows([rowIndex]);
    } else if (selectedRows.length === 0) {
      setSelectedRows([rowIndex]);
    } else if (selectedRows.length === 1) {
      if (selectedRows[0] === rowIndex) {
        setSelectedRows([]);
      } else {
        setSelectedRows([...selectedRows, rowIndex]);
      }
    } else {
      setSelectedRows([rowIndex]);
    }
  }

  function executeOperation() {
    if (!matrix || !userSolutionRef.current) return;

    setHint(null);
    setErrorMessage("");

    if (operation === "swap" && selectedRows.length === 2) {
      const [rowA, rowB] = selectedRows;
      const result = actions.swapRows(rowA, rowB, matrix, userSolutionRef.current);
      if (result.success) {
        setMatrix(result.matrix);
        syncUndoRedo();
        setSelectedRows([]);
      } else {
        setErrorMessage(result.errorCode || "Operation failed");
      }
    } else if (operation === "add" && selectedRows.length === 2) {
      const num = Number(factorNum);
      const den = Number(factorDen);
      if (isNaN(num) || isNaN(den) || den === 0) {
        setErrorMessage("Invalid factor");
        return;
      }
      const factor = new Fraction(num, den);
      const [rowToMod, rowToAdd] = selectedRows;
      const result = actions.addRows(rowToMod, rowToAdd, factor, matrix, userSolutionRef.current);
      if (result.success) {
        setMatrix(result.matrix);
        syncUndoRedo();
        setSelectedRows([]);
      } else {
        setErrorMessage(result.errorCode || "Operation failed");
      }
    } else if (operation === "multiply" && selectedRows.length === 1) {
      const num = Number(factorNum);
      const den = Number(factorDen);
      if (isNaN(num) || isNaN(den) || den === 0) {
        setErrorMessage("Invalid factor");
        return;
      }
      const factor = new Fraction(num, den);
      const [rowToMod] = selectedRows;
      const result = actions.multiplyRow(rowToMod, factor, matrix, userSolutionRef.current);
      if (result.success) {
        setMatrix(result.matrix);
        syncUndoRedo();
        setSelectedRows([]);
      } else {
        setErrorMessage(result.errorCode || "Operation failed");
      }
    }
  }

  function handleAutoSolve() {
    if (!matrix) return;
    try {
      const result = solver.autoSolve(matrix);
      if (result?.solverHistory) {
        setSolverHistory(result.solverHistory.getSolution());
        setHint(null);
        setErrorMessage("");
      } else {
        setErrorMessage("Unable to solve matrix");
      }
    } catch (e) {
      setErrorMessage("Error solving matrix - check for columns of all zeros");
    }
  }

  function handleHint() {
    if (!matrix) return;
    try {
      const hintMatrix = solver.giveHint(matrix);
      if (hintMatrix) {
        setHint(hintMatrix);
        setErrorMessage("");
      } else {
        setErrorMessage("No hint available - matrix may already be solved");
      }
    } catch (e) {
      setErrorMessage("Error generating hint - check for columns of all zeros");
    }
  }

  if (!matrix) return null;

  const userHistory = userSolutionRef.current?.getSolution() || [];
  const btnStyle = (bg: string) => ({
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    backgroundColor: bg,
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    boxShadow: `0 2px 8px ${bg}40`,
    display: "flex",
    alignItems: "center",
    gap: "6px"
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #278d4eff 0%, #e66a6aff 100%)",
      /* To use an image: background: "url('YOUR_IMAGE_URL') center/cover no-repeat", */
      /* To use a GIF: background: "url('YOUR_GIF_URL') center/cover no-repeat", */
      padding: "40px 20px"
    }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ margin: "0 0 8px 0", fontSize: "36px", fontWeight: "700", color: "white", textShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
            Matrix Row Operations
          </h1>
          <p style={{ margin: 0, fontSize: "16px", color: "rgba(255,255,255,0.9)" }}>
            Interactive Gaussian Elimination Solver
          </p>
        </div>

        <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 0 80px rgba(225, 210, 210, 0.4), 0 0 120px rgba(102, 126, 234, 0.2)", marginBottom: "32px" }}>
          {errorMessage && (
            <div style={{ backgroundColor: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "12px 16px", marginBottom: "24px", color: "#991b1b", fontSize: "14px", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={20} />
              {errorMessage}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
            <MatrixDisplay matrix={matrix} isClickable={true} selectedRows={selectedRows} onRowClick={handleRowClick} />
          </div>

          {hint && (
            <div style={{ padding: "20px", backgroundColor: "#ecfdf5", borderRadius: "12px", border: "2px solid #10b981", marginBottom: "32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <Lightbulb size={24} color="#047857" />
                <h3 style={{ margin: 0, color: "#047857", fontSize: "18px", fontWeight: "600" }}>Next Step Hint</h3>
              </div>
              <div className='rounded-[20px]' style={{ display: "flex", justifyContent: "center"}}>
                <MatrixDisplay matrix={hint} isHint={true} />
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "24px", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
              <button onClick={undo} disabled={!canUndo} style={{ padding: "10px 20px", fontSize: "14px", fontWeight: "600", border: "2px solid #e2e8f0", borderRadius: "8px", backgroundColor: canUndo ? "white" : "#f1f5f9", color: canUndo ? "#475569" : "#94a3b8", cursor: canUndo ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: "6px" }}>
                <ArrowLeft size={18} /> Undo
              </button>
              <button onClick={redo} disabled={!canRedo} style={{ padding: "10px 20px", fontSize: "14px", fontWeight: "600", border: "2px solid #e2e8f0", borderRadius: "8px", backgroundColor: canRedo ? "white" : "#f1f5f9", color: canRedo ? "#475569" : "#94a3b8", cursor: canRedo ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: "6px" }}>
                Redo <ArrowRight size={18} />
              </button>
              <button onClick={handleHint} style={btnStyle("#10b981")}>
                <Lightbulb size={18} /> Get Hint
              </button>
              <button onClick={handleAutoSolve} style={btnStyle("#3b82f6")}>
                <Bolt size={18} /> Auto Solve
              </button>
              <button onClick={rerollMatrix} style={btnStyle("#8b5cf6")}>
                <Dice5 size={18} /> Reroll
              </button>
              <button onClick={openCustomInput} style={btnStyle("#f59e0b")}>
                <Edit size={18} /> Custom Input
              </button>
            </div>

            <div style={{ display: "flex", gap: "16px", padding: "16px 24px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", flexWrap: "wrap", justifyContent: "center" }}>
              {[
                { value: "swap", label: "Swap Rows", Icon: ArrowLeftRight },
                { value: "add", label: "Add Rows", Icon: Plus },
                { value: "multiply", label: "Multiply Row", Icon: X }
              ].map((op) => (
                <label key={op.value} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "8px 16px", borderRadius: "8px", backgroundColor: operation === op.value ? "#667eea" : "transparent", color: operation === op.value ? "white" : "#475569", fontWeight: "600" }}>
                  <input type="radio" name="operation" checked={operation === op.value} onChange={() => { setOperation(op.value as any); setSelectedRows([]); setErrorMessage(""); }} style={{ margin: 0 }} />
                  <op.Icon size={18} />
                  <span>{op.label}</span>
                </label>
              ))}
            </div>

            {(operation === "add" || operation === "multiply") && (
              <div style={{ display: "flex", gap: "12px", alignItems: "center", padding: "16px 24px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontWeight: "600", color: "#475569" }}>Factor:</span>
                <input type="number" value={factorNum} onChange={(e) => { setFactorNum(e.target.value); setErrorMessage(""); }} style={{ width: "80px", padding: "8px 12px", border: "2px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", fontFamily: "monospace", textAlign: "center" }} placeholder="num" />
                <span style={{ fontSize: "18px", color: "#94a3b8", fontWeight: "bold" }}>/</span>
                <input type="number" value={factorDen} onChange={(e) => { setFactorDen(e.target.value); setErrorMessage(""); }} style={{ width: "80px", padding: "8px 12px", border: "2px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", fontFamily: "monospace", textAlign: "center" }} placeholder="den" />
              </div>
            )}

            <button onClick={executeOperation} disabled={(operation === "swap" && selectedRows.length !== 2) || (operation === "add" && selectedRows.length !== 2) || (operation === "multiply" && selectedRows.length !== 1)} style={{ padding: "14px 32px", fontSize: "16px", fontWeight: "700", backgroundColor: ((operation === "swap" && selectedRows.length === 2) || (operation === "add" && selectedRows.length === 2) || (operation === "multiply" && selectedRows.length === 1)) ? "#10b981" : "#d1d5db", color: "white", border: "none", borderRadius: "12px", cursor: ((operation === "swap" && selectedRows.length === 2) || (operation === "add" && selectedRows.length === 2) || (operation === "multiply" && selectedRows.length === 1)) ? "pointer" : "not-allowed", boxShadow: ((operation === "swap" && selectedRows.length === 2) || (operation === "add" && selectedRows.length === 2) || (operation === "multiply" && selectedRows.length === 1)) ? "0 4px 12px rgba(16, 185, 129, 0.4)" : "none", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Check size={20} />
              Execute {operation === "swap" ? "Swap" : operation === "add" ? "Addition" : "Multiplication"}
            </button>

            <div style={{ textAlign: "center", fontSize: "14px", color: "#64748b", fontWeight: "500", padding: "12px 24px", backgroundColor: "#f1f5f9", borderRadius: "8px" }}>
              {operation === "swap" && "📌 Click two rows to swap them"}
              {operation === "add" && "📌 Click row to modify (green), then row to add (blue)"}
              {operation === "multiply" && "📌 Click a row to multiply by the factor"}
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 0 80px rgba(102, 126, 234, 0.4), 0 0 120px rgba(102, 126, 234, 0.2)" }}>
          <h2 style={{ fontSize: "24px", marginBottom: "24px", fontWeight: "700", color: "#1e293b" }}>Solution History</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
            <div>
              <h3 style={{ fontSize: "18px", marginBottom: "20px", color: "#3b82f6", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                👤 Your Steps
              </h3>
              {userHistory.map((m, i) => <MatrixDisplay key={i} matrix={m} title={`Step ${i}`} />)}
            </div>

            <div>
              <h3 style={{ fontSize: "18px", marginBottom: "20px", color: "#f59e0b", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                🤖 Solver Steps
              </h3>
              {solverHistory ? (
                solverHistory.map((m, i) => <MatrixDisplay key={i} matrix={m} title={`Step ${i}`} />)
              ) : (
                <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontStyle: "italic", backgroundColor: "#f8fafc", borderRadius: "12px", border: "2px dashed #e2e8f0" }}>
                  Click "Auto Solve" to see solver steps
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showCustomInput && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "16px", boxShadow: "0 25px 50px rgba(0,0,0,0.3)", maxWidth: "700px", width: "100%", maxHeight: "90vh", overflow: "auto" }}>
            <h2 style={{ marginTop: 0, marginBottom: "12px", fontSize: "24px", fontWeight: "700", color: "#1e293b" }}>Custom Matrix Input</h2>
            <p style={{ color: "#64748b", marginBottom: "24px", fontSize: "14px" }}>
              Enter numbers or fractions (e.g., <code style={{ backgroundColor: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", fontFamily: "monospace" }}>3/4</code>). Use Tab to navigate.
            </p>

            {errorMessage && (
              <div style={{ backgroundColor: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", color: "#991b1b", fontSize: "14px", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={18} />
                {errorMessage}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px", overflowX: "auto" }}>
              <table style={{ borderCollapse: "separate", borderSpacing: "8px" }}>
                <tbody>
                  {customInputs.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td key={c}>
                          <input type="text" value={cell} onChange={(e) => { const newInputs = [...customInputs]; newInputs[r][c] = e.target.value; setCustomInputs(newInputs); setErrorMessage(""); }} style={{ width: "90px", padding: "12px", border: "2px solid #e2e8f0", borderRadius: "8px", textAlign: "center", fontFamily: "monospace", fontSize: "14px", borderLeft: c === row.length - 1 ? "3px solid #94a3b8" : "2px solid #e2e8f0" }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button onClick={() => { setShowCustomInput(false); setErrorMessage(""); }} style={{ padding: "10px 20px", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: "white", cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                <X size={18} />
                Cancel
              </button>
              <button onClick={applyCustomMatrix} style={{ padding: "10px 20px", border: "none", borderRadius: "8px", backgroundColor: "#10b981", color: "white", cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                <Check size={18} />
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}