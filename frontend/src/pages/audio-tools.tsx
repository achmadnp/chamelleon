import { Button } from "@/components/ui/button";
import { PageShell, SectionCard } from "@/components/ui/page-shell";
import { useEffect, useState } from "react";
import {
  ExtractAudio,
  HandleSelectVideoFile,
  MuteVideo,
  ShowInFolder,
} from "../../wailsjs/go/handlers/App";
import {
  Music,
  FileVideo,
  Trash2Icon,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  VolumeX,
  Eye,
} from "lucide-react";
import { EventsOff, EventsOn } from "../../wailsjs/runtime/runtime";
import { CircularProgress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Mode = "extract" | "mute";

function formatMs(ms: number): string {
  if (!ms) return "0s";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

export default function AudioToolsPage() {
  const [videoPath, setVideoPath] = useState("");
  const [mode, setMode] = useState<Mode>("extract");
  const [audioFormat, setAudioFormat] = useState("mp3");

  // Job tracking
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState<number | null>(null);
  const [status, setStatus] = useState("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [outputPath, setOutputPath] = useState<string | null>(null);
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
        setOutputPath(p.output);
        toast.success(
          mode === "extract"
            ? "Audio extracted successfully!"
            : "Video muted successfully!",
          {
            description: `Output saved to: ${p.output}`,
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

    EventsOn("audio_progress", onProgress);
    EventsOn("audio_done", onDone);

    return () => {
      EventsOff("audio_progress");
      EventsOff("audio_done");
    };
  }, [jobId, progress, mode]);

  const handleSelectFile = async () => {
    const r = await HandleSelectVideoFile();
    if (!r) return;
    setVideoPath(r);
    setStatus("idle");
  };

  const handleStartProcess = async () => {
    if (!videoPath) return;
    setStatus("running");
    setProgress(0);
    setEta(null);

    try {
      let id: string;
      if (mode === "extract") {
        id = await ExtractAudio(videoPath, audioFormat);
      } else {
        id = await MuteVideo(videoPath);
      }
      
      if (!id) {
        setStatus("error");
        toast.error("Failed to start process.");
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
    setOutputPath(null);
  };

  const canStart = videoPath && status !== "running";

  return (
    <PageShell
      title="Audio Tools"
      subtitle="Extract audio tracks or remove sound from videos entirely."
      icon={Music}
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

        {/* Step 2: Audio Mode Options */}
        <SectionCard>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full bg-primary/20 text-primary">
              2
            </span>
            <h3 className="text-sm font-semibold">Choose Audio Tool</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setMode("extract")}
              className={`p-4 rounded-xl border text-left transition-all ${
                mode === "extract"
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border/50 hover:border-primary/30 hover:bg-muted/20"
              }`}
            >
              <Music
                className={`w-5 h-5 mb-2 ${
                  mode === "extract" ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <div className="text-sm font-semibold">Extract Audio</div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Rip the audio track into a separate file.
              </p>
            </button>

            <button
              onClick={() => setMode("mute")}
              className={`p-4 rounded-xl border text-left transition-all ${
                mode === "mute"
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border/50 hover:border-primary/30 hover:bg-muted/20"
              }`}
            >
              <VolumeX
                className={`w-5 h-5 mb-2 ${
                  mode === "mute" ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <div className="text-sm font-semibold">Mute Video</div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Remove all sound. Near-instant stream copy.
              </p>
            </button>
          </div>

          {/* Extract Audio format selection */}
          {mode === "extract" && (
            <div className="mt-2 animate-fade-in">
              <Label className="block mb-2 text-xs font-medium text-muted-foreground">
                Format
              </Label>
              <Select value={audioFormat} onValueChange={setAudioFormat}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select audio format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp3">.mp3 (Small File, Lossy)</SelectItem>
                  <SelectItem value="wav">.wav (Large File, Lossless)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </SectionCard>

        {/* Action Button */}
        <div className="flex justify-center">
          <Button
            disabled={!canStart}
            onClick={handleStartProcess}
            className="px-8 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            size="lg"
          >
            {status === "running" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {mode === "extract" ? "Extracting..." : "Muting..."}
              </>
            ) : (
              <>
                {mode === "extract" ? (
                  <Music className="w-4 h-4 mr-2" />
                ) : (
                  <VolumeX className="w-4 h-4 mr-2" />
                )}
                {mode === "extract" ? "Extract Audio" : "Mute Video"}
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
                    ? mode === "extract"
                      ? "Extracting Audio..."
                      : "Muting Video..."
                    : status === "done"
                    ? mode === "extract"
                      ? "Audio Extracted"
                      : "Video Muted"
                    : "Error"}
                </h3>
              </div>
              <div className="flex gap-2">
                {status === "done" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                    onClick={async () => {
                      if (outputPath) {
                        try {
                          await ShowInFolder(outputPath);
                        } catch (err) {
                           toast.error("Failed to open folder");
                        }
                      }
                    }}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    Show in Folder
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-7 text-xs">
                  Dismiss
                </Button>
              </div>
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
