package job

import (
	"context"
	"sync"
	"time"
)

// Progress represents the current state of a job
type Progress struct {
	ID         string  `json:"id"`
	Input      string  `json:"input"`
	Output     string  `json:"output"`
	Percentage float64 `json:"percentage"`
	OutTimeMS  int64   `json:"out_time_ms"`
	DurationMS int64   `json:"duration_ms"`
	Speed      string  `json:"speed"`
	ETASeconds int64   `json:"eta_seconds"`
	Status     string  `json:"status"`
	Error      string  `json:"error,omitempty"`
}

// Job represents an active processing job
type Job struct {
	ID        string
	Cancel    context.CancelFunc
	Progress  Progress
	StartedAt time.Time
	LastEmit  time.Time
}

// Manager handles job tracking and concurrency control
type Manager struct {
	mu        sync.Mutex
	jobs      map[string]*Job
	semaphore chan struct{}
}

// NewManager creates a new job manager with the specified max parallel jobs
func NewManager(maxParallel int) *Manager {
	if maxParallel <= 0 {
		maxParallel = 2
	}
	return &Manager{
		jobs:      make(map[string]*Job),
		semaphore: make(chan struct{}, maxParallel),
	}
}

// CreateJob creates and registers a new job
func (m *Manager) CreateJob(id, input, output string, durationMS int64) (*Job, context.Context) {
	ctx, cancel := context.WithCancel(context.Background())
	job := &Job{
		ID:     id,
		Cancel: cancel,
		Progress: Progress{
			ID:         id,
			Input:      input,
			Output:     output,
			Status:     "queued",
			DurationMS: durationMS,
		},
		StartedAt: time.Now(),
		LastEmit:  time.Now(),
	}

	m.mu.Lock()
	m.jobs[id] = job
	m.mu.Unlock()

	return job, ctx
}

// GetJob retrieves a job by ID
func (m *Manager) GetJob(id string) (*Job, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	job, ok := m.jobs[id]
	return job, ok
}

// RemoveJob removes a job from tracking
func (m *Manager) RemoveJob(id string) {
	m.mu.Lock()
	delete(m.jobs, id)
	m.mu.Unlock()
}

// CancelJob cancels a job if it exists
func (m *Manager) CancelJob(id string) (*Job, bool) {
	m.mu.Lock()
	job, ok := m.jobs[id]
	m.mu.Unlock()
	if ok && job.Cancel != nil {
		job.Cancel()
	}
	return job, ok
}

// AcquireSemaphore blocks until a slot is available
func (m *Manager) AcquireSemaphore() {
	m.semaphore <- struct{}{}
}

// ReleaseSemaphore releases a slot
func (m *Manager) ReleaseSemaphore() {
	<-m.semaphore
}

// UpdateProgress updates job progress with ETA calculation
func (j *Job) UpdateProgress(outMS int64, speed string) {
	j.Progress.OutTimeMS = outMS
	j.Progress.Speed = speed
	if j.Progress.DurationMS > 0 {
		j.Progress.Percentage = (float64(outMS) / float64(j.Progress.DurationMS)) * 100.0

		eta := int64(0)
		if j.Progress.Percentage > 0 && j.Progress.Percentage < 100 {
			elapsed := time.Since(j.StartedAt).Seconds()
			total := elapsed / (j.Progress.Percentage / 100.0)
			eta = int64(total - elapsed)
		}
		j.Progress.ETASeconds = eta
	}
}

// ShouldEmit checks if enough time has passed for throttled emission
func (j *Job) ShouldEmit(force bool) bool {
	if force {
		return true
	}
	return time.Since(j.LastEmit) >= 500*time.Millisecond
}

// MarkEmitted updates the last emit time
func (j *Job) MarkEmitted() {
	j.LastEmit = time.Now()
}

// MarkDone marks the job as complete
func (j *Job) MarkDone() {
	j.Progress.OutTimeMS = j.Progress.DurationMS
	j.Progress.Percentage = 100.0
	j.Progress.Status = "done"
	j.Progress.ETASeconds = 0
}

// MarkError marks the job as failed with an error
func (j *Job) MarkError(err error) {
	j.Progress.Status = "error"
	j.Progress.Error = err.Error()
}

// MarkRunning marks the job as running
func (j *Job) MarkRunning() {
	j.Progress.Status = "running"
}

// MarkCancelled marks the job as cancelled
func (j *Job) MarkCancelled() {
	j.Progress.Status = "cancelled"
}
