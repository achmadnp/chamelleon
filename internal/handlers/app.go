package handlers

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

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
	ffmpegManager        *ffmpeg.Manager
	jobManager           *job.Manager
	convertService       *video.ConvertService
	compressService      *video.CompressService
	trimService          *video.TrimService
	audioService         *video.AudioService
	adjustService        *imgservice.AdjustService
	blendService         *imgservice.BlendService
	blurService          *imgservice.BlurService
	effectService        *imgservice.EffectService
	formatService        *imgservice.FormatService
	imgConvertService    *imgservice.ConvertService
	imgCompressService   *imgservice.CompressService
}

// NewApp creates a new App instance with all services initialized
func NewApp(ffmpegManager *ffmpeg.Manager, maxParallelJobs int) *App {
	jobMgr := job.NewManager(maxParallelJobs)

	return &App{
		ffmpegManager:      ffmpegManager,
		jobManager:         jobMgr,
		convertService:     video.NewConvertService(ffmpegManager),
		compressService:    video.NewCompressService(ffmpegManager),
		trimService:        video.NewTrimService(ffmpegManager),
		audioService:       video.NewAudioService(ffmpegManager),
		adjustService:      imgservice.NewAdjustService(),
		blendService:       imgservice.NewBlendService(),
		blurService:        imgservice.NewBlurService(),
		effectService:      imgservice.NewEffectService(),
		formatService:      imgservice.NewFormatService(),
		imgConvertService:  imgservice.NewConvertService(),
		imgCompressService: imgservice.NewCompressService(),
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

// ShowInFolder opens the system file explorer and selects the file
func (a *App) ShowInFolder(path string) error {
	var cmd *exec.Cmd
	switch runtimeOS := os.Getenv("GOOS"); runtimeOS { // Note: runtime package is shadowed by Wails runtime
	case "windows", "":
		// Windows 'explorer /select,"filepath"' highlights the file in the folder
		cmd = exec.Command("explorer", "/select,", path)
	case "darwin":
		cmd = exec.Command("open", "-R", path)
	default:
		// Linux fallback just opens the directory
		cmd = exec.Command("xdg-open", filepath.Dir(path))
	}
	return cmd.Start()
}

// ProbeVideoDuration returns the duration of a video file in milliseconds
func (a *App) ProbeVideoDuration(path string) (int64, error) {
	ffmpegPath, err := a.ffmpegManager.ExtractFFmpeg()
	if err != nil {
		return 0, fmt.Errorf("failed to extract ffmpeg: %v", err)
	}
	defer os.Remove(ffmpegPath)

	durationMS, err := ffmpeg.ProbeDuration(ffmpegPath, path)
	if err != nil {
		return 0, fmt.Errorf("failed to probe duration: %w", err)
	}
	return durationMS, nil
}

// HandleSelectVideoFile opens a file dialog restricted to video files
func (a *App) HandleSelectVideoFile() (string, error) {
	filepath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select a video file",
		Filters: []runtime.FileFilter{
			{DisplayName: "Video Files (*.mp4, *.avi, *.mov, *.mkv, *.webm, *.flv, *.wmv, *.ts)", Pattern: "*.mp4;*.avi;*.mov;*.mkv;*.webm;*.flv;*.wmv;*.ts"},
		},
	})

	if err != nil {
		return "", fmt.Errorf("failed to show file dialog: %v", err)
	}
	return filepath, nil
}

// HandleSelectImageFile opens a file dialog restricted to image files
func (a *App) HandleSelectImageFile() (string, error) {
	filepath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select an image file",
		Filters: []runtime.FileFilter{
			{DisplayName: "Image Files (*.png, *.jpg, *.jpeg, *.webp, *.gif, *.ico, *.bmp)", Pattern: "*.png;*.jpg;*.jpeg;*.webp;*.gif;*.ico;*.bmp"},
		},
	})

	if err != nil {
		return "", fmt.Errorf("failed to show file dialog: %v", err)
	}
	return filepath, nil
}

