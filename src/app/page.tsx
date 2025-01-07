"use client";

import { useState } from "react";

export default function Home() {
  const [image, setImage] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start text-center">
        <h1 className="text-3xl font-bold">Sudoku Scanner</h1>
        <p className="text-lg text-gray-600">
          Upload or capture an image of a Sudoku puzzle, and we'll help you solve it!
        </p>
        <div className="flex flex-col gap-4 items-center">
          <label className="cursor-pointer bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
            Upload Image
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {image && (
            <div className="flex flex-col items-center">
              <h2 className="text-lg font-semibold mt-4">Preview</h2>
              <img
                src={image}
                alt="Uploaded Sudoku"
                className="border rounded-md shadow-md max-w-full max-h-96"
              />
            </div>
          )}
        </div>
      </main>
      <footer className="row-start-3 text-sm text-gray-500">
        © {new Date().getFullYear()} Sudoku Scanner - Created for seminar project
      </footer>
    </div>
  );
}
