import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { PageShell, SectionCard } from "@/components/ui/page-shell";
import { useEffect, useState } from "react";
import {
  HandleSelectVideoFile,
  ProbeVideoDuration,
  TrimVideo,
  VideoToGif,
  ShowInFolder,
} from "../../wailsjs/go/handlers/App";
import {
  Scissors,
  FileVideo,
  Trash2Icon,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  ImageIcon,
} from "lucide-react";
import { EventsOff, EventsOn } from "../../wailsjs/runtime/runtime";
import { CircularProgress } from "@/components/ui/progress";
import { toast } from "sonner";

// Convert total seconds to HH:MM:SS.000 format for FFmpeg
function formatTimestamp(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const whole = Math.floor(s);
  const ms = Math.round((s - whole) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(whole).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

// Format seconds for display
function formatDisplay(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  const ms = Math.round((totalSeconds % 1) * 10);
  return m > 0
    ? `${m}:${String(s).padStart(2, "0")}.${ms}`
    : `${s}.${ms}s`;
}

function formatMs(ms: number): string {
  if (!ms) return "0s";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

const MAX_GIF_DURATION = 30; // seconds — suggest GIF only under this

type Mode = "trim" | "gif";

export default function TrimVideoPage() {
  const [videoPath, setVideoPath] = useState("");
  const [durationSec, setDurationSec] = useState(0);
  const [range_, setRange] = useState<[number, number]>([0, 0]);
  const [isProbing, setIsProbing] = useState(false);

  // GIF settings
  const [mode, setMode] = useState<Mode>("trim");
  const [gifFps, setGifFps] = useState(15);
  const [gifWidth, setGifWidth] = useState(480);

  // Job tracking
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState<number | null>(null);
  const [status, setStatus] = useState("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [durationms, setDurationms] = useState(0);
  const [convertedms, setConvertedms] = useState(0);

  const trimEvent = mode === "trim" ? "trim" : "gif";

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
      setProgress(parseFloat(p.percentage.toFixed(2)));
      setEta(p.eta_seconds);
      setStatus(p.status);
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
      setStatus(p.status === "done" ? "done" : "error");
      setProgress(p.status === "done" ? 100 : progress);
      if (p.status === "done") {
        toast.success(
          mode === "gif"
            ? "GIF created successfully!"
            : "Video trimmed successfully!",
          {
            description: `Output: ${p.output}`,
            duration: 8000,
            action: {
              label: "Show in Folder",
              onClick: () => ShowInFolder(p.output),
            },
          }
        );
      } else {
        toast.error("Failed: " + p.error);
      }
      setJobId(null);
      setEta(null);
    };

    EventsOn(`${trimEvent}_progress`, onProgress);
    EventsOn(`${trimEvent}_done`, onDone);

    return () => {
      EventsOff(`${trimEvent}_progress`);
      EventsOff(`${trimEvent}_done`);
    };
  }, [jobId, progress, trimEvent, mode]);

  const handleSelectFile = async () => {
    const r = await HandleSelectVideoFile();
    if (!r) return;
    setVideoPath(r);
    setStatus("idle");
    setIsProbing(true);

    try {
      const ms = await ProbeVideoDuration(r);
      const sec = Math.round((ms / 1000) * 10) / 10; // round to 0.1s
      setDurationSec(sec);
      setRange([0, sec]);
      toast.success(`Detected duration: ${formatDisplay(sec)}`);
    } catch (err) {
      toast.error("Could not detect duration: " + String(err));
      // Fallback — let the user set it manually
      setDurationSec(60);
      setRange([0, 60]);
    } finally {
      setIsProbing(false);
    }
  };

  const selectedDuration = range_[1] - range_[0];
  const canSaveAsGif = selectedDuration <= MAX_GIF_DURATION && selectedDuration > 0;

  const handleTrim = async () => {
    if (!videoPath) return;
    setStatus("running");
    setProgress(0);
    setEta(null);

    const startTs = formatTimestamp(range_[0]);
    const endTs = formatTimestamp(range_[1]);

    try {
      let id: string;
      if (mode === "gif") {
        id = await VideoToGif(videoPath, startTs, endTs, gifFps, gifWidth);
      } else {
        id = await TrimVideo(videoPath, startTs, endTs);
      }
      if (!id) {
        setStatus("error");
        toast.error("Failed to start.");
        return;
      }
      setJobId(id);
    } catch (error) {
      setStatus("error");
      toast.error("Error: " + error);
    }
  };

  const handleDismiss = () => {
    setStatus("idle");
    setProgress(0);
    setEta(null);
    setDurationms(0);
    setConvertedms(0);
  };

  // Adaptive step: fine for short clips, coarser for long videos
  const sliderStep = durationSec > 1800 ? 1 : durationSec > 300 ? 0.5 : 0.1;

  const canStart = videoPath && !isProbing && durationSec > 0 && range_[1] > range_[0] && status !== "running";

  return (
    <PageShell
      title="Trim Video"
      subtitle="Cut video segments and optionally save as GIF"
      icon={Scissors}
    >
      <div className="space-y-5">
        {/* Step 1: File Selection */}
        <SectionCard>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full bg-primary/20 text-primary">
              1
            </span>
            <h3 className="text-sm font-semibold">Select Video File</h3>
          </div>

          {videoPath ? (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 border-border/50">
              <FileVideo className="flex-shrink-0 w-5 h-5 text-primary" />
              <span className="flex-1 text-sm truncate text-foreground/80">
                {videoPath}
              </span>
              <button
                onClick={() => {
                  setVideoPath("");
                  setStatus("idle");
                }}
                className="p-1 transition-colors rounded hover:bg-destructive/20"
              >
                <Trash2Icon className="w-4 h-4 text-destructive" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSelectFile}
              disabled={status === "running"}
              className="flex flex-col items-center justify-center w-full gap-2 p-8 text-sm transition-all duration-200 border-2 border-dashed rounded-xl border-border/50 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-foreground disabled:opacity-50"
            >
              <Upload className="w-8 h-8 opacity-40" />
              <span>Click to select a video file</span>
            </button>
          )}
        </SectionCard>

        {/* Step 2: Set Duration + Range */}
        <SectionCard>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full bg-primary/20 text-primary">
              2
            </span>
            <h3 className="text-sm font-semibold">Set Trim Range</h3>
          </div>

          {isProbing ? (
            <div className="flex items-center gap-2 p-3 mb-4 border rounded-lg bg-muted/20 border-border/40">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Detecting video duration...</span>
            </div>
          ) : durationSec > 0 ? (
            <div className="flex items-center gap-2 p-3 mb-4 border rounded-lg bg-muted/20 border-border/40">
              <FileVideo className="w-4 h-4 text-primary" />
              <span className="text-sm">
                Total Duration: <span className="font-semibold text-primary">{formatDisplay(durationSec)}</span>
              </span>
            </div>
          ) : (
            <p className="mb-4 text-xs text-muted-foreground">
              Select a video file to detect its duration.
            </p>
          )}

          <div className="mb-2">
            <Label className="block mb-2 text-xs font-medium text-muted-foreground">
              Trim Range
            </Label>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground min-w-[50px]">
                {formatDisplay(range_[0])}
              </span>
              <Slider
                value={range_}
                onValueChange={(v) => setRange(v as [number, number])}
                min={0}
                max={durationSec}
                step={sliderStep}
                className="flex-1"
              />
              <span className="text-xs font-mono text-muted-foreground min-w-[50px] text-right">
                {formatDisplay(range_[1])}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 mt-3 border rounded-lg bg-muted/20 border-border/40">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Start
              </div>
              <div className="font-mono text-sm font-medium">
                {formatTimestamp(range_[0])}
              </div>
            </div>
            <div className="w-8 text-center text-muted-foreground/40">→</div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                End
              </div>
              <div className="font-mono text-sm font-medium">
                {formatTimestamp(range_[1])}
              </div>
            </div>
            <div className="ml-auto">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Duration
              </div>
              <div className="font-mono text-sm font-semibold text-primary">
                {formatDisplay(selectedDuration)}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Step 3: Output Mode */}
        <SectionCard>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full bg-primary/20 text-primary">
              3
            </span>
            <h3 className="text-sm font-semibold">Output Mode</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode("trim")}
              className={`p-4 rounded-xl border text-left transition-all ${
                mode === "trim"
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border/50 hover:border-primary/30 hover:bg-muted/20"
              }`}
            >
              <Scissors
                className={`w-5 h-5 mb-2 ${
                  mode === "trim" ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <div className="text-sm font-semibold">Trim Video</div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Cut segment, keep original format
              </p>
            </button>

            <button
              onClick={() => canSaveAsGif && setMode("gif")}
              disabled={!canSaveAsGif}
              className={`p-4 rounded-xl border text-left transition-all ${
                mode === "gif"
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : canSaveAsGif
                  ? "border-border/50 hover:border-primary/30 hover:bg-muted/20"
                  : "border-border/30 opacity-50 cursor-not-allowed"
              }`}
            >
              <ImageIcon
                className={`w-5 h-5 mb-2 ${
                  mode === "gif" ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <div className="text-sm font-semibold">Save as GIF</div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {canSaveAsGif
                  ? "Animated GIF from selection"
                  : `Max ${MAX_GIF_DURATION}s for GIF (selected: ${Math.round(selectedDuration)}s)`}
              </p>
            </button>
          </div>

          {/* GIF settings */}
          {mode === "gif" && (
            <div className="grid grid-cols-2 gap-3 mt-4 animate-fade-in">
              <div>
                <Label className="text-[10px] text-muted-foreground">
                  FPS
                </Label>
                <Input
                  type="number"
                  value={gifFps}
                  onChange={(e) =>
                    setGifFps(
                      Math.min(30, Math.max(5, parseInt(e.target.value) || 15))
                    )
                  }
                  min={5}
                  max={30}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">
                  Width (px)
                </Label>
                <Input
                  type="number"
                  value={gifWidth}
                  onChange={(e) =>
                    setGifWidth(
                      Math.min(1280, Math.max(120, parseInt(e.target.value) || 480))
                    )
                  }
                  min={120}
                  max={1280}
                />
              </div>
            </div>
          )}
        </SectionCard>

        {/* Action Button */}
        <div className="flex justify-center">
          <Button
            disabled={!canStart}
            onClick={handleTrim}
            className="px-8 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            size="lg"
          >
            {status === "running" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {mode === "gif" ? "Creating GIF..." : "Trimming..."}
              </>
            ) : (
              <>
                {mode === "gif" ? (
                  <ImageIcon className="w-4 h-4 mr-2" />
                ) : (
                  <Scissors className="w-4 h-4 mr-2" />
                )}
                {mode === "gif" ? "Create GIF" : "Trim Video"}
              </>
            )}
          </Button>
        </div>

        {/* Progress Card */}
        {status !== "idle" && (
          <SectionCard className="animate-scale-in">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                {status === "running" && (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                )}
                {status === "done" && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                {status === "error" && (
                  <XCircle className="w-4 h-4 text-destructive" />
                )}
                <h3 className="text-sm font-semibold">
                  {status === "running"
                    ? mode === "gif"
                      ? "Creating GIF..."
                      : "Trimming..."
                    : status === "done"
                    ? mode === "gif"
                      ? "GIF Created"
                      : "Trim Complete"
                    : "Error"}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-7 text-xs"
              >
                Dismiss
              </Button>
            </div>

            <div className="flex items-center gap-6">
              <CircularProgress
                value={progress}
                size={100}
                strokeWidth={8}
                showLabel
                labelClassName="text-lg font-bold"
                renderLabel={(p) => `${p}%`}
                className="stroke-muted"
                progressClassName={`${
                  status === "error" ? "stroke-destructive" : ""
                } ${status === "done" ? "stroke-emerald-400" : ""} ${
                  status === "running" ? "stroke-primary" : ""
                }`}
              />
              <div className="flex-1 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{formatMs(durationms)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processed</span>
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
