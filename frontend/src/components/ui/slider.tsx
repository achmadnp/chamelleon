import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";
import { Badge } from "./badge";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative w-full h-2 overflow-hidden rounded-full grow bg-secondary">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block w-5 h-5 transition-colors border-2 rounded-full border-primary bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

const SliderMark = ({ steps }: { steps: string[] }) => {
  return (
    <div className="w-full max-w-sm">
      <Slider defaultValue={[1]} max={steps.length | 2} step={1}>
        <div className="mt-2 -mx-1.5 flex items-center justify-between text-muted-foreground text-xs">
          {steps.map((step, index) => (
            <span key={index} className="text-center">
              {step}
            </span>
          ))}
        </div>
      </Slider>
    </div>
  );
};

const SliderStickyLabel = ({
  min,
  max,
  step = 1,
  disabled = false,
  defaultValue,
  currentValue,
  onValueChange,
}: {
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  currentValue?: number[];
  defaultValue: number;
  onValueChange: (value: number[]) => void;
}) => {
  return (
    <div className="relative flex flex-col items-center w-full max-w-sm">
      <SliderPrimitive.Root
        defaultValue={[defaultValue]}
        value={currentValue ? currentValue : [defaultValue]}
        max={max}
        min={min}
        step={step}
        onValueChange={onValueChange}
        disabled={disabled}
        className="relative flex items-center w-full select-none touch-none group-hover:block"
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block w-4 h-4 transition-colors border rounded-full shadow border-primary/50 bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
          {!disabled && (
            <Badge className="absolute -translate-x-1/2 -translate-y-1/2 opacity-80 left-1/2 -top-2 ">
              {currentValue ? currentValue[0] : defaultValue}%
            </Badge>
          )}
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Root>
    </div>
  );
};

export { Slider, SliderMark, SliderStickyLabel };
