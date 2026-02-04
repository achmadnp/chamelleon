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

// ProgressCallback is called to emit progress updates
type ProgressCallback func(progress job.Progress, force bool)

// DoneCallback is called when the job completes
type DoneCallback func(progress job.Progress)

// ConvertService handles video format conversion
type ConvertService struct {
	ffmpegManager *ffmpeg.Manager
}

// NewConvertService creates a new convert service
func NewConvertService(ffmpegManager *ffmpeg.Manager) *ConvertService {
	return &ConvertService{
		ffmpegManager: ffmpegManager,
	}
}

// Convert converts a video to a different format
func (s *ConvertService) Convert(
	ctx context.Context,
	j *job.Job,
	jobManager *job.Manager,
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

	args := []string{
		"-y", "-i", j.Progress.Input,
		"-map", "0:v?", "-map", "0:a?",
		"-c", "copy",
		"-progress", "pipe:1",
		"-nostats",
		j.Progress.Output,
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
			s.finishWithError(j, jobManager, fmt.Errorf("job cancelled"), onProgress, onDone)
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

// PrepareOutput generates the output path for conversion
func PrepareConvertOutput(inputPath, targetFormat string) string {
	dirPath := filepath.Dir(inputPath)
	baseName := strings.TrimSuffix(filepath.Base(inputPath), filepath.Ext(inputPath))
	return filepath.Join(dirPath, baseName+"."+targetFormat)
}

func (s *ConvertService) emitProgress(j *job.Job, onProgress ProgressCallback, force bool) {
	if j.ShouldEmit(force) {
		j.MarkEmitted()
		onProgress(j.Progress, force)
	}
}

func (s *ConvertService) finishWithError(j *job.Job, jobManager *job.Manager, err error, onProgress ProgressCallback, onDone DoneCallback) {
	j.MarkError(err)
	s.emitProgress(j, onProgress, true)
	onDone(j.Progress)
	jobManager.RemoveJob(j.ID)
}
