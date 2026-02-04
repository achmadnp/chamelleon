"use client";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { File, Upload } from "lucide-react";

interface FileDropzoneProps {
  onFilesAdded: (files: File[]) => void;
  className?: string;
}

export function FileDropzone({ onFilesAdded, ...props }: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesAdded(acceptedFiles);
    },
    [onFilesAdded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <Dialog open={false}>
      <DialogTrigger asChild>
        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg
            transition-colors duration-300 ease-in-out cursor-pointer
            ${
              isDragActive
                ? "border-primary bg-primary/10"
                : "border-gray-300 hover:border-primary hover:bg-primary/5"
            } ${props?.className}`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-lg font-semibold text-primary">
              Drop the files here ...
            </p>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <Upload className="w-12 h-12 text-foreground" />
              <p className="p-1 text-lg text-center text-foreground">
                Drag & drop files here, or click to select files
              </p>
              <Button variant="outline">
                <File className="w-4 h-4 mr-2" />
                Select Files
              </Button>
            </div>
          )}
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload files</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-lg font-semibold text-center">Select Files</p>
          <input
            type="file"
            multiple
            onChange={(e) => {
              if (e.target.files) {
                onFilesAdded(Array.from(e.target.files));
              }
            }}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
