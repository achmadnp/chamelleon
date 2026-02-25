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
	"syscall"
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

// Compatibility definitions
var compatibleVideo = map[string]map[string]bool{
	"mp4":  {"h264": true, "hevc": true, "av1": true, "mpeg4": true},
	"webm": {"vp8": true, "vp9": true, "av1": true},
	"mkv":  {"h264": true, "hevc": true, "vp8": true, "vp9": true, "av1": true, "mpeg4": true},
	"mov":  {"h264": true, "hevc": true, "prores": true},
	"ts":   {"h264": true, "hevc": true, "mpeg2video": true},
}

var compatibleAudio = map[string]map[string]bool{
	"mp4":  {"aac": true, "ac3": true, "mp3": true},
	"webm": {"opus": true, "vorbis": true},
	"mkv":  {"aac": true, "ac3": true, "mp3": true, "opus": true, "vorbis": true, "flac": true},
	"mov":  {"aac": true, "alac": true, "pcm_s16le": true},
	"ts":   {"aac": true, "ac3": true, "mp3": true, "mp2": true},
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

	ffmpegPath, err := s.ffmpegManager.GetFFmpegPath()
	if err != nil {
		s.finishWithError(j, jobManager, fmt.Errorf("failed to extract ffmpeg: %v", err), onProgress, onDone)
		return
	}

	j.MarkRunning()
	s.emitProgress(j, onProgress, true)

	// 1. Probe source codecs
	vCodec, aCodec, probeErr := ffmpeg.ProbeCodecs(ffmpegPath, j.Progress.Input)
	if probeErr != nil {
		fmt.Printf("Warning: failed to probe codecs: %v\n", probeErr)
	}
	targetExt := strings.TrimPrefix(filepath.Ext(j.Progress.Output), ".")

	// 2. Decide Fast Path vs Slow Path
	canCopyVideo := false
	if vMap, ok := compatibleVideo[targetExt]; ok && vMap[vCodec] {
		canCopyVideo = true
	}
	canCopyAudio := false
	if aMap, ok := compatibleAudio[targetExt]; ok && aMap[aCodec] {
		canCopyAudio = true
	}

	args := []string{"-y"}

	if canCopyVideo && canCopyAudio {
		// FAST PATH: Stream Copy
		fmt.Printf("Compatible codecs found (v:%s, a:%s) -> using -c copy\n", vCodec, aCodec)
		args = append(args, "-i", j.Progress.Input, "-c", "copy")
	} else {
		// SLOW PATH: Re-encode
		fmt.Printf("Incompatible codecs (v:%s, a:%s) for target %s -> setting up re-encoder\n", vCodec, aCodec, targetExt)
		
		// Determine best video encoder
		accels, _ := ffmpeg.GetAvailableHWAccels(ffmpegPath)
		accelStr := strings.Join(accels, " ")
		
		vEncoder := "libx264" // fallback
		if targetExt == "webm" {
			vEncoder = "libvpx-vp9"
		} else {
			if strings.Contains(accelStr, "nvenc") {
				vEncoder = "h264_nvenc"
				args = append(args, "-hwaccel", "cuda")
			} else if strings.Contains(accelStr, "videotoolbox") {
				vEncoder = "h264_videotoolbox"
				args = append(args, "-hwaccel", "videotoolbox")
			} else if strings.Contains(accelStr, "qsv") {
				vEncoder = "h264_qsv"
				args = append(args, "-hwaccel", "qsv")
			} else if strings.Contains(accelStr, "amf") {
				vEncoder = "h264_amf"
			}
		}

		args = append(args, "-i", j.Progress.Input)
		
		if targetExt == "webm" {
			args = append(args, "-c:v", "libvpx-vp9", "-row-mt", "1", "-b:v", "0", "-crf", "30")
			args = append(args, "-c:a", "libopus", "-b:a", "128k")
		} else {
			args = append(args, "-c:v", vEncoder)
			if vEncoder == "libx264" {
				args = append(args, "-preset", "veryfast", "-crf", "23", "-threads", "0")
			} else if vEncoder == "h264_nvenc" {
				args = append(args, "-preset", "p4", "-cq", "25", "-spatial-aq", "1")
			}
			args = append(args, "-c:a", "aac", "-b:a", "192k")
		}
	}

	args = append(args, "-progress", "pipe:1", "-nostats", j.Progress.Output)

	cmd := exec.CommandContext(ctx, ffmpegPath, args...)

	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow: true,
	}

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
