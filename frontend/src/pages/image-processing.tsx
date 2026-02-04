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
import { useState } from "react";
import { AdjustImage } from "../../wailsjs/go/main/App";
import { SaveIcon } from "lucide-react";

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

  const handleImageDrop = (files: File[]) => {
    if (files.length === 0) {
      console.error("No files selected.");
      return;
    }

    const file = files[0];
    setImgConfig((prev) => ({ ...prev, file }));

    const reader = new FileReader();
    if (!file) {
      console.error("No image file selected.");
      return;
    }
    reader.readAsDataURL(file);

    reader.onload = () => {
      const base64Image = reader.result as string;
      setProcessedImg(base64Image);
    };
  };

  const handleSavedImage = async () => {
    if (!processedImg) {
      console.error("No processed image to save.");
      return;
    }
    const link = document.createElement("a");
    link.href = processedImg;
    link.download =
      `transformed_${imgConfig.file?.name}` || "processed_image.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageAdjustments = async () => {
    console.log("Adjustments: ", adjustments);
    const reader = new FileReader();

    if (!imgConfig.file) {
      console.error("No image file selected.");
      return;
    }
    reader.readAsDataURL(imgConfig.file);
    reader.onload = async function () {
      const base64Image = reader.result as string;
      console.log("Base64 Image: ", base64Image);

      // Here you would typically send the base64Image and adjustments to your backend
      // For example:
      // const response = await processImage(base64Image, adjustments, imgConfig);
      // console.log("Processed Image Response: ", response);
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
        console.error("Image processing failed.");
        return;
      }

      setProcessedImg(`data:image/png;base64,${res}`);
    };
    reader.onerror = function (error) {
      console.log("Error: ", error);
    };
    console.log(imgConfig.file);
  };

  return (
    <div className="flex-1 w-full p-8">
      <h1 className="mb-4 text-3xl font-bold text-center">Image Processing</h1>
      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h2 className="mb-2 text-2xl font-semibold text-center">
              Image Input
            </h2>
            {imgConfig.file ? (
              <SingleImagePreview
                image={imgConfig.file}
                onRemove={() =>
                  setImgConfig({
                    format: "",
                    file: null,
                    blendMode: "",
                    blurMode: "",
                    effect: "",
                  })
                }
              />
            ) : (
              <FileDropzone
                className="col-span-1"
                onFilesAdded={handleImageDrop}
              />
            )}
          </div>
          <div>
            <h2 className="mb-2 text-2xl font-semibold text-center">
              Processed
            </h2>
            {processedImg ? (
              <div className="flex flex-col items-center space-y-4 border rounded-xl">
                <img
                  src={`${processedImg}`}
                  alt="Processed"
                  className="w-full h-auto rounded-lg"
                />
                <Button onClick={handleSavedImage} className="flex">
                  <SaveIcon className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            ) : (
              <div className="flex min-h-[240px] flex-col items-center space-y-4 border rounded-xl">
                <div className="flex-col m-auto">
                  <div>Currently no image is processed.</div>
                  <div>Please upload an image to process it.</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center">
          <h2 className="mb-2 text-2xl font-semibold text-center">
            Adjust Image
          </h2>
          <div className="grid items-center grid-cols-2 gap-4">
            <div className="px-1 mb-2 border rounded-lg shadow-md shadow-gray-500">
              <h2 className="">Brightness</h2>
              <div className="flex items-center w-full max-w-sm gap-2">
                <Slider
                  value={[adjustments.brightness]}
                  onValueChange={(value) =>
                    setAdjustments({ ...adjustments, brightness: value[0] })
                  }
                  onValueCommit={handleImageAdjustments}
                  min={-1}
                  max={1}
                  step={0.01}
                />
                <Input
                  type="text"
                  value={adjustments.brightness}
                  onKeyUp={(e) => {
                    if (e.key === "Enter") {
                      console.log("enter value ", adjustments.brightness);
                      e.currentTarget.blur();
                      handleImageAdjustments();
                    }
                  }}
                  onChange={(e) =>
                    setAdjustments({
                      ...adjustments,
                      brightness: e.target.value
                        ? parseFloat(e.target.value) > 1
                          ? 1
                          : parseFloat(e.target.value)
                        : 0,
                    })
                  }
                  className="w-[8ch] mb-1"
                />
              </div>
            </div>

            <div className="px-1 mb-2 border rounded-lg shadow-md shadow-gray-500">
              <h2 className="">Contrast</h2>
              <div className="flex items-center w-full max-w-sm gap-2">
                <Slider
                  value={[adjustments.contrast]}
                  onValueChange={(value) =>
                    setAdjustments({ ...adjustments, contrast: value[0] })
                  }
                  onValueCommit={handleImageAdjustments}
                  min={-1}
                  max={1}
                  step={0.1}
                />
                <Input
                  type="text"
                  max={1}
                  min={-1}
                  value={adjustments.contrast}
                  onKeyUp={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                      handleImageAdjustments();
                    }
                  }}
                  onChange={(e) =>
                    setAdjustments({
                      ...adjustments,
                      contrast: e.target.value
                        ? parseFloat(e.target.value) > 1
                          ? 1
                          : parseFloat(e.target.value)
                        : 0,
                    })
                  }
                  className="w-[7ch] mb-1"
                />
              </div>
            </div>

            <div className="px-1 mb-2 border rounded-lg shadow-md shadow-gray-500">
              <h2 className="">Gamma</h2>
              <div className="flex items-center w-full max-w-sm gap-2">
                <Slider
                  value={[adjustments.gamma]}
                  onValueChange={(value) =>
                    setAdjustments({ ...adjustments, gamma: value[0] })
                  }
                  onValueCommit={handleImageAdjustments}
                  min={0.1}
                  max={5.0}
                  step={0.1}
                />
                <Input
                  type="text"
                  max={5}
                  min={0.1}
                  value={adjustments.gamma}
                  onKeyUp={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                      handleImageAdjustments();
                    }
                  }}
                  onChange={(e) =>
                    setAdjustments({
                      ...adjustments,
                      gamma: e.target.value
                        ? parseFloat(e.target.value) > 5
                          ? parseFloat(e.target.value) === 0
                            ? 0.1
                            : 5
                          : parseFloat(e.target.value)
                        : 0.1,
                    })
                  }
                  className="w-[7ch] mb-1"
                />
              </div>
            </div>
            <div className="px-1 mb-2 border rounded-lg shadow-md shadow-gray-500">
              <h2 className="">Saturation</h2>
              <div className="flex items-center w-full max-w-sm gap-2">
                <Slider
                  value={[adjustments.saturation]}
                  onValueChange={(value) =>
                    setAdjustments({ ...adjustments, saturation: value[0] })
                  }
                  onValueCommit={handleImageAdjustments}
                  min={-100}
                  max={100}
                  step={1}
                />
                <Input
                  type="text"
                  max={1}
                  min={-1}
                  value={adjustments.saturation}
                  onKeyUp={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                      handleImageAdjustments();
                    }
                  }}
                  onChange={(e) =>
                    setAdjustments({
                      ...adjustments,
                      saturation: e.target.value
                        ? parseFloat(e.target.value) > 100
                          ? 100
                          : parseFloat(e.target.value)
                        : 0,
                    })
                  }
                  className="w-[7ch] mb-1"
                />
              </div>
            </div>

            <div className="px-1 mb-2 border rounded-lg shadow-md shadow-gray-500">
              <h2 className="">Hue</h2>
              <div className="flex items-center w-full max-w-sm gap-2">
                <Slider
                  value={[adjustments.hue]}
                  onValueChange={(value) =>
                    setAdjustments({ ...adjustments, hue: value[0] })
                  }
                  onValueCommit={handleImageAdjustments}
                  min={-360}
                  max={360}
                  step={1}
                />
                <Input
                  type="text"
                  max={1}
                  min={-1}
                  value={adjustments.hue}
                  onKeyUp={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                      handleImageAdjustments();
                    }
                  }}
                  onChange={(e) =>
                    setAdjustments({
                      ...adjustments,
                      hue: e.target.value
                        ? parseFloat(e.target.value) > 360
                          ? 360
                          : parseFloat(e.target.value)
                        : 0,
                    })
                  }
                  className="w-[7ch] mb-1"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-2xl font-semibold text-center">
            Blend Image
          </h2>

          <Label className="block mb-2 text-sm font-medium text-foreground">
            Blend Mode
          </Label>
          <Select
            value={imgConfig.blendMode || ""}
            onValueChange={(value) => {
              setImgConfig({ ...imgConfig, blendMode: value });
              handleImageAdjustments();
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Blend Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Blend Mode</SelectLabel>
                <SelectItem value="add">Blend Mode: ADD</SelectItem>
                <SelectItem value="color-burn">
                  Blend Mode: Color Burn
                </SelectItem>
                <SelectItem value="color-dodge">
                  Blend Mode: Color Dodge
                </SelectItem>
                <SelectItem value="darken">Blend Mode: Darken</SelectItem>
                <SelectItem value="lighten">Blend Mode: Lighten</SelectItem>
                <SelectItem value="difference">
                  Blend Mode: Difference
                </SelectItem>
                <SelectItem value="exclusion">Blend Mode: Exclusion</SelectItem>
                <SelectItem value="linear-burn">
                  Blend Mode: Linear Burn
                </SelectItem>
                <SelectItem value="linear-light">
                  Blend Mode: Linear Light
                </SelectItem>
                <SelectItem value="Multiply">Blend Mode: Multiply</SelectItem>
                <SelectItem value="normal">Blend Mode: Normal</SelectItem>
                <SelectItem value="opacity">Blend Mode: Opacity</SelectItem>
                <SelectItem value="overlay">Blend Mode: Overlay</SelectItem>
                <SelectItem value="screen">Blend Mode: Screen</SelectItem>
                <SelectItem value="soft-light">
                  Blend Mode: Soft Light
                </SelectItem>
                <SelectItem value="substract">Blend Mode: Substract</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div>
          <h2 className="mb-2 text-2xl font-semibold text-center">
            Blur Image
          </h2>

          <Label className="block mb-2 text-sm font-medium text-foreground">
            Blur Mode
          </Label>
          <Select
            value={imgConfig.blurMode || ""}
            onValueChange={(value) =>
              setImgConfig({ ...imgConfig, blurMode: value })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Blend Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Blur Mode</SelectLabel>
                <SelectItem value="gaussian">Blur Mode: gaussian</SelectItem>
                <SelectItem value="box">Blur Mode: box</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div>
          <h2 className="mb-2 text-2xl font-semibold text-center">Effects</h2>

          <Label className="block mb-2 text-sm font-medium text-foreground">
            Image Effect
          </Label>
          <Select
            value={imgConfig.effect || ""}
            onValueChange={(value) =>
              setImgConfig({ ...imgConfig, effect: value })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Blend Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Effect</SelectLabel>
                <SelectItem value="dilate">Dilate</SelectItem>
                <SelectItem value="edge-detection">Edge Detection</SelectItem>
                <SelectItem value="emboss">Emboss</SelectItem>
                <SelectItem value="erode">Erode</SelectItem>
                <SelectItem value="invert">Invert</SelectItem>
                <SelectItem value="median">Median</SelectItem>
                <SelectItem value="sepia">Sepia</SelectItem>
                <SelectItem value="sharpen">Sharpen</SelectItem>
                <SelectItem value="sobel">Sobel</SelectItem>
                <SelectItem value="unsharp-mark">Unsharp Mark</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-full">
          <Button
            onClick={handleImageAdjustments}
            className="m-auto text-center"
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
