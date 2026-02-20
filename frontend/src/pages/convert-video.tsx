import { Button } from "@/components/ui/button";

import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import {
  ConvertVideoV2,
  HandleSelectFile,
} from "../../wailsjs/go/handlers/App";
import { Trash2Icon } from "lucide-react";
import { EventsOff, EventsOn } from "../../wailsjs/runtime/runtime";
import { CircularProgress } from "@/components/ui/progress";

import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      if (jobId && p.id !== jobId) return; // ignore other jobs
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
          description: `output path: ` + p.output,
          duration: 8000,
          action: {
            label: "Open Folder",
            onClick: () => {
              if (p.output) {
                // const folderPath = p.output.substring(
                //   0,
                //   p.output.lastIndexOf("/")
                // );
              }
            },
          },
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
    const r = await HandleSelectFile();

    if (!r) {
      console.error("No file selected.");
      return;
    }

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
        alert("Conversion failed to start.");
        return;
      }
      setJobId(id);
    } catch (error) {
      setStatus("error");
      alert("Error converting video: " + error);
    }
  };

  const checkConversion =
    !fileConfig.format || !videoPath || status === "running";
  return (
    <div className="flex-1 w-full p-8">
      <h1 className="mb-4 text-3xl font-bold text-center">
        Convert Video Format
      </h1>
      <Button>
        <a href="/compress-video">Supported Formats</a>
      </Button>
      <div className="grid grid-cols-1 gap-4">
        <div className="flex col-span-1 text-center">
          <Button
            variant={"outline"}
            onClick={handleSelectFile}
            className="m-auto mt-4 text-foreground"
            disabled={status === "running"}
          >
            get video path
          </Button>
        </div>

        <div className="col-span-1">
          {videoPath ? (
            <Label className="flex mb-2 text-sm font-medium text-gray-700 text-foreground">
              File Path: {videoPath}
              <Trash2Icon
                onClick={() => {
                  setVideoPath("");
                }}
                className="w-4 h-4 mx-4 text-red-500 cursor-pointer"
              />
            </Label>
          ) : (
            <Label className="flex mb-2 text-sm font-medium text-gray-700 text-foreground">
              No file selected. Please select a video file.
            </Label>
          )}

          <Label className="block mb-2 text-sm font-medium text-gray-700 text-foreground">
            Convert To
          </Label>
          <select
            value={fileConfig.format}
            onChange={(e) =>
              setFileConfig((prev) => ({ ...prev, format: e.target.value }))
            }
            disabled={status === "running"}
            className="w-full p-2 border border-gray-900 rounded-md text-background"
          >
            <option value="" disabled>
              Select format
            </option>
            <option value="mp4">MP4</option>
            <option value="avi">AVI</option>
            <option value="mov">MOV</option>
            <option value="mkv">MKV</option>
          </select>

          <div className="flex w-full my-8">
            <Button
              disabled={checkConversion}
              className="m-auto"
              onClick={handleConvertFile}
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
                ? "Converting Video..."
                : status === "done"
                  ? "Video converted"
                  : "Error!"}

              <Button
                variant="destructive"
                onClick={() => {
                  setStatus("idle");
                  setProgress([0]);
                  setEta(null);
                  setDurationms(0);
                  setConvertedms(0);
                }}
              >
                Dismiss
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
                <div>Converting Status: {status}</div>
                <div>Total duration: {durationms} ms</div>
                <div>converted duration: {convertedms} ms</div>
                <div>ETA: {eta} Seconds</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
