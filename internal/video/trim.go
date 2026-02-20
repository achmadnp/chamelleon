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

// TrimService handles video trimming and GIF conversion via FFmpeg.
type TrimService struct {
	ffmpegManager *ffmpeg.Manager
}

// NewTrimService creates a new TrimService.
func NewTrimService(ffmpegManager *ffmpeg.Manager) *TrimService {
	return &TrimService{ffmpegManager: ffmpegManager}
}

// Trim cuts the video from startTime to endTime (HH:MM:SS.ms format)
// and writes the result to the pre-configured output path on the job.
func (s *TrimService) Trim(
	ctx context.Context,
	j *job.Job,
	jobManager *job.Manager,
	startTime string,
	endTime string,
	onProgress ProgressCallback,
	onDone DoneCallback,
) {
	jobManager.AcquireSemaphore()
	defer jobManager.ReleaseSemaphore()

	ffmpegPath, err := s.ffmpegManager.ExtractFFmpeg()
	if err != nil {
		s.fail(j, jobManager, fmt.Errorf("extract ffmpeg: %w", err), onProgress, onDone)
		return
	}
	defer os.Remove(ffmpegPath)

	j.MarkRunning()
	s.emit(j, onProgress, true)

	args := []string{
		"-y",
		"-ss", startTime,
		"-to", endTime,
		"-i", j.Progress.Input,
		"-map", "0:v?", "-map", "0:a?",
		"-c", "copy",
		"-avoid_negative_ts", "make_zero",
		"-progress", "pipe:1",
		"-nostats",
		j.Progress.Output,
	}

	s.runFFmpeg(ctx, ffmpegPath, args, j, jobManager, onProgress, onDone)
}

// ToGif converts a video (or a segment of it) to an animated GIF.
// startTime/endTime follow HH:MM:SS.ms format. fps and width control quality.
func (s *TrimService) ToGif(
	ctx context.Context,
	j *job.Job,
	jobManager *job.Manager,
	startTime string,
	endTime string,
	fps int,
	width int,
	onProgress ProgressCallback,
	onDone DoneCallback,
) {
	jobManager.AcquireSemaphore()
	defer jobManager.ReleaseSemaphore()

	ffmpegPath, err := s.ffmpegManager.ExtractFFmpeg()
	if err != nil {
		s.fail(j, jobManager, fmt.Errorf("extract ffmpeg: %w", err), onProgress, onDone)
		return
	}
	defer os.Remove(ffmpegPath)

	j.MarkRunning()
	s.emit(j, onProgress, true)

	if fps <= 0 {
		fps = 15
	}
	if width <= 0 {
		width = 480
	}

	// Two-pass palettegen approach for high-quality GIFs
	vfScale := fmt.Sprintf("fps=%d,scale=%d:-1:flags=lanczos", fps, width)
	vfFull := fmt.Sprintf("%s,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=bayer", vfScale)

	args := []string{
		"-y",
		"-ss", startTime,
		"-to", endTime,
		"-i", j.Progress.Input,
		"-vf", vfFull,
		"-loop", "0",
		"-progress", "pipe:1",
		"-nostats",
		j.Progress.Output,
	}

	s.runFFmpeg(ctx, ffmpegPath, args, j, jobManager, onProgress, onDone)
}

// runFFmpeg is a shared helper that executes an FFmpeg command, parses its
// progress output, and drives the job lifecycle through to completion.
func (s *TrimService) runFFmpeg(
	ctx context.Context,
	ffmpegPath string,
	args []string,
	j *job.Job,
	jobManager *job.Manager,
	onProgress ProgressCallback,
	onDone DoneCallback,
) {
	cmd := exec.CommandContext(ctx, ffmpegPath, args...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		s.fail(j, jobManager, fmt.Errorf("stdout pipe: %w", err), onProgress, onDone)
		return
	}
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		s.fail(j, jobManager, fmt.Errorf("start ffmpeg: %w", err), onProgress, onDone)
		return
	}

	scanner := bufio.NewScanner(stdout)
	scanner.Buffer(make([]byte, 0, 64*1024), 10*1024*1024)

	var outMS int64
	var speed string
	progressDone := false

	go func() {
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			switch {
			case strings.HasPrefix(line, "out_time_ms="):
				if v, e := strconv.ParseInt(strings.TrimPrefix(line, "out_time_ms="), 10, 64); e == nil {
					outMS = v / 1000
				}
			case strings.HasPrefix(line, "speed="):
				speed = strings.TrimPrefix(line, "speed=")
			case line == "progress=end":
				progressDone = true
			}
		}
	}()

	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	emitNow := func(force bool) {
		j.UpdateProgress(outMS, speed)
		s.emit(j, onProgress, force)
	}

loop:
	for {
		select {
		case <-ctx.Done():
			_ = cmd.Process.Kill()
			s.fail(j, jobManager, fmt.Errorf("cancelled"), onProgress, onDone)
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
		s.fail(j, jobManager, fmt.Errorf("ffmpeg failed: %w", err), onProgress, onDone)
		return
	}

	j.MarkDone()
	s.emit(j, onProgress, true)
	onDone(j.Progress)
	jobManager.RemoveJob(j.ID)
}

// --- output path helpers ---

// PrepareTrimOutput generates "<basename>_trimmed.<ext>" in the same directory.
func PrepareTrimOutput(inputPath string) string {
	dir := filepath.Dir(inputPath)
	ext := filepath.Ext(inputPath)
	base := strings.TrimSuffix(filepath.Base(inputPath), ext)
	return filepath.Join(dir, base+"_trimmed"+ext)
}

// PrepareGifOutput generates "<basename>.gif" in the same directory.
func PrepareGifOutput(inputPath string) string {
	dir := filepath.Dir(inputPath)
	base := strings.TrimSuffix(filepath.Base(inputPath), filepath.Ext(inputPath))
	return filepath.Join(dir, base+".gif")
}

// --- internal helpers ---

func (s *TrimService) emit(j *job.Job, cb ProgressCallback, force bool) {
	if j.ShouldEmit(force) {
		j.MarkEmitted()
		cb(j.Progress, force)
	}
}

func (s *TrimService) fail(j *job.Job, mgr *job.Manager, err error, onProgress ProgressCallback, onDone DoneCallback) {
	j.MarkError(err)
	s.emit(j, onProgress, true)
	onDone(j.Progress)
	mgr.RemoveJob(j.ID)
}
