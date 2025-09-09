"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Tesseract from "tesseract.js";

interface OpenCV {
  Mat: new () => unknown;
  MatVector: new () => unknown;
  Size: new (w: number, h: number) => unknown;
  Rect: new (x: number, y: number, w: number, h: number) => unknown;
  imread(canvas: HTMLCanvasElement): unknown;
  imshow(canvas: HTMLCanvasElement, mat: unknown): void;
  cvtColor(src: unknown, dst: unknown, code: number, dstCn: number): void;
  Canny(src: unknown, edges: unknown, t1: number, t2: number): void;
  findContours(
    src: unknown,
    contours: unknown,
    hierarchy: unknown,
    mode: number,
    method: number
  ): void;
  contourArea(cnt: unknown): number;
  boundingRect(cnt: unknown): { x: number; y: number; width: number; height: number };
  matFromArray(rows: number, cols: number, type: number, arr: number[]): unknown;
  getPerspectiveTransform(src: unknown, dst: unknown): unknown;
  warpPerspective(src: unknown, dst: unknown, M: unknown, dsize: unknown): void;
  COLOR_RGBA2GRAY: number;
  RETR_EXTERNAL: number;
  CHAIN_APPROX_SIMPLE: number;
  CV_32FC2: number;
}

declare global {
  interface Window {
    cv?: OpenCV;
  }
}

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [solvedGrid, setSolvedGrid] = useState<number[][] | null>(null);
  const [editableGrid, setEditableGrid] = useState<number[][] | null>(null);

  useEffect(() => {
    if (!window.cv) {
      const script = document.createElement("script");
      script.src = "https://docs.opencv.org/3.4.0/opencv.js";
      script.async = true;
      script.onload = () => console.log("OpenCV.js loaded");
      script.onerror = () => console.error("Failed to load OpenCV.js");
      document.body.appendChild(script);
    }
  }, []);

  const recognizeCell = async (cellImage: string): Promise<string> => {
    try {
      const worker = await Tesseract.createWorker();
      await worker.load();
      await worker.reinitialize("eng");
      await worker.setParameters({
        tessedit_char_whitelist: "123456789",
      });

      const result = await worker.recognize(cellImage);
      await worker.terminate();

      let text = result.data.text.trim();
      if (text.length > 1) text = text.charAt(0);
      return text || "?";
    } catch (error) {
      console.error("OCR error:", error);
      return "?";
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const solveSudoku = (grid: number[][]): boolean => {
    const findEmpty = () => {
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
          if (grid[i][j] === 0) return [i, j];
        }
      }
      return null;
    };

    const isValid = (num: number, row: number, col: number): boolean => {
      for (let i = 0; i < 9; i++) {
        if (grid[row][i] === num || grid[i][col] === num) return false;
        const boxRow = 3 * Math.floor(row / 3) + Math.floor(i / 3);
        const boxCol = 3 * Math.floor(col / 3) + (i % 3);
        if (grid[boxRow][boxCol] === num) return false;
      }
      return true;
    };

    const empty = findEmpty();
    if (!empty) return true;

    const [row, col] = empty;
    for (let num = 1; num <= 9; num++) {
      if (isValid(num, row, col)) {
        grid[row][col] = num;
        if (solveSudoku(grid)) return true;
        grid[row][col] = 0;
      }
    }
    return false;
  };

  const processImage = async () => {
    if (!image || !window.cv) {
      console.error("OpenCV.js is not loaded or image is not available.");
      return;
    }

    const img = document.createElement("img");
    img.src = image;

    img.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0);

      const cv = window.cv;
      const src = cv.imread(canvas);
      const gray = new cv.Mat();
      const edges = new cv.Mat();
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();

      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
      cv.Canny(gray, edges, 100, 200);
      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      let largestArea = 0;
      let boundingRect = null;
      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt);
        if (area > largestArea) {
          largestArea = area;
          boundingRect = cv.boundingRect(cnt);
        }
      }

      if (boundingRect) {
        const { x, y, width, height } = boundingRect;

        const srcCoords = [
          { x, y },
          { x: x + width, y },
          { x: x + width, y: y + height },
          { x, y: y + height },
        ];
        const dstCoords = [
          { x: 0, y: 0 },
          { x: 300, y: 0 },
          { x: 300, y: 300 },
          { x: 0, y: 300 },
        ];

        const srcMat = cv.matFromArray(4, 1, cv.CV_32FC2, srcCoords.flatMap((p) => [p.x, p.y]));
        const dstMat = cv.matFromArray(4, 1, cv.CV_32FC2, dstCoords.flatMap((p) => [p.x, p.y]));

        const perspectiveMatrix = cv.getPerspectiveTransform(srcMat, dstMat);
        const warped = new cv.Mat();
        cv.warpPerspective(src, warped, perspectiveMatrix, new cv.Size(300, 300));

        const cellSize = 300 / 9;
        const grid: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));

        for (let row = 0; row < 9; row++) {
          for (let col = 0; col < 9; col++) {
            const x = col * cellSize;
            const y = row * cellSize;
            const cell = warped.roi(new cv.Rect(x, y, cellSize, cellSize));

            const cellCanvas = document.createElement("canvas");
            cellCanvas.width = cellSize;
            cellCanvas.height = cellSize;
            cv.imshow(cellCanvas, cell);
            const cellImage = cellCanvas.toDataURL();

            const text = await recognizeCell(cellImage);
            grid[row][col] = parseInt(text) || 0;

            cell.delete();
          }
        }

        setEditableGrid(grid.map((row) => [...row]));

        srcMat.delete();
        dstMat.delete();
        warped.delete();
      }

      src.delete();
      gray.delete();
      edges.delete();
      contours.delete();
      hierarchy.delete();
    };
  };

  const handleSolveSudoku = () => {
    if (editableGrid) {
      const gridCopy = editableGrid.map((row) => [...row]);
      if (solveSudoku(gridCopy)) {
        setSolvedGrid(gridCopy);
      } else {
        alert("Sudoku cannot be solved!");
      }
    }
  };

  const handleEditCell = (rowIndex: number, colIndex: number, value: string) => {
    if (editableGrid) {
      const updatedGrid = editableGrid.map((row, rIdx) =>
        row.map((cell, cIdx) => (rIdx === rowIndex && cIdx === colIndex ? parseInt(value) || 0 : cell))
      );
      setEditableGrid(updatedGrid);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <header className="py-8 border-b border-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-extrabold text-blue-500 drop-shadow-md">
            Sudoku Scanner
          </h1>
          <p className="mt-4 text-gray-400 text-lg">
            Scan and solve your Sudoku puzzles effortlessly!
          </p>
        </div>
      </header>
      <main className="max-w-4xl mx-auto py-12 px-8 text-center">
        <div className="flex justify-center gap-6 mb-12">
          <label className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-full shadow-lg cursor-pointer transition-all transform hover:scale-105">
            Upload Image
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {image && (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold text-gray-300 mb-4">Preview</h2>
            <Image
              src={image}
              alt="Captured Sudoku"
              className="border border-gray-700 rounded-lg shadow-xl"
              width={400}
              height={400}
            />
            <button
              className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-8 rounded-full shadow-lg transition-all transform hover:scale-105"
              onClick={processImage}
            >
              Process Image
            </button>
          </div>
        )}

        {editableGrid && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-300 mb-4">Editable Sudoku Grid</h2>
            <table className="border-collapse mx-auto" style={{ border: "2px solid white" }}>
              <tbody>
                {editableGrid.map((row, rowIndex) => (
                  <tr key={rowIndex} style={{ borderBottom: rowIndex % 3 === 2 ? "2px solid white" : "1px solid gray" }}>
                    {row.map((cell, colIndex) => (
                      <td
                        key={`${rowIndex}-${colIndex}`}
                        className="w-16 h-16 text-center text-lg font-semibold align-middle"
                        style={{
                          backgroundColor: "#1f2937",
                          color: "white",
                          borderRight: colIndex % 3 === 2 ? "2px solid white" : "1px solid gray",
                        }}
                      >
                        <input
                          type="text"
                          value={cell || ""}
                          maxLength={1}
                          onChange={(e) => handleEditCell(rowIndex, colIndex, e.target.value)}
                          className="w-full h-full text-center bg-transparent border-none text-white outline-none"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              className="mt-4 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-full shadow-lg transition-all transform hover:scale-105"
              onClick={handleSolveSudoku}
            >
              Solve Sudoku
            </button>
          </div>
        )}

        {solvedGrid && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-300 mb-4">Solved Sudoku</h2>
            <table className="border-collapse mx-auto" style={{ border: "2px solid white" }}>
              <tbody>
                {solvedGrid.map((row, rowIndex) => (
                  <tr key={rowIndex} style={{ borderBottom: rowIndex % 3 === 2 ? "2px solid white" : "1px solid gray" }}>
                    {row.map((num, colIndex) => (
                      <td
                        key={`${rowIndex}-${colIndex}`}
                        className="w-16 h-16 text-center text-lg font-semibold align-middle"
                        style={{
                          backgroundColor: "#1f2937",
                          color: "white",
                          borderRight: colIndex % 3 === 2 ? "2px solid white" : "1px solid gray",
                        }}
                      >
                        {num || ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <footer className="py-8 border-t border-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Sudoku Scanner - Created for seminar
            project
          </p>
        </div>
      </footer>
    </div>
  );
}
