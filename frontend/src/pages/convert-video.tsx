import { Button } from "@/components/ui/button";
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
import { useEffect, useState } from "react";
import {
  ConvertVideoV2,
  HandleSelectVideoFile,
} from "../../wailsjs/go/handlers/App";
import {
  ArrowRightLeft,
  Trash2Icon,
  FileVideo,
  Loader2,
  CheckCircle2,
  XCircle,
  Upload,
} from "lucide-react";
import { EventsOff, EventsOn } from "../../wailsjs/runtime/runtime";
import { CircularProgress } from "@/components/ui/progress";
import { toast } from "sonner";

export default function ConvertVideoPage() {
  const [fileConfig, setFileConfig] = useState({
    format: "",
    file: null as File | null,
  });

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
      setStatus(p.status === "done" ? "done" : "error");
      setProgress(p.status === "done" ? [100] : progress);
      if (p.status === "done") {
        toast.success("Conversion successful!", {
          description: `Output: ${p.output}`,
          duration: 8000,
        });
      } else {
        toast.error("Conversion failed: " + p.error);
      }
      setJobId(null);
      setEta(null);
    };

    EventsOn("convert_progress", onProgress);
    EventsOn("convert_done", onDone);

    return () => {
      EventsOff("convert_progress");
      EventsOff("convert_done");
    };
  }, [jobId, progress]);

  const [videoPath, setVideoPath] = useState("");

  const handleSelectFile = async () => {
    const r = await HandleSelectVideoFile();
    if (!r) return;
    setVideoPath(r);
  };

  const handleConvertFile = async () => {
    try {
      setStatus("running");
      setProgress([0]);
      setEta(null);
      const id = await ConvertVideoV2(videoPath, fileConfig.format);
      if (!id) {
        setStatus("error");
        toast.error("Conversion failed to start.");
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
    setProgress([0]);
    setEta(null);
    setDurationms(0);
    setConvertedms(0);
  };

  const canConvert = fileConfig.format && videoPath && status !== "running";

  const formatMs = (ms: number) => {
    if (!ms) return "0s";
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  };

  return (
    <PageShell
      title="Convert Video"
      subtitle="Convert between MP4, AVI, MOV, MKV, and TS formats"
      icon={ArrowRightLeft}
    >
      <div className="space-y-5">
        {/* Step 1: File Selection */}
        <SectionCard>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full bg-primary/20 text-primary">1</span>
            <h3 className="text-sm font-semibold">Select Video File</h3>
          </div>

          {videoPath ? (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 border-border/50">
              <FileVideo className="flex-shrink-0 w-5 h-5 text-primary" />
              <span className="flex-1 text-sm truncate text-foreground/80">{videoPath}</span>
              <button
                onClick={() => setVideoPath("")}
                className="p-1 transition-colors rounded hover:bg-destructive/20"
              >
                <Trash2Icon className="w-4 h-4 text-destructive" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSelectFile}
              disabled={status === "running"}
              className="flex flex-col items-center justify-center w-full gap-2 p-8 text-sm transition-all duration-200 border-2 border-dashed rounded-xl border-border/50 text-muted-foreground hover:border-primary/5 hover:bg-primary/5 hover:text-foreground disabled:opacity-50"
            >
              <Upload className="w-8 h-8 opacity-40" />
              <span>Click to select a video file</span>
            </button>
          )}
        </SectionCard>

        {/* Step 2: Format Selection */}
        <SectionCard>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full bg-primary/20 text-primary">2</span>
            <h3 className="text-sm font-semibold">Choose Target Format</h3>
          </div>

          <Select
            value={fileConfig.format}
            onValueChange={(v) =>
              setFileConfig((prev) => ({ ...prev, format: v }))
            }
            disabled={status === "running"}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select output format" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Video Formats</SelectLabel>
                <SelectItem value="mp4">MP4 — Universal compatibility</SelectItem>
                <SelectItem value="avi">AVI — Legacy format</SelectItem>
                <SelectItem value="mov">MOV — Apple ecosystem</SelectItem>
                <SelectItem value="mkv">MKV — Flexible container</SelectItem>
                <SelectItem value="ts">TS — Transport Stream</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </SectionCard>

        {/* Convert Button */}
        <div className="flex justify-center">
          <Button
            disabled={!canConvert}
            onClick={handleConvertFile}
            className="px-8 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            size="lg"
          >
            {status === "running" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Convert Video
              </>
            )}
          </Button>
        </div>

        {/* Progress Card */}
        {status !== "idle" && (
          <SectionCard className="animate-scale-in">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                {status === "running" && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                {status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {status === "error" && <XCircle className="w-4 h-4 text-destructive" />}
                <h3 className="text-sm font-semibold">
                  {status === "running" ? "Converting..." : status === "done" ? "Conversion Complete" : "Error"}
                </h3>
              </div>
              <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-7 text-xs">
                Dismiss
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
                  <span className="text-muted-foreground">Converted</span>
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
