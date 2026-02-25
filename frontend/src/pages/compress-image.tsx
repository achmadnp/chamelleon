import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { SingleImagePreview } from "@/components/ui/image-preview";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { PageShell, SectionCard } from "@/components/ui/page-shell";
import { useState } from "react";
import { CompressImage, SaveAsImage } from "../../wailsjs/go/handlers/App";
import {
  Download,
  Loader2,
  ImageIcon,
  Minimize2,
  Info,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function calculateReduction(original: number, compressed: number): string {
  if (original === 0) return "0%";
  const reduction = ((original - compressed) / original) * 100;
  return reduction.toFixed(1) + "%";
}

interface CompressResult {
  data: string;
  originalSize: number;
  newSize: number;
  format: string;
}

export default function CompressImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState(75);
  const [maxWidth, setMaxWidth] = useState(0);
  const [maxHeight, setMaxHeight] = useState(0);
  const [compressedResult, setCompressedResult] = useState<CompressResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleImageDrop = (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setFile(f);
    setCompressedResult(null);
    const reader = new FileReader();
    reader.readAsDataURL(f);
    reader.onload = () => setPreviewUrl(reader.result as string);
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setQuality(75);
    setMaxWidth(0);
    setMaxHeight(0);
    setCompressedResult(null);
  };

  const handleCompress = async () => {
    if (!previewUrl) return;
    setIsCompressing(true);
    try {
      const result = await CompressImage(previewUrl, quality, maxWidth, maxHeight);
      if (!result) {
        toast.error("Compression failed.");
        return;
      }
      setCompressedResult(result);
      const red = calculateReduction(result.originalSize, result.newSize);
      toast.success(`Reduced by ${red} (${formatFileSize(result.originalSize)} → ${formatFileSize(result.newSize)})`);
    } catch (err) {
      toast.error("Failed: " + String(err));
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSaveAs = async () => {
    if (!compressedResult || !file) return;
    
    try {
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const ext = compressedResult.format === "jpeg" ? "jpg" : compressedResult.format;
      const defaultName = `${baseName}_compressed.${ext}`;
      
      const savedPath = await SaveAsImage(defaultName, compressedResult.data);
      if (savedPath) {
        toast.success(`Saved as ${savedPath}`);
      }
    } catch (err) {
      toast.error("Failed to save image: " + String(err));
    }
  };

  const canCompress = file && !isCompressing;

  return (
    <PageShell
      title="Compress Image"
      subtitle="Reduce image file size with quality control"
      icon={Minimize2}
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
              <FileDropzone onFilesAdded={handleImageDrop} />
            )}
          </SectionCard>

          {/* Output */}
          <SectionCard>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Compressed Output</h3>
            </div>
            {compressedResult ? (
              <div className="space-y-3 animate-scale-in">
                <div className="overflow-hidden border rounded-lg border-border/40">
                  <img src={compressedResult.data} alt="Compressed" className="w-full h-auto" />
                </div>

                {/* Size Comparison */}
                <div className="grid grid-cols-3 gap-2 p-3 text-center border rounded-lg bg-muted/20 border-border/40">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Original</div>
                    <div className="text-sm font-bold text-red-400">{formatFileSize(compressedResult.originalSize)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Compressed</div>
                    <div className="text-sm font-bold text-emerald-400">{formatFileSize(compressedResult.newSize)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Saved</div>
                    <div className="text-sm font-bold text-primary">
                      {calculateReduction(compressedResult.originalSize, compressedResult.newSize)}
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveAs} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Save As Compressed
                </Button>
              </div>
            ) : (
              <div className="flex min-h-[200px] flex-col items-center justify-center space-y-2 border border-dashed rounded-lg border-border/40 bg-muted/10">
                <Minimize2 className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">
                  {file ? "Adjust settings and compress" : "Upload an image first"}
                </p>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Compression Controls */}
        <SectionCard className="max-w-lg mx-auto">
          <h3 className="mb-4 text-sm font-semibold text-center">Compression Settings</h3>

          {/* Quality Slider */}
          <div className="mb-5">
            <Label className="block mb-2 text-xs font-medium text-muted-foreground">
              Quality: <span className="text-foreground font-semibold">{quality}%</span>
            </Label>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground font-mono">1</span>
              <Slider
                value={[quality]}
                onValueChange={(v) => setQuality(v[0])}
                min={1}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-[10px] text-muted-foreground font-mono">100</span>
            </div>
            <div className="flex items-start gap-1.5 mt-2">
              <Info className="w-3 h-3 mt-0.5 text-muted-foreground/60" />
              <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                Below 90 → JPEG lossy compression (max reduction).
                90+ → lossless PNG.
              </p>
            </div>
          </div>

          {/* Resize */}
          <div className="mb-5">
            <Label className="block mb-2 text-xs font-medium text-muted-foreground">
              Resize (optional)
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] text-muted-foreground">Max Width (px)</Label>
                <Input
                  type="number"
                  value={maxWidth || ""}
                  onChange={(e) => setMaxWidth(e.target.value ? parseInt(e.target.value) : 0)}
                  placeholder="Auto"
                  min={0}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Max Height (px)</Label>
                <Input
                  type="number"
                  value={maxHeight || ""}
                  onChange={(e) => setMaxHeight(e.target.value ? parseInt(e.target.value) : 0)}
                  placeholder="Auto"
                  min={0}
                />
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground/70">
              Leave empty to keep original dimensions. Aspect ratio preserved.
            </p>
          </div>

          <Button
            onClick={handleCompress}
            disabled={!canCompress}
            className="w-full transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            {isCompressing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Compressing...
              </>
            ) : (
              <>
                <Minimize2 className="w-4 h-4 mr-2" />
                Compress Image
              </>
            )}
          </Button>
        </SectionCard>
      </div>
    </PageShell>
  );
}
