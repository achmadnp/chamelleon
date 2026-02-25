package video

import (
	"testing"
	"time"

	"chamelleon/internal/job"
)

func TestConvertService_Convert(t *testing.T) {
	ffmpegMgr, jobMgr := setupMockDependencies(t)
	convertService := NewConvertService(ffmpegMgr)

	j, ctx := jobMgr.CreateJob("job-convert", "input.mp4", "output_converted.mkv", 1000)

	done := make(chan bool)
	onProgress := func(p job.Progress, force bool) {}
	onDone := func(p job.Progress) {
		done <- true
	}

	go convertService.Convert(ctx, j, jobMgr, onProgress, onDone)

	select {
	case <-done:
		if j.Progress.Status != "done" {
			t.Errorf("expected job done, got %s", j.Progress.Error)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("test timeout")
	}
}