// ConvertVideoV2 starts a video conversion job
func (a *App) ConvertVideoV2(path string, convertTo string) (string, error) {
	ext := strings.TrimPrefix(filepath.Ext(path), ".")
	if strings.ToLower(ext) == strings.ToLower(convertTo) {
		return "", fmt.Errorf("cannot convert video to the same format")
	}

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

// SaveAsImage opens a save file dialog and saves the base64 image data to the chosen path
func (a *App) SaveAsImage(defaultName, base64Data string) (string, error) {
	ext := filepath.Ext(defaultName)
	if ext == "" {
		ext = ".png" // Fallback
	}

	filterPattern := "*" + ext

	filepath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save Image As",
		DefaultFilename: defaultName,
		Filters: []runtime.FileFilter{
			{DisplayName: "Image File (" + filterPattern + ")", Pattern: filterPattern},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})

	if err != nil {
		return "", fmt.Errorf("failed to open save dialog: %v", err)
	}

	if filepath == "" {
		return "", nil // User cancelled
	}

	// Just use the existing formatService logic to decode and write the file
	return a.formatService.Save(filepath, base64Data)
}

// ConvertImage converts an image to a different format and returns base64 data URL
func (a *App) ConvertImage(imageData, targetFormat string) (string, error) {
	return a.imgConvertService.ConvertFormat(imageData, targetFormat)
}

// CompressImage compresses an image with the given quality and optional resize
func (a *App) CompressImage(imageData string, quality int, maxWidth int, maxHeight int) (*imgservice.CompressResult, error) {
	return a.imgCompressService.Compress(imageData, imgservice.CompressParams{
		Quality:   quality,
		MaxWidth:  maxWidth,
		MaxHeight: maxHeight,
	})
}

// TrimVideo trims a video between startTime and endTime (HH:MM:SS.ms format)
func (a *App) TrimVideo(path, startTime, endTime string) (string, error) {
	id := uuid.NewString()
	outputPath := video.PrepareTrimOutput(path)

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

	go a.trimService.Trim(ctx, j, a.jobManager, startTime, endTime,
		func(progress job.Progress, force bool) {
			runtime.EventsEmit(a.ctx, "trim_progress", progress)
		},
		func(progress job.Progress) {
			runtime.EventsEmit(a.ctx, "trim_done", progress)
		},
	)

	return id, nil
}

// VideoToGif converts a video segment to an animated GIF
func (a *App) VideoToGif(path, startTime, endTime string, fps, width int) (string, error) {
	id := uuid.NewString()
	outputPath := video.PrepareGifOutput(path)

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

	go a.trimService.ToGif(ctx, j, a.jobManager, startTime, endTime, fps, width,
		func(progress job.Progress, force bool) {
			runtime.EventsEmit(a.ctx, "gif_progress", progress)
		},
		func(progress job.Progress) {
			runtime.EventsEmit(a.ctx, "gif_done", progress)
		},
	)

	return id, nil
}

// ExtractAudio extracts an audio stream from a video file
func (a *App) ExtractAudio(path, format string) (string, error) {
	id := uuid.NewString()
	outputPath := video.PrepareAudioOutput(path, "audio", format)

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

	go a.audioService.ExtractAudio(ctx, j, a.jobManager, format,
		func(progress job.Progress, force bool) {
			runtime.EventsEmit(a.ctx, "audio_progress", progress)
		},
		func(progress job.Progress) {
			runtime.EventsEmit(a.ctx, "audio_done", progress)
		},
	)

	return id, nil
}

// MuteVideo removes the audio stream from a video completely
func (a *App) MuteVideo(path string) (string, error) {
	id := uuid.NewString()
	ext := filepath.Ext(path)
	if ext == "" {
		ext = ".mp4"
	}
	outputPath := video.PrepareAudioOutput(path, "muted", ext[1:])

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

	go a.audioService.MuteVideo(ctx, j, a.jobManager,
		func(progress job.Progress, force bool) {
			runtime.EventsEmit(a.ctx, "audio_progress", progress)
		},
		func(progress job.Progress) {
			runtime.EventsEmit(a.ctx, "audio_done", progress)
		},
	)

	return id, nil
}
