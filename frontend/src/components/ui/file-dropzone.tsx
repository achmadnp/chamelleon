"use client";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";

interface FileDropzoneProps {
  onFilesAdded: (files: File[]) => void;
  className?: string;
  accept?: Record<string, string[]>;
}

export function FileDropzone({ onFilesAdded, accept, ...props }: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesAdded(acceptedFiles);
    },
    [onFilesAdded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept });

  return (
    <div
      {...getRootProps()}
      className={`flex flex-col items-center justify-center w-full min-h-[200px] border-2 border-dashed rounded-xl
        transition-all duration-300 ease-out cursor-pointer group
        ${
          isDragActive
            ? "border-primary bg-primary/10 scale-[0.99]"
            : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
        } ${props?.className}`}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-3 px-4 text-center">
        <div
          className={`p-3 rounded-xl transition-all duration-300 ${
            isDragActive
              ? "bg-primary/20 scale-110"
              : "bg-muted/50 group-hover:bg-primary/10 group-hover:scale-105"
          }`}
        >
          <Upload
            className={`w-6 h-6 transition-colors duration-300 ${
              isDragActive ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"
            }`}
          />
        </div>
        <div>
          <p
            className={`text-sm font-medium transition-colors ${
              isDragActive ? "text-primary" : "text-foreground/70"
            }`}
          >
            {isDragActive ? "Drop it here!" : "Drag & drop a file"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            or click to browse
          </p>
        </div>
      </div>
    </div>
  );
}
