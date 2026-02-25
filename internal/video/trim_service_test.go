package video

import (
	"testing"
	"time"

	"chamelleon/internal/job"
)

func TestTrimService_Trim(t *testing.T) {
	ffmpegMgr, jobMgr := setupMockDependencies(t)
	trimService := NewTrimService(ffmpegMgr)

	j, ctx := jobMgr.CreateJob("job-trim", "input.mp4", "output_trimmed.mp4", 1000)

	done := make(chan bool)
	onProgress := func(p job.Progress, force bool) {}
	onDone := func(p job.Progress) {
		done <- true
	}

	go trimService.Trim(ctx, j, jobMgr, "00:00:00.000", "00:00:10.000", onProgress, onDone)

	select {
	case <-done:
		if j.Progress.Status != "done" {
			t.Errorf("expected job done, got err: %s", j.Progress.Error)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("test timeout")
	}
}

func TestTrimService_ToGif(t *testing.T) {
	ffmpegMgr, jobMgr := setupMockDependencies(t)
	trimService := NewTrimService(ffmpegMgr)

	j, ctx := jobMgr.CreateJob("job-gif", "input.mp4", "output.gif", 1000)

	done := make(chan bool)
	onProgress := func(p job.Progress, force bool) {}
	onDone := func(p job.Progress) {
		done <- true
	}

	go trimService.ToGif(ctx, j, jobMgr, "00:00:00.000", "00:00:10.000", 15, 480, onProgress, onDone)

	select {
	case <-done:
		if j.Progress.Status != "done" {
			t.Errorf("expected job done, got err: %s", j.Progress.Error)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("test timeout")
	}
}
