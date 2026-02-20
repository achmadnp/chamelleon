import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { SingleImagePreview } from "@/components/ui/image-preview";
import { Input } from "@/components/ui/input";
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
import { Slider } from "@/components/ui/slider";
import { PageShell, SectionCard } from "@/components/ui/page-shell";
import { useState } from "react";
import { AdjustImage } from "../../wailsjs/go/handlers/App";
import {
  Palette,
  SaveIcon,
  ImageIcon,
  Eye,
  Sun,
  Contrast,
  Droplets,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const ADJUSTMENTS_CONFIG = [
  { key: "brightness", label: "Brightness", icon: Sun, min: -1, max: 1, step: 0.01, default: 0 },
  { key: "contrast", label: "Contrast", icon: Contrast, min: -1, max: 1, step: 0.1, default: 0 },
  { key: "gamma", label: "Gamma", icon: Sparkles, min: 0.1, max: 5.0, step: 0.1, default: 2.4 },
  { key: "saturation", label: "Saturation", icon: Droplets, min: -100, max: 100, step: 1, default: 0 },
  { key: "hue", label: "Hue", icon: Palette, min: -360, max: 360, step: 1, default: 0 },
] as const;

const BLEND_MODES = [
  "add", "color-burn", "color-dodge", "darken", "lighten",
  "difference", "exclusion", "linear-burn", "linear-light",
  "Multiply", "normal", "opacity", "overlay", "screen",
  "soft-light", "substract",
];

const BLUR_MODES = ["gaussian", "box"];

const EFFECTS = [
  "dilate", "edge-detection", "emboss", "erode", "invert",
  "median", "sepia", "sharpen", "sobel", "unsharp-mark",
];

export default function ImageProcessingPage() {
  const [imgConfig, setImgConfig] = useState({
    format: "",
    file: null as File | null,
    blendMode: "",
    blurMode: "",
    effect: "",
  });

  const [adjustments, setAdjustments] = useState({
    brightness: 0,
    contrast: 0,
    gamma: 2.4,
    saturation: 0,
    hue: 0,
  });

  const [processedImg, setProcessedImg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageDrop = (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setImgConfig((prev) => ({ ...prev, file }));

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => setProcessedImg(reader.result as string);
  };

  const handleReset = () => {
    setImgConfig({ format: "", file: null, blendMode: "", blurMode: "", effect: "" });
    setProcessedImg(null);
    setAdjustments({ brightness: 0, contrast: 0, gamma: 2.4, saturation: 0, hue: 0 });
  };

  const handleSavedImage = () => {
    if (!processedImg) return;
    const link = document.createElement("a");
    link.href = processedImg;
    link.download = `transformed_${imgConfig.file?.name}` || "processed_image.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Image saved!");
  };

  const handleImageAdjustments = async () => {
    if (!imgConfig.file) return;
    setIsProcessing(true);

    const reader = new FileReader();
    reader.readAsDataURL(imgConfig.file);
    reader.onload = async function () {
      try {
        const base64Image = reader.result as string;
        const res = await AdjustImage(
          "base64Image",
          base64Image,
          adjustments.brightness,
          adjustments.contrast,
          adjustments.gamma,
          adjustments.saturation,
          adjustments.hue
        );
        if (!res) {
          toast.error("Image processing failed.");
          return;
        }
        setProcessedImg(`data:image/png;base64,${res}`);
      } catch (err) {
        toast.error("Processing failed: " + String(err));
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read image file.");
      setIsProcessing(false);
    };
  };

  const clampValue = (value: string, min: number, max: number, fallback: number) => {
    if (!value) return fallback;
    const n = parseFloat(value);
    if (isNaN(n)) return fallback;
    return Math.min(Math.max(n, min), max);
  };

  return (
    <PageShell
      title="Image Processing"
      subtitle="Adjust brightness, contrast, effects and more"
      icon={Palette}
    >
      <div className="space-y-5">
        {/* Source / Output Grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <SectionCard>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Image Input</h3>
            </div>
            {imgConfig.file ? (
              <SingleImagePreview image={imgConfig.file} onRemove={handleReset} />
            ) : (
              <FileDropzone onFilesAdded={handleImageDrop} />
            )}
          </SectionCard>

          <SectionCard>
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Preview</h3>
            </div>
            {processedImg ? (
              <div className="space-y-3 animate-scale-in">
                <div className="overflow-hidden border rounded-lg border-border/40">
                  <img src={processedImg} alt="Processed" className="w-full h-auto" />
                </div>
                <Button onClick={handleSavedImage} className="w-full" variant="default">
                  <SaveIcon className="w-4 h-4 mr-2" />
                  Save Image
                </Button>
              </div>
            ) : (
              <div className="flex min-h-[200px] flex-col items-center justify-center space-y-2 border border-dashed rounded-lg border-border/40 bg-muted/10">
                <Palette className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Upload an image to preview</p>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Adjustment Controls */}
        <SectionCard title="Adjustments">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {ADJUSTMENTS_CONFIG.map((adj) => {
              const Icon = adj.icon;
              const value = adjustments[adj.key as keyof typeof adjustments];
              return (
                <div
                  key={adj.key}
                  className="p-3 border rounded-lg bg-muted/10 border-border/30"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-3.5 h-3.5 text-primary/70" />
                    <Label className="text-xs font-medium">{adj.label}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[value]}
                      onValueChange={(v) =>
                        setAdjustments((prev) => ({ ...prev, [adj.key]: v[0] }))
                      }
                      onValueCommit={handleImageAdjustments}
                      min={adj.min}
                      max={adj.max}
                      step={adj.step}
                      className="flex-1"
                    />
                    <Input
                      type="text"
                      value={value}
                      onKeyUp={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                          handleImageAdjustments();
                        }
                      }}
                      onChange={(e) =>
                        setAdjustments((prev) => ({
                          ...prev,
                          [adj.key]: clampValue(e.target.value, adj.min, adj.max, adj.default),
                        }))
                      }
                      className="w-[6ch] text-xs text-center"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Blend / Blur / Effects */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <SectionCard title="Blend Mode">
            <Select
              value={imgConfig.blendMode || ""}
              onValueChange={(value) => {
                setImgConfig({ ...imgConfig, blendMode: value });
                handleImageAdjustments();
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select blend" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Blend Modes</SelectLabel>
                  {BLEND_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </SectionCard>

          <SectionCard title="Blur Mode">
            <Select
              value={imgConfig.blurMode || ""}
              onValueChange={(value) => setImgConfig({ ...imgConfig, blurMode: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select blur" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Blur Modes</SelectLabel>
                  {BLUR_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode.replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </SectionCard>

          <SectionCard title="Effects">
            <Select
              value={imgConfig.effect || ""}
              onValueChange={(value) => setImgConfig({ ...imgConfig, effect: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select effect" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Effects</SelectLabel>
                  {EFFECTS.map((effect) => (
                    <SelectItem key={effect} value={effect}>
                      {effect.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </SectionCard>
        </div>

        {/* Apply Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleImageAdjustments}
            disabled={!imgConfig.file || isProcessing}
            className="px-8 transition-all hover:scale-[1.02] active:scale-[0.98]"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Apply Adjustments
              </>
            )}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
