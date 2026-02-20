package video

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"chamelleon/internal/ffmpeg"
	"chamelleon/internal/job"
)

// CompressService handles video compression
type CompressService struct {
	ffmpegManager *ffmpeg.Manager
}

// NewCompressService creates a new compress service
func NewCompressService(ffmpegManager *ffmpeg.Manager) *CompressService {
	return &CompressService{
		ffmpegManager: ffmpegManager,
	}
}

// Compress compresses a video using the specified strategy
func (s *CompressService) Compress(
	ctx context.Context,
	j *job.Job,
	jobManager *job.Manager,
	logic string,
	onProgress ProgressCallback,
	onDone DoneCallback,
) {
	jobManager.AcquireSemaphore()
	defer jobManager.ReleaseSemaphore()

	ffmpegPath, err := s.ffmpegManager.ExtractFFmpeg()
	if err != nil {
		s.finishWithError(j, jobManager, fmt.Errorf("failed to extract ffmpeg: %v", err), onProgress, onDone)
		return
	}
	defer os.Remove(ffmpegPath)

	j.MarkRunning()
	s.emitProgress(j, onProgress, true)

	args, err := BuildCompressCommand(j.Progress.Input, j.Progress.Output, logic)
	if err != nil {
		s.finishWithError(j, jobManager, fmt.Errorf("failed to build ffmpeg command: %v", err), onProgress, onDone)
		return
	}

	cmd := exec.CommandContext(ctx, ffmpegPath, args...)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		s.finishWithError(j, jobManager, fmt.Errorf("stdout err: %v", err), onProgress, onDone)
		return
	}

	cmd.Stderr = os.Stderr
	if err := cmd.Start(); err != nil {
		s.finishWithError(j, jobManager, fmt.Errorf("ffmpeg command failed to start: %v", err), onProgress, onDone)
		return
	}

	scanner := bufio.NewScanner(stdout)
	scanner.Buffer(make([]byte, 0, 64*1024), 10*1024*1024)

	var outMS int64
	var speed string

	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	emitNow := func(force bool) {
		j.UpdateProgress(outMS, speed)
		fmt.Printf("Progress: %.2f%%, OutTimeMS: %d, Speed: %s, ETASeconds: %d\n",
			j.Progress.Percentage, j.Progress.OutTimeMS, j.Progress.Speed, j.Progress.ETASeconds)
		s.emitProgress(j, onProgress, force)
	}

	progressDone := false

	go func() {
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" {
				continue
			}

			if strings.HasPrefix(line, "out_time_ms=") {
				if v, err := strconv.ParseInt(strings.TrimPrefix(line, "out_time_ms="), 10, 64); err == nil {
					outMS = v / 1000
				}
			} else if strings.HasPrefix(line, "speed=") {
				speed = strings.TrimPrefix(line, "speed=")
			} else if strings.HasPrefix(line, "progress=") {
				val := strings.TrimPrefix(line, "progress=")
				if val == "end" {
					progressDone = true
				}
			}
		}
	}()

loop:
	for {
		select {
		case <-ctx.Done():
			_ = cmd.Process.Kill()
			return
		case <-ticker.C:
			emitNow(false)
		default:
			if progressDone {
				break loop
			}
			time.Sleep(100 * time.Millisecond)
		}
	}

	if err := cmd.Wait(); err != nil {
		s.finishWithError(j, jobManager, fmt.Errorf("ffmpeg command failed: %v", err), onProgress, onDone)
		return
	}

	j.MarkDone()
	s.emitProgress(j, onProgress, true)
	onDone(j.Progress)
	jobManager.RemoveJob(j.ID)
}

// PrepareCompressOutput generates the output path for compression
func PrepareCompressOutput(inputPath string) string {
	dirPath := filepath.Dir(inputPath)
	baseName := strings.TrimSuffix(filepath.Base(inputPath), filepath.Ext(inputPath))
	return filepath.Join(dirPath, baseName+"_compressed.mp4")
}

// BuildCompressCommand builds FFmpeg arguments based on compression strategy
func BuildCompressCommand(inputPath, outputPath, logic string) ([]string, error) {
	var args []string

	switch logic {
	case "lowerBitrate":
		args = []string{
			"-y", "-i", inputPath,
			"-b:v", "1000k",
			"-progress", "pipe:1",
			outputPath,
		}

	case "changeCodec":
		args = []string{
			"-y", "-i", inputPath,
			"-c:v", "libx264",
			"-crf", "28",
			"-progress", "pipe:1",
			outputPath,
		}

	case "reduceResolution":
		args = []string{
			"-y", "-i", inputPath,
			"-vf", "scale=-1:720",
			"-c:v", "libx264",
			"-crf", "23",
			"-progress", "pipe:1",
			outputPath,
		}

	case "adjustFrameRate":
		args = []string{
			"-y", "-i", inputPath,
			"-r", "24",
			"-progress", "pipe:1",
			outputPath,
		}

	case "bestBalance":
		args = []string{
			"-y", "-i", inputPath,
			"-c:v", "libx264",
			"-preset", "slow",
			"-crf", "23",
			"-movflags", "+faststart",
			"-progress", "pipe:1",
			outputPath,
		}

	case "discord":
		args = []string{
			"-y", "-i", inputPath,
			"-c:v", "libx264",
			"-preset", "faster",
			"-crf", "32",
			"-vf", "scale=-2:720", // Downscale to 720p max
			"-c:a", "aac",
			"-b:a", "128k",
			"-progress", "pipe:1",
			outputPath,
		}

	case "webOptimized":
		args = []string{
			"-y", "-i", inputPath,
			"-c:v", "libx264",
			"-preset", "fast",
			"-crf", "23",
			"-c:a", "aac",
			"-b:a", "128k",
			"-movflags", "+faststart", // Crucial for web streaming
			"-progress", "pipe:1",
			outputPath,
		}

	default:
		return nil, fmt.Errorf("unknown compression logic: %s", logic)
	}

	return args, nil
}

func (s *CompressService) emitProgress(j *job.Job, onProgress ProgressCallback, force bool) {
	if j.ShouldEmit(force) {
		j.MarkEmitted()
		onProgress(j.Progress, force)
	}
}

func (s *CompressService) finishWithError(j *job.Job, jobManager *job.Manager, err error, onProgress ProgressCallback, onDone DoneCallback) {
	j.MarkError(err)
	s.emitProgress(j, onProgress, true)
	onDone(j.Progress)
	jobManager.RemoveJob(j.ID)
}
