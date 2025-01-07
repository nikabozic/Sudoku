"use client";

import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import Image from "next/image";

// Tipovi za OpenCV.js
declare global {
  interface Window {
    cv: any;
  }
}

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [useCamera, setUseCamera] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    if (!window.cv) {
      const script = document.createElement("script");
      script.src = "https://docs.opencv.org/3.4.0/opencv.js";
      script.async = true;
      script.onload = () => console.log("OpenCV.js loaded");
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

  const captureImage = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImage(imageSrc);
      setUseCamera(false);
    }
  };

  const processImage = () => {
    if (!image || !window.cv) {
      console.error("OpenCV.js is not loaded or image is not available.");
      return;
    }

    const img = document.createElement("img");
    img.src = image;

    img.onload = () => {
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

      // Detekcija najveće konture
      let largestArea = 0;
      let sudokuContour = null;
      let boundingRect = null;
      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt);
        if (area > largestArea) {
          largestArea = area;
          sudokuContour = cnt;
          boundingRect = cv.boundingRect(cnt);
        }
      }

      if (sudokuContour && boundingRect) {
        console.log("Largest contour area:", largestArea);
        console.log("Bounding Rect:", boundingRect);

        const { x, y, width, height } = boundingRect;

        // Točke za preslikavanje
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

        // Prikaz rezultata
        const outputCanvas = document.createElement("canvas");
        cv.imshow(outputCanvas, warped);
        setProcessedImage(outputCanvas.toDataURL());

        // Čišćenje resursa
        srcMat.delete();
        dstMat.delete();
        warped.delete();
      } else {
        console.log("No valid Sudoku contour found.");
        const outputCanvas = document.createElement("canvas");
        cv.imshow(outputCanvas, src); // Prikazuje originalnu sliku ako nema mreže
        setProcessedImage(outputCanvas.toDataURL());
      }

      // Čišćenje resursa
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
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-full shadow-lg transition-all transform hover:scale-105"
            onClick={() => setUseCamera(true)}
          >
            Use Camera
          </button>
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
          <div className="flex flex-col items-center justify-center h-screen">
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

        {processedImage && (
          <div className="flex flex-col items-center justify-center h-screen">
            <h2 className="text-2xl font-bold text-gray-300 mb-4">Processed Image</h2>
            <img
              src={processedImage}
              alt="Processed Sudoku"
              className="border border-gray-700 rounded-lg shadow-xl max-w-full"
            />
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
