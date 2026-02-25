package video

import (
	"testing"
	"time"

	"chamelleon/internal/job"
)

func TestAudioService_ExtractAudio(t *testing.T) {
	ffmpegMgr, jobMgr := setupMockDependencies(t)
	audioService := NewAudioService(ffmpegMgr)

	j, ctx := jobMgr.CreateJob("job-audio", "video.mp4", "output.mp3", 1000)

	done := make(chan bool)
	onProgress := func(p job.Progress, force bool) {}
	onDone := func(p job.Progress) {
		done <- true
	}

	go audioService.ExtractAudio(ctx, j, jobMgr, "mp3", onProgress, onDone)

	select {
	case <-done:
		if j.Progress.Status != "done" {
			t.Errorf("expected job done, got err: %s", j.Progress.Error)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("test timeout")
	}
}

func TestAudioService_MuteVideo(t *testing.T) {
	ffmpegMgr, jobMgr := setupMockDependencies(t)
	audioService := NewAudioService(ffmpegMgr)

	j, ctx := jobMgr.CreateJob("job-mute", "video.mp4", "output_muted.mp4", 1000)

	done := make(chan bool)
	onProgress := func(p job.Progress, force bool) {}
	onDone := func(p job.Progress) {
		done <- true
	}

	go audioService.MuteVideo(ctx, j, jobMgr, onProgress, onDone)

	select {
	case <-done:
		if j.Progress.Status != "done" {
			t.Errorf("expected job done, got err: %s", j.Progress.Error)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("test timeout")
	}
}
