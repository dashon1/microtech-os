import React, { useCallback, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function FileUploadZone({ onFileSelect, accept = "image/*", multiple = false }) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = React.useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files) => {
    const file = files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
      onFileSelect(file);
    }
  };

  const clearFile = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onFileSelect(null);
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {preview ? (
        <Card className="relative bg-slate-900/50 border-slate-800 p-4">
          <button
            onClick={clearFile}
            className="absolute top-6 right-6 p-2 bg-slate-900/90 hover:bg-slate-800 rounded-lg transition-colors z-10"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <img
            src={preview}
            alt="Preview"
            className="w-full h-64 object-contain rounded-lg"
          />
        </Card>
      ) : (
        <Card
          className={`border-2 border-dashed cursor-pointer transition-all duration-200 ${
            dragActive
              ? "border-indigo-500 bg-indigo-500/10"
              : "border-slate-700 bg-slate-900/30 hover:border-slate-600 hover:bg-slate-900/50"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
              {dragActive ? (
                <ImageIcon className="w-8 h-8 text-indigo-400" />
              ) : (
                <Upload className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <p className="text-white font-medium mb-2">
              {dragActive ? "Drop your image here" : "Drop your image here, or click to browse"}
            </p>
            <p className="text-sm text-slate-400">
              Supports PNG, JPG, JPEG (Max 10MB)
            </p>
          </div>
        </Card>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}