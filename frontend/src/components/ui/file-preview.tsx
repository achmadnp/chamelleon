import { X } from "lucide-react";
import { useEffect, useState } from "react";

function FilePreviewItem({
  file,
  onRemove,
}: {
  file: File | { name: string; previewUrl: string };
  onRemove: (file: File | { name: string; previewUrl: string }) => void;
}) {
  const [previewSrc, setPreviewSrc] = useState<string>("");

  useEffect(() => {
    if (file instanceof File) {
      const url = URL.createObjectURL(file);
      setPreviewSrc(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewSrc(file?.previewUrl || "");
    }
  }, [file]);

  return (
    <div className="relative group">
      <div className="overflow-hidden bg-gray-100 rounded-lg aspect-square">
        <img
          src={previewSrc || "/assets/image/placeholder-image.jpg"}
          alt={file.name || "Uploaded file"}
          className="object-cover w-full h-full"
        />
      </div>
      <button
        onClick={() => onRemove(file)}
        className="absolute top-0 right-0 p-1 transition-opacity bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
      <p className="mt-2 text-sm text-gray-500 truncate">
        {file.name || "Unnamed file"}
      </p>
    </div>
  );
}

export function FilePreview({
  files,
  onRemove,
}: {
  files: (File | { name: string; previewUrl: string })[];
  onRemove: (file: File | { name: string; previewUrl: string }) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 mt-6 sm:grid-cols-3 md:grid-cols-4">
      {files.map((file, index) => (
        <FilePreviewItem key={index} file={file} onRemove={onRemove} />
      ))}
    </div>
  );
}
