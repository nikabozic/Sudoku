"use client";

import { useState, useRef } from "react";
import Webcam from "react-webcam";
import Image from "next/image";

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [useCamera, setUseCamera] = useState(false);
  const webcamRef = useRef<Webcam>(null);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      {/* Header */}
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-12 px-8 text-center">
        {/* Options */}
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

        {/* Camera */}
        {useCamera && (
          <div className="flex flex-col items-center mb-12">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="border border-gray-800 rounded-lg shadow-xl max-w-full max-h-96"
            />
            <button
              className="mt-4 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-full shadow-lg transition-all transform hover:scale-105"
              onClick={captureImage}
            >
              Capture Image
            </button>
          </div>
        )}

        {/* Image Preview */}
        {image && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-300 mb-4">Preview</h2>
            <Image
              src={image}
              alt="Captured Sudoku"
              className="border border-gray-700 rounded-lg shadow-xl"
              width={400}
              height={400}
            />
          </div>
        )}
      </main>

      {/* Footer */}
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
