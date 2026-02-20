import { Button } from "@/components/ui/button";
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
import {
  Trash2Icon,
  Minimize2,
  FileVideo,
  Loader2,
  CheckCircle2,
  XCircle,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  CancelCompress,
  CompressVideo,
  HandleSelectFile,
} from "../../wailsjs/go/handlers/App";

import { EventsOff, EventsOn } from "../../wailsjs/runtime/runtime";
import { toast } from "sonner";
import { CircularProgress } from "@/components/ui/progress";

export default function CompressVideoPage() {
  const [fileConfig, setFileConfig] = useState({
    videoPath: "",
    logic: "",
    bitrateValue: "3000kbps",
    crfQualityValue: "28",
    resolution: "1080p",
    frameRate: "30",
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState([0]);
  const [eta, setEta] = useState<number | null>(null);
  const [status, setStatus] = useState("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [durationms, setDurationms] = useState(0);
  const [convertedms, setConvertedms] = useState(0);

  useEffect(() => {
    const onProgress = (p: {
      id: string;
      percentage: number;
      out_time_ms: number;
      duration_ms: number;
      speed: string;
      eta_seconds: number;
      status: string;
    }) => {
      if (jobId && p.id !== jobId) return;
      setJobId(p.id);
      setProgress([p.percentage.toFixed(2) as unknown as number]);
      setEta(p.eta_seconds);
      setStatus(p.status as any);
      setDurationms(p.duration_ms);
      setConvertedms(p.out_time_ms);
    };

    const onDone = (p: {
      id: string;
      status: string;
      output: string;
      error?: string;
    }) => {
      if (jobId && p.id !== jobId) return;
      setStatus(p.status);
      setProgress(p.status === "done" ? [100] : progress);
      setEta(0);
      if (p.status === "done") {
        toast.success("Compression Succeeded!", {
          description: `Output: ${p.output}`,
          duration: 8000,
        });
      } else if (p.status === "cancelled") {
        toast.warning("Compression Cancelled");
      } else {
        toast.error("Compression failed: " + p.error, { duration: 8000 });
      }
      setJobId(null);
      setEta(null);
    };

    EventsOn("compression_progress", onProgress);
    EventsOn("compression_done", onDone);

    return () => {
      EventsOff("conversion_progress");
      EventsOff("conversion_done");
    };
  }, [jobId, progress]);

  const bitrateSteps = [
    "1000kbps",
    "2000kbps",
    "3000kbps",
    "4000kbps",
    "5000kbps",
  ];

  const handleSelectFile = async () => {
    const r = await HandleSelectFile();
    setIsLoading(true);
    setIsLoading(false);
    if (!r) {
      setError("No file selected.");
      return;
    }
    setError(null);
    setFileConfig((prev) => ({ ...prev, videoPath: r }));
  };

  const handleCompressVideo = async () => {
    await CompressVideo(fileConfig.videoPath, fileConfig.logic);
  };

  const handleCancelJob = async (id: string | null) => {
    await CancelCompress(id!);
  };

  const handleDismiss = () => {
    setStatus("idle");
    setProgress([0]);
    setEta(null);
    setDurationms(0);
    setConvertedms(0);
  };

  const formatMs = (ms: number) => {
    if (!ms) return "0s";
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  };

  return (
    <PageShell
      title="Compress Video"
      subtitle="Reduce video file size with multiple strategies"
      icon={Minimize2}
    >
      <div className="space-y-5">
        {error && (
          <div className="p-3 text-sm text-center border rounded-lg border-destructive/30 bg-destructive/10 text-destructive">
            {error}
          </div>
        )}

        {/* Step 1: File Selection */}
        <SectionCard>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full bg-primary/20 text-primary">1</span>
            <h3 className="text-sm font-semibold">Select Video File</h3>
          </div>

          {fileConfig.videoPath ? (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 border-border/50">
              <FileVideo className="flex-shrink-0 w-5 h-5 text-primary" />
              <span className="flex-1 text-sm truncate text-foreground/80">{fileConfig.videoPath}</span>
              <button
                onClick={() => setFileConfig((prev) => ({ ...prev, videoPath: "" }))}
                className="p-1 transition-colors rounded hover:bg-destructive/20"
              >
                <Trash2Icon className="w-4 h-4 text-destructive" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSelectFile}
              className="flex flex-col items-center justify-center w-full gap-2 p-8 text-sm transition-all duration-200 border-2 border-dashed rounded-xl border-border/50 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
            >
              <Upload className="w-8 h-8 opacity-40" />
              <span>Click to select a video file</span>
            </button>
          )}
        </SectionCard>

        {/* Step 2: Compression Strategy */}
        <SectionCard>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full bg-primary/20 text-primary">2</span>
            <h3 className="text-sm font-semibold">Choose Compression Strategy</h3>
          </div>

          <Select
            value={fileConfig.logic}
            onValueChange={(v) =>
              setFileConfig((prev) => ({ ...prev, logic: v }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select compression logic" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Compression Options</SelectLabel>
                <SelectItem value="bestBalance">Best Balance — Quality vs. Size</SelectItem>
                <SelectItem value="lowerBitrate">Lower Bitrate — Smaller file, lower quality</SelectItem>
                <SelectItem value="changeCodec">Change Codec — Better compression efficiency</SelectItem>
                <SelectItem value="reduceResolution">Reduce Resolution — Smaller dimensions</SelectItem>
                <SelectItem value="adjustFrameRate">Adjust Frame Rate — Fewer frames</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Conditional Options */}
          {fileConfig.logic === "lowerBitrate" && (
            <div className="mt-5 animate-fade-in">
              <Label className="block mb-1 text-sm font-medium">
                Bitrate
              </Label>
              <p className="mb-3 text-xs text-muted-foreground">
                Lower bitrate = lighter file
              </p>
              <div className="max-w-sm">
                <Slider
                  className="cursor-pointer"
                  value={[bitrateSteps.indexOf(fileConfig.bitrateValue) + 1]}
                  onValueChange={(value) => {
                    const selectedValue = bitrateSteps[value[0] - 1];
                    setFileConfig((prev) => ({
                      ...prev,
                      bitrateValue: selectedValue,
                    }));
                  }}
                  defaultValue={[1]}
                  max={bitrateSteps.length}
                  step={1}
                />
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  {bitrateSteps.map((step, index) => (
                    <span key={index} className="text-center">{step}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {fileConfig.logic === "changeCodec" && (
            <div className="mt-5 animate-fade-in">
              <Label className="block mb-1 text-sm font-medium">
                Quality Index (CRF)
              </Label>
              <p className="mb-2 text-xs text-muted-foreground">
                Lower values = better quality but larger file
              </p>
              <Input
                type="number"
                value={fileConfig.crfQualityValue}
                onChange={(e) =>
                  setFileConfig((prev) => ({
                    ...prev,
                    crfQualityValue: e.target.value,
                  }))
                }
                className="max-w-xs"
                placeholder="e.g., 23"
              />
            </div>
          )}

          {fileConfig.logic === "reduceResolution" && (
            <div className="mt-5 animate-fade-in">
              <Label className="block mb-2 text-sm font-medium">Resolution</Label>
              <Select
                value={fileConfig.resolution}
                onValueChange={(e) =>
                  setFileConfig((prev) => ({ ...prev, resolution: e }))
                }
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Select Resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Available Resolutions</SelectLabel>
                    <SelectItem value="360p">360p (640×360)</SelectItem>
                    <SelectItem value="480p">480p (854×480)</SelectItem>
                    <SelectItem value="720p">720p (1280×720)</SelectItem>
                    <SelectItem value="1080p">1080p (1920×1080)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          {fileConfig.logic === "adjustFrameRate" && (
            <div className="mt-5 animate-fade-in">
              <Label className="block mb-2 text-sm font-medium">Frame Rate</Label>
              <Select
                value={fileConfig.frameRate}
                onValueChange={(e) =>
                  setFileConfig((prev) => ({ ...prev, frameRate: e }))
                }
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Select Frame Rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Frame Rates</SelectLabel>
                    <SelectItem value="24">24 FPS</SelectItem>
                    <SelectItem value="30">30 FPS</SelectItem>
                    <SelectItem value="60">60 FPS</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}
        </SectionCard>

        {/* Compress Button */}
        <div className="flex justify-center">
          <Button
            disabled={!fileConfig.videoPath || isLoading || !fileConfig.logic}
            onClick={handleCompressVideo}
            className="px-8 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            size="lg"
          >
            <Minimize2 className="w-4 h-4 mr-2" />
            Compress Video
          </Button>
        </div>

        {/* Progress Card */}
        {status !== "idle" && (
          <SectionCard className="animate-scale-in">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                {status === "running" && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                {status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {status === "cancelled" && <XCircle className="w-4 h-4 text-yellow-400" />}
                {status === "error" && <XCircle className="w-4 h-4 text-destructive" />}
                <h3 className="text-sm font-semibold">
                  {status === "running"
                    ? "Compressing..."
                    : status === "done"
                    ? "Compression Complete"
                    : status === "cancelled"
                    ? "Cancelled"
                    : "Error"}
                </h3>
              </div>
              <Button
                variant={status === "running" ? "destructive" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  if (status === "running") {
                    handleCancelJob(jobId);
                  } else {
                    handleDismiss();
                  }
                }}
              >
                {status === "running" ? "Cancel" : "Dismiss"}
              </Button>
            </div>

            <div className="flex items-center gap-6">
              <CircularProgress
                value={progress[0]}
                size={100}
                strokeWidth={8}
                showLabel
                labelClassName="text-lg font-bold"
                renderLabel={(p) => `${p}%`}
                className="stroke-muted"
                progressClassName={`${status === "error" ? "stroke-destructive" : ""} ${
                  status === "done" ? "stroke-emerald-400" : ""
                } ${status === "running" ? "stroke-primary" : ""}`}
              />
              <div className="flex-1 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{formatMs(durationms)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Compressed</span>
                  <span className="font-medium">{formatMs(convertedms)}</span>
                </div>
                {eta !== null && eta > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ETA</span>
                    <span className="font-medium">{eta}s</span>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        )}
      </div>
    </PageShell>
  );
}
