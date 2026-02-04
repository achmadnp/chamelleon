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
import { Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  CancelCompress,
  CompressVideo,
  HandleSelectFile,
} from "../../wailsjs/go/main/App";

import { EventsOff, EventsOn } from "../../wailsjs/runtime/runtime";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          description: `output path: ` + p.output,
          duration: 8000,
          action: {
            label: "Open Folder",
            onClick: () => {
              if (p.output) {
              }
            },
          },
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

  return (
    <div className="flex-1 w-full p-8">
      <h1 className="mb-4 text-3xl font-bold text-center">
        Compress Video Format
      </h1>
      {error && <div className="mb-4 text-center text-red-500">{error}</div>}
      <div className="grid grid-cols-1 gap-4">
        <div className="flex col-span-1 text-center">
          <Button
            variant={"outline"}
            onClick={handleSelectFile}
            className="m-auto mt-4"
          >
            get video path
          </Button>
        </div>

        <div className="col-span-1">
          {fileConfig.videoPath ? (
            <Label className="flex mb-2 text-sm font-medium text-foreground">
              File Path: {fileConfig.videoPath}
              <Trash2Icon
                onClick={() => {
                  setFileConfig((prev) => ({ ...prev, videoPath: "" }));
                }}
                className="w-4 h-4 mx-4 text-red-500 cursor-pointer"
              />
            </Label>
          ) : (
            <Label className="flex mb-2 text-sm font-medium text-foreground">
              No file selected. Please select a video file.
            </Label>
          )}

          <Label className="block mt-10 mb-2 text-sm font-medium text-foreground">
            Logic
          </Label>

          <Select
            value={fileConfig.logic}
            onValueChange={(prev) =>
              setFileConfig((prevConfig) => ({ ...prevConfig, logic: prev }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Compression Logic" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Compression Options</SelectLabel>
                <SelectItem value="bestBalance">
                  Use Best Balance Quality Vs. Size
                </SelectItem>
                <SelectItem value="lowerBitrate">
                  Lower Bitrate (Smaller File, Lower Quality)
                </SelectItem>
                <SelectItem value="changeCodec">
                  Change Codec (Better Compression Efficiency)
                </SelectItem>
                <SelectItem value="reduceResolution">
                  Reduce Resolution (Smaller Dimensions)
                </SelectItem>
                <SelectItem value="adjustFrameRate">
                  Adjust Frame Rate (Fewer Frames = Smaller File)
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {fileConfig.logic === "lowerBitrate" && (
            <div className="w-full mx-20">
              <Label className="block mx-auto mt-8 text-sm font-medium text-foreground">
                Enter Bitrate <br />
                <span className="text-xs">
                  The lower the bitrate, the lighter the file
                </span>
              </Label>
              <div className="w-full max-w-sm mt-8">
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
                <div className="mt-2 -mx-1.5 flex items-center justify-between text-muted-foreground text-xs">
                  {bitrateSteps.map((step, index) => (
                    <span key={index} className="text-center">
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {fileConfig.logic === "changeCodec" && (
            <div className="mt-8">
              <Label className="block mt-4 text-sm font-medium text-foreground">
                Quality Index Value <br />
                <span className="text-xs">
                  controls quality—lower values = better quality but larger file
                </span>
              </Label>
              <Input
                type="number"
                value={fileConfig.crfQualityValue}
                onChange={(e) =>
                  setFileConfig((prev) => ({
                    ...prev,
                    crfQualityValue: e.target.value,
                  }))
                }
                className="w-full mt-2 border border-foreground"
                placeholder="Enter quality index value (e.g., 23)"
              />
            </div>
          )}

          {fileConfig.logic === "reduceResolution" && (
            <div className="mt-8">
              <Label className="block mt-4 text-sm font-medium text-foreground">
                Resolution
              </Label>
              <Select
                value={fileConfig.resolution}
                onValueChange={(e) => {
                  setFileConfig((prev) => ({
                    ...prev,
                    resolution: e,
                  }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Available Resolutions</SelectLabel>
                    <SelectItem value="360p">360p (640x360)</SelectItem>
                    <SelectItem value="480p">480p (854x480)</SelectItem>
                    <SelectItem value="720p">720p (1280x720)</SelectItem>
                    <SelectItem value="1080p">1080p (1920x1080)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          {fileConfig.logic === "adjustFrameRate" && (
            <div className="mt-8">
              <Label className="block mt-4 text-sm font-medium text-foreground">
                Frame Rate
              </Label>
              <Select
                value={fileConfig.frameRate}
                onValueChange={(e) => {
                  setFileConfig((prev) => ({
                    ...prev,
                    frameRate: e,
                  }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Frame Rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Available Frame Rates</SelectLabel>
                    <SelectItem value="24">24 FPS</SelectItem>
                    <SelectItem value="30">30 FPS</SelectItem>
                    <SelectItem value="60">60 FPS</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex w-full my-8">
            <Button
              disabled={!fileConfig.videoPath || isLoading || !fileConfig.logic}
              className="m-auto"
              onClick={handleCompressVideo}
            >
              <span className="mr-2">Convert</span>
            </Button>
          </div>
        </div>

        <Card
          className={`max-w-lg gap-0 min-w-[400px] mx-auto bg-transparent shadow-none border-primary ${
            status === "idle" ? "hidden" : "block"
          }`}
        >
          <CardHeader>
            <CardTitle className="flex justify-between">
              {status === "running"
                ? "Compressing Video..."
                : status === "done"
                ? "Video Compressed"
                : status === "cancelled"
                ? "Compression Cancelled"
                : "Error"}

              <Button
                variant="destructive"
                onClick={() => {
                  if (status === "running") {
                    handleCancelJob(jobId);
                    return;
                  }
                  setStatus("idle");
                  setProgress([0]);
                  setEta(null);
                  setDurationms(0);
                  setConvertedms(0);
                }}
              >
                {status === "running" ? "Cancel" : "Dismiss"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center w-full mx-auto">
              <CircularProgress
                value={progress[0]}
                size={120}
                strokeWidth={10}
                showLabel
                labelClassName="text-xl font-bold"
                renderLabel={(progress) => `${progress}%`}
                className="stroke-indigo-500/25"
                progressClassName={`${status === "error" && "stroke-red-500"} ${
                  status === "done" && "stroke-green-500"
                } ${status === "running" && "stroke-indigo-600"}`}
              />
              <div className="flex-1">
                <div>Compressing Status: {status}</div>
                <div>Total duration: {durationms} ms</div>
                <div>compressed duration: {convertedms} ms</div>
                <div>ETA: {eta} Seconds</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
