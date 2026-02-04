package handlers

import (
	"context"
	"fmt"
	"os"

	"chamelleon/internal/ffmpeg"
	imgservice "chamelleon/internal/image"
	"chamelleon/internal/job"
	"chamelleon/internal/video"

	"github.com/google/uuid"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct holds the application state and services
type App struct {
	ctx context.Context

	// Services
	ffmpegManager   *ffmpeg.Manager
	jobManager      *job.Manager
	convertService  *video.ConvertService
	compressService *video.CompressService
	adjustService   *imgservice.AdjustService
	blendService    *imgservice.BlendService
	blurService     *imgservice.BlurService
	effectService   *imgservice.EffectService
	formatService   *imgservice.FormatService
}

// NewApp creates a new App instance with all services initialized
func NewApp(ffmpegManager *ffmpeg.Manager, maxParallelJobs int) *App {
	jobMgr := job.NewManager(maxParallelJobs)

	return &App{
		ffmpegManager:   ffmpegManager,
		jobManager:      jobMgr,
		convertService:  video.NewConvertService(ffmpegManager),
		compressService: video.NewCompressService(ffmpegManager),
		adjustService:   imgservice.NewAdjustService(),
		blendService:    imgservice.NewBlendService(),
		blurService:     imgservice.NewBlurService(),
		effectService:   imgservice.NewEffectService(),
		formatService:   imgservice.NewFormatService(),
	}
}

// Startup is called at application startup
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
}

// DomReady is called after front-end resources have been loaded
func (a *App) DomReady(ctx context.Context) {
	// Add your action here
}

// BeforeClose is called when the application is about to quit
func (a *App) BeforeClose(ctx context.Context) (prevent bool) {
	return false
}

// Shutdown is called at application termination
func (a *App) Shutdown(ctx context.Context) {
	// Perform your teardown here
}

// HandleSelectFile opens a file dialog and returns the selected file path
func (a *App) HandleSelectFile() (string, error) {
	filepath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   "Select a file",
		Filters: []runtime.FileFilter{{DisplayName: "All Files", Pattern: "*.*"}},
	})

	if err != nil {
		return "", fmt.Errorf("failed to show file dialog: %v", err)
	}
	return filepath, nil
}

// ConvertVideoV2 starts a video conversion job
func (a *App) ConvertVideoV2(path string, convertTo string) (string, error) {
	id := uuid.NewString()
	outputPath := video.PrepareConvertOutput(path, convertTo)

	ffmpegPath, err := a.ffmpegManager.ExtractFFmpeg()
	if err != nil {
		return "", fmt.Errorf("failed to extract ffmpeg: %v", err)
	}
	defer os.Remove(ffmpegPath)

	durationMS, err := ffmpeg.ProbeDuration(ffmpegPath, path)
	if err != nil {
		return "", fmt.Errorf("failed to get duration: %w", err)
	}

	j, ctx := a.jobManager.CreateJob(id, path, outputPath, durationMS)

	go a.convertService.Convert(ctx, j, a.jobManager,
		func(progress job.Progress, force bool) {
			runtime.EventsEmit(a.ctx, "convert_progress", progress)
		},
		func(progress job.Progress) {
			runtime.EventsEmit(a.ctx, "convert_done", progress)
		},
	)

	return id, nil
}

// CompressVideo starts a video compression job
func (a *App) CompressVideo(path string, logic string) (string, error) {
	id := uuid.NewString()

	if _, err := os.Stat(path); os.IsNotExist(err) {
		return "", fmt.Errorf("file does not exist: %s", path)
	}

	outputPath := video.PrepareCompressOutput(path)

	ffmpegPath, err := a.ffmpegManager.ExtractFFmpeg()
	if err != nil {
		return "", fmt.Errorf("failed to extract ffmpeg: %v", err)
	}
	defer os.Remove(ffmpegPath)

	durationMs, err := ffmpeg.ProbeDuration(ffmpegPath, path)
	if err != nil {
		return "", fmt.Errorf("failed to get duration: %w", err)
	}

	j, ctx := a.jobManager.CreateJob(id, path, outputPath, durationMs)

	go a.compressService.Compress(ctx, j, a.jobManager, logic,
		func(progress job.Progress, force bool) {
			runtime.EventsEmit(a.ctx, "compression_progress", progress)
		},
		func(progress job.Progress) {
			runtime.EventsEmit(a.ctx, "compression_done", progress)
		},
	)

	return id, nil
}

// CancelJob cancels a video conversion job
func (a *App) CancelJob(id string) {
	if j, ok := a.jobManager.CancelJob(id); ok {
		j.MarkError(fmt.Errorf("job cancelled"))
		runtime.EventsEmit(a.ctx, "convert_done", j.Progress)
	}
}

// CancelCompress cancels a video compression job
func (a *App) CancelCompress(id string) {
	if j, ok := a.jobManager.CancelJob(id); ok {
		j.MarkCancelled()
		runtime.EventsEmit(a.ctx, "compression_done", j.Progress)
		a.jobManager.RemoveJob(id)
	}
}

// GetJob retrieves a job's progress
func (a *App) GetJob(id string) (job.Progress, bool) {
	if j, ok := a.jobManager.GetJob(id); ok {
		return j.Progress, true
	}
	return job.Progress{}, false
}

// ChangeImageFormat converts an image to a different format
func (a *App) ChangeImageFormat(filename, imageData, format string) (string, error) {
	return a.formatService.ChangeFormat(filename, imageData, format)
}

// AdjustImage applies adjustments to an image
func (a *App) AdjustImage(filename, imageData string, brightness, contrast, gamma, saturation float64, hue int) (string, error) {
	return a.adjustService.Adjust(imageData, imgservice.AdjustParams{
		Brightness: brightness,
		Contrast:   contrast,
		Gamma:      gamma,
		Saturation: saturation,
		Hue:        hue,
	})
}

// BlendImage applies a blend mode to an image
func (a *App) BlendImage(filename, imageData, mode string) (string, error) {
	return a.blendService.Blend(imageData, mode)
}

// BlurImage applies blur to an image
func (a *App) BlurImage(filename, imageData, mode string) (string, error) {
	return a.blurService.Blur(imageData, mode)
}

// EffectImage applies an effect to an image
func (a *App) EffectImage(filename, imageData, effectMode string) (string, error) {
	return a.effectService.Apply(imageData, effectMode)
}

// SaveProcessedImage saves a processed image to a file
func (a *App) SaveProcessedImage(filename, imageData string) (string, error) {
	return a.formatService.Save(filename, imageData)
}
