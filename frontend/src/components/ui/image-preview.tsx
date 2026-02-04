import { TrashIcon } from "lucide-react";
import { Button } from "./button";

export function SingleImagePreview({
  image,
  onRemove,
}: {
  image: File | { name: string; previewUrl: string };
  onRemove: (image: File | { name: string; previewUrl: string }) => void;
}) {
  const previewSrc =
    image instanceof File ? URL.createObjectURL(image) : image.previewUrl;

  return (
    <div className="flex flex-col items-center space-y-4 border rounded-xl">
      <img
        src={previewSrc || "/assets/image/placeholder-image.jpg"}
        alt={image.name || "Uploaded image"}
        className="w-full h-auto rounded-lg"
      />
      <div>
        <Button onClick={() => onRemove(image)} className="flex">
          <TrashIcon className="w-4 h-4 mr-2" />
          Remove Image
        </Button>
      </div>
    </div>
  );
}

export function ProcessedImagePreview({
  image,
  onSave,
}: {
  image: File | { name: string; previewUrl: string };
  onSave: (image: File | { name: string; previewUrl: string }) => void;
}) {
  const previewSrc =
    image instanceof File ? URL.createObjectURL(image) : image.previewUrl;

  return (
    <div className="flex flex-col items-center">
      <div className="overflow-hidden rounded-lg aspect-square">
        <img
          src={previewSrc || "/assets/image/placeholder-image.jpg"}
          alt={image.name || "Processed image"}
          className="object-cover w-full h-full"
        />
      </div>
      <Button onClick={() => onSave(image)} className="mt-2">
        Save Processed Image
      </Button>
    </div>
  );
}
