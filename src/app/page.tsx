"use client";

import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import Image from "next/image";
import Tesseract from "tesseract.js";

// Tipovi za OpenCV.js
declare global {
  interface Window {
    cv: any;
  }
}

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [cellImages, setCellImages] = useState<string[][] | null>(null);

  // Učitavanje OpenCV.js biblioteke
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
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

      // Pretvaranje u sivu skalu
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

      // Detekcija rubova
      cv.Canny(gray, edges, 100, 200);

      // Pronalazak kontura
      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      console.log("Number of contours found:", contours.size());

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

        // Segmentacija mreže na 9x9 ćelija
        const cellSize = 300 / 9;
        const cells: string[][] = [];

        for (let row = 0; row < 9; row++) {
          const cellRow: string[] = [];
          for (let col = 0; col < 9; col++) {
            const x = col * cellSize;
            const y = row * cellSize;
            const cell = warped.roi(new cv.Rect(x, y, cellSize, cellSize));

            // Pretvaranje ćelije u sliku
            const cellCanvas = document.createElement("canvas");
            cellCanvas.width = cellSize;
            cellCanvas.height = cellSize;
            cv.imshow(cellCanvas, cell);
            cellRow.push(cellCanvas.toDataURL());

            cell.delete();
          }
          cells.push(cellRow);
        }

        setCellImages(cells);

        // Oslobađanje resursa
        srcMat.delete();
        dstMat.delete();
        warped.delete();
      }

      // Oslobađanje resursa
      src.delete();
      gray.delete();
      edges.delete();
      contours.delete();
      hierarchy.delete();
    };
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

        {cellImages && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-300 mb-4">Sudoku Cells</h2>
            <div className="grid gap-4">
              {cellImages.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className="flex flex-col items-center"
                  >
                    <img
                      src={cell}
                      alt={`Cell ${rowIndex}-${colIndex}`}
                      className="border border-gray-600 p-2 rounded-md shadow-lg"
                    />
                    <p className="text-gray-400 mt-2">
                      Cell {rowIndex + 1}, {colIndex + 1}
                    </p>
                  </div>
                ))
              )}
            </div>
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
