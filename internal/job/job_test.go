package job

import (
	"errors"
	"sync"
	"testing"
	"time"
)

func TestNewManager(t *testing.T) {
	t.Run("default max parallel", func(t *testing.T) {
		m := NewManager(0)
		if cap(m.semaphore) != 2 {
			t.Errorf("expected default capacity 2, got %d", cap(m.semaphore))
		}
	})

	t.Run("custom max parallel", func(t *testing.T) {
		m := NewManager(5)
		if cap(m.semaphore) != 5 {
			t.Errorf("expected capacity 5, got %d", cap(m.semaphore))
		}
	})
}

func TestCreateAndGetJob(t *testing.T) {
	m := NewManager(2)
	job, ctx := m.CreateJob("job-1", "input.mp4", "output.mp4", 10000)

	if job.ID != "job-1" {
		t.Errorf("expected job ID job-1, got %s", job.ID)
	}
	if job.Progress.Status != "queued" {
		t.Errorf("expected queued status, got %s", job.Progress.Status)
	}
	if job.Cancel == nil {
		t.Error("expected Cancel function to be set")
	}
	if ctx == nil {
		t.Error("expected non-nil context")
	}

	retrieved, ok := m.GetJob("job-1")
	if !ok {
		t.Error("expected to retrieve job")
	}
	if retrieved.ID != "job-1" {
		t.Errorf("expected retrieved job ID job-1, got %s", retrieved.ID)
	}
}

func TestRemoveJob(t *testing.T) {
	m := NewManager(2)
	m.CreateJob("job-1", "in", "out", 100)
	
	m.RemoveJob("job-1")
	_, ok := m.GetJob("job-1")
	if ok {
		t.Error("expected job to be removed")
	}
}

func TestCancelJob(t *testing.T) {
	m := NewManager(2)
	job, _ := m.CreateJob("job-1", "in", "out", 100)

	var cancelled bool
	oldCancel := job.Cancel
	job.Cancel = func() {
		cancelled = true
		oldCancel()
	}

	retrieved, ok := m.CancelJob("job-1")
	if !ok || retrieved.ID != "job-1" {
		t.Error("expected to retrieve and cancel job-1")
	}
	if !cancelled {
		t.Error("expected cancel function to be called")
	}
	
	// Test cancelling non-existent job
	_, ok = m.CancelJob("non-existent")
	if ok {
		t.Error("expected ok=false for non-existent job")
	}
}

func TestSemaphore(t *testing.T) {
	m := NewManager(2)
	
	// Should not block
	m.AcquireSemaphore()
	m.AcquireSemaphore()

	var wg sync.WaitGroup
	wg.Add(1)
	
	acquiredThird := false
	go func() {
		m.AcquireSemaphore()
		acquiredThird = true
		wg.Done()
	}()

	// Give the goroutine time to run and block
	time.Sleep(50 * time.Millisecond)
	if acquiredThird {
		t.Error("expected third acquire to block")
	}

	m.ReleaseSemaphore()
	
	wg.Wait()
	if !acquiredThird {
		t.Error("expected third acquire to succeed after release")
	}
}

func TestUpdateProgress(t *testing.T) {
	m := NewManager(2)
	job, _ := m.CreateJob("job-1", "in", "out", 10000)

	// Simulate some time passed
	job.StartedAt = time.Now().Add(-5 * time.Second)
	
	job.UpdateProgress(5000, "1x")
	
	if job.Progress.OutTimeMS != 5000 {
		t.Errorf("expected outMS 5000, got %d", job.Progress.OutTimeMS)
	}
	if job.Progress.Speed != "1x" {
		t.Errorf("expected speed '1x', got %s", job.Progress.Speed)
	}
	if job.Progress.Percentage != 50.0 {
		t.Errorf("expected percentage 50.0, got %f", job.Progress.Percentage)
	}
	if job.Progress.ETASeconds <= 0 {
		t.Errorf("expected ETA > 0, got %d", job.Progress.ETASeconds)
	}
}

func TestShouldEmit(t *testing.T) {
	job := &Job{LastEmit: time.Now()}

	if job.ShouldEmit(false) {
		t.Error("should not emit immediately without force")
	}
	if !job.ShouldEmit(true) {
		t.Error("should emit when forced")
	}

	job.LastEmit = time.Now().Add(-600 * time.Millisecond)
	if !job.ShouldEmit(false) {
		t.Error("should emit after 500ms")
	}
}

func TestMarkFunctions(t *testing.T) {
	job := &Job{Progress: Progress{DurationMS: 5000}}

	job.MarkRunning()
	if job.Progress.Status != "running" {
		t.Errorf("expected state running, got %s", job.Progress.Status)
	}

	err := errors.New("test error")
	job.MarkError(err)
	if job.Progress.Status != "error" {
		t.Error("expected state error")
	}
	if job.Progress.Error != "test error" {
		t.Error("expected error message 'test error'")
	}

	job.MarkCancelled()
	if job.Progress.Status != "cancelled" {
		t.Error("expected state cancelled")
	}

	job.MarkDone()
	if job.Progress.Status != "done" {
		t.Error("expected state done")
	}
	if job.Progress.Percentage != 100.0 {
		t.Error("expected percentage 100")
	}
	if job.Progress.OutTimeMS != 5000 {
		t.Error("expected outMS to equal durationMS")
	}
}
