package video

import (
	"testing"
	"time"

	"chamelleon/internal/job"
)

func TestCompressService_Compress(t *testing.T) {
	ffmpegMgr, jobMgr := setupMockDependencies(t)
	compressService := NewCompressService(ffmpegMgr)

	j, ctx := jobMgr.CreateJob("job-compress", "input.mp4", "output_compressed.mp4", 1000)

	done := make(chan bool)
	onProgress := func(p job.Progress, force bool) {}
	onDone := func(p job.Progress) {
		done <- true
	}

	go compressService.Compress(ctx, j, jobMgr, "discord", onProgress, onDone)

	select {
	case <-done:
		if j.Progress.Status != "done" {
			t.Errorf("expected job done, got %s", j.Progress.Error)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("test timeout")
	}
}
