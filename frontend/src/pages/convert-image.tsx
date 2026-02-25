import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { SingleImagePreview } from "@/components/ui/image-preview";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageShell, SectionCard } from "@/components/ui/page-shell";
import { useState } from "react";
import { ConvertImage, SaveAsImage, ShowInFolder } from "../../wailsjs/go/handlers/App";
import {
  ArrowRightLeft,
  Download,
  Loader2,
  ImageIcon,
  FileType,
} from "lucide-react";
import { toast } from "sonner";

const SUPPORTED_FORMATS = [
  { value: "png", label: "PNG", description: "Lossless, supports transparency" },
  { value: "jpeg", label: "JPG / JPEG", description: "Lossy, small file size" },
  { value: "webp", label: "WebP", description: "Modern, efficient compression" },
  { value: "gif", label: "GIF", description: "Supports animation, 256 colors" },
  { value: "ico", label: "ICO (Favicon)", description: "Icon format for websites" },
];

function detectFormat(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "png": return "PNG";
    case "jpg": case "jpeg": return "JPEG";
    case "webp": return "WebP";
    case "gif": return "GIF";
    case "ico": return "ICO";
    case "bmp": return "BMP";
    default: return ext.toUpperCase() || "Unknown";
  }
}

function formatToValue(detected: string): string {
  switch (detected.toUpperCase()) {
    case "PNG": return "png";
    case "JPEG": case "JPG": return "jpeg";
    case "WEBP": return "webp";
    case "GIF": return "gif";
    case "ICO": return "ico";
    default: return "";
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function ConvertImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] = useState<string>("");
  const [convertedImg, setConvertedImg] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [detectedFormat, setDetectedFormat] = useState<string>("");

  const handleImageDrop = (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setFile(f);
    const detected = detectFormat(f);
    setDetectedFormat(detected);
    setConvertedImg(null);
    const sourceVal = formatToValue(detected);
    if (sourceVal && (targetFormat === sourceVal || (sourceVal === "jpeg" && targetFormat === "jpg"))) {
      setTargetFormat("");
    }
    const reader = new FileReader();
    reader.readAsDataURL(f);
    reader.onload = () => setPreviewUrl(reader.result as string);
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setTargetFormat("");
    setConvertedImg(null);
    setDetectedFormat("");
  };

  const handleConvert = async () => {
    if (!previewUrl || !targetFormat) return;
    setIsConverting(true);
    try {
      const result = await ConvertImage(previewUrl, targetFormat);
      if (!result) {
        toast.error("Conversion failed. No output returned.");
        return;
      }
      setConvertedImg(result);
      toast.success(`Converted to ${targetFormat.toUpperCase()} successfully!`);
    } catch (err) {
      toast.error("Conversion failed: " + String(err));
    } finally {
      setIsConverting(false);
    }
  };

  const handleSaveAs = async () => {
    if (!convertedImg || !file) return;
    
    try {
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const ext = targetFormat === "jpeg" ? "jpg" : targetFormat;
      const defaultName = `${baseName}_converted.${ext}`;
      
      const savedPath = await SaveAsImage(defaultName, convertedImg);
      if (savedPath) {
        toast.success(`Saved to ${savedPath}`, {
          action: {
            label: "Show in Folder",
            onClick: () => ShowInFolder(savedPath),
          }
        });
      }
    } catch (err) {
      toast.error("Failed to save image: " + String(err));
    }
  };

  const canConvert = file && targetFormat && !isConverting;

  return (
    <PageShell
      title="Convert Image"
      subtitle="Convert between WebP, PNG, JPG, GIF, and ICO formats"
      icon={ArrowRightLeft}
    >
      <div className="space-y-5">
        {/* Source / Output Grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Source */}
          <SectionCard>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Source Image</h3>
            </div>
            {file ? (
              <div className="space-y-3">
                <SingleImagePreview image={file} onRemove={handleReset} />
                <div className="p-3 space-y-1.5 text-sm border rounded-lg bg-muted/20 border-border/40">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Format</span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/15 text-primary">{detectedFormat}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size</span>
                    <span className="font-medium">{formatFileSize(file.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium truncate max-w-[160px]">{file.name}</span>
                  </div>
                </div>
              </div>
            ) : (
              <FileDropzone
                onFilesAdded={handleImageDrop}
                accept={{
                  "image/png": [".png"],
                  "image/jpeg": [".jpg", ".jpeg"],
                  "image/webp": [".webp"],
                  "image/gif": [".gif"],
                  "image/x-icon": [".ico"],
                  "image/bmp": [".bmp"],
                }}
              />
            )}
          </SectionCard>

          {/* Output */}
          <SectionCard>
            <div className="flex items-center gap-2 mb-3">
              <FileType className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Converted Output</h3>
            </div>
            {convertedImg ? (
              <div className="space-y-3 animate-scale-in">
                <div className="overflow-hidden border rounded-lg border-border/40">
                  <img src={convertedImg} alt="Converted" className="w-full h-auto" />
                </div>
                <Button onClick={handleSaveAs} className="w-full" variant="default">
                  <Download className="w-4 h-4 mr-2" />
                  Save As .{targetFormat === "jpeg" ? "jpg" : targetFormat}
                </Button>
              </div>
            ) : (
              <div className="flex min-h-[200px] flex-col items-center justify-center space-y-2 border border-dashed rounded-lg border-border/40 bg-muted/10">
                <ArrowRightLeft className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">
                  {file ? "Select format and convert" : "Upload an image first"}
                </p>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Conversion Controls */}
        <SectionCard className="max-w-lg mx-auto">
          <h3 className="mb-4 text-sm font-semibold text-center">Conversion Settings</h3>

          <div className="mb-4">
            <Label className="block mb-2 text-xs font-medium text-muted-foreground">
              Target Format
            </Label>
            <Select value={targetFormat} onValueChange={setTargetFormat}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select output format" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Image Formats</SelectLabel>
                  {SUPPORTED_FORMATS
                    .filter((fmt) => fmt.value !== formatToValue(detectedFormat))
                    .map((fmt) => (
                      <SelectItem key={fmt.value} value={fmt.value}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{fmt.label}</span>
                          <span className="text-xs text-muted-foreground">— {fmt.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleConvert}
            disabled={!canConvert}
            className="w-full transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            {isConverting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Convert{" "}
                {detectedFormat && targetFormat
                  ? `${detectedFormat} → ${targetFormat.toUpperCase()}`
                  : "Image"}
              </>
            )}
          </Button>
        </SectionCard>
      </div>
    </PageShell>
  );
}
