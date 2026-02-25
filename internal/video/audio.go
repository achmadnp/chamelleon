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

// AudioService handles audio extraction and muting from videos
type AudioService struct {
	ffmpegManager *ffmpeg.Manager
}

// NewAudioService creates a new audio service
func NewAudioService(ffmpegManager *ffmpeg.Manager) *AudioService {
	return &AudioService{
		ffmpegManager: ffmpegManager,
	}
}

// PrepareAudioOutput generates the unique output path for audio files
func PrepareAudioOutput(inputPath, suffix string, ext string) string {
	dirPath := filepath.Dir(inputPath)
	baseName := strings.TrimSuffix(filepath.Base(inputPath), filepath.Ext(inputPath))
	return filepath.Join(dirPath, fmt.Sprintf("%s_%s.%s", baseName, suffix, ext))
}

// Process runs the FFmpeg command dynamically based on args
func (s *AudioService) Process(
	ctx context.Context,
	j *job.Job,
	jobManager *job.Manager,
	args []string,
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

// ExtractAudio extracts the audio track from a video and saves it as mp3 or wav
func (s *AudioService) ExtractAudio(
	ctx context.Context, j *job.Job, jobManager *job.Manager, format string, onProgress ProgressCallback, onDone DoneCallback,
) {
	var args []string
	if format == "wav" {
		args = []string{"-y", "-i", j.Progress.Input, "-vn", "-c:a", "pcm_s16le", "-progress", "pipe:1", "-nostats", j.Progress.Output}
	} else { // default mp3
		args = []string{"-y", "-i", j.Progress.Input, "-vn", "-c:a", "libmp3lame", "-q:a", "2", "-progress", "pipe:1", "-nostats", j.Progress.Output}
	}
	s.Process(ctx, j, jobManager, args, onProgress, onDone)
}

// MuteVideo removes the audio track from a video, preserving the video codec flawlessly
func (s *AudioService) MuteVideo(
	ctx context.Context, j *job.Job, jobManager *job.Manager, onProgress ProgressCallback, onDone DoneCallback,
) {
	// -an = NO AUDIO, -c:v copy = stream copy video instantly
	args := []string{"-y", "-i", j.Progress.Input, "-c:v", "copy", "-an", "-progress", "pipe:1", "-nostats", j.Progress.Output}
	s.Process(ctx, j, jobManager, args, onProgress, onDone)
}

func (s *AudioService) emitProgress(j *job.Job, onProgress ProgressCallback, force bool) {
	if j.ShouldEmit(force) {
		j.MarkEmitted()
		onProgress(j.Progress, force)
	}
}

func (s *AudioService) finishWithError(j *job.Job, jobManager *job.Manager, err error, onProgress ProgressCallback, onDone DoneCallback) {
	j.MarkError(err)
	s.emitProgress(j, onProgress, true)
	onDone(j.Progress)
	jobManager.RemoveJob(j.ID)
}
