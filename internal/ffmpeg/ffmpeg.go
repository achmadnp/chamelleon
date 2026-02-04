package ffmpeg

import (
	"embed"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
)

var reDuration = regexp.MustCompile(`Duration:\s+(\d+):(\d+):(\d+\.\d+)`)

// Manager handles FFmpeg binary extraction and execution
type Manager struct {
	ffmpegFS embed.FS
	ffmpegPath string
}

// NewManager creates a new FFmpeg manager
func NewManager(ffmpegFS embed.FS) *Manager {
	return &Manager{
		ffmpegFS: ffmpegFS,
	}
}

// ExtractFFmpeg extracts the embedded FFmpeg binary to a temp file and returns its path
func (m *Manager) ExtractFFmpeg() (string, error) {
	data, err := m.ffmpegFS.ReadFile("ffmpeg.exe")
	if err != nil {
		return "", fmt.Errorf("failed to read embedded ffmpeg: %v", err)
	}

	tmpFile, err := os.CreateTemp("", "ffmpeg-*.exe")
	if err != nil {
		return "", fmt.Errorf("failed to create temporary file: %v", err)
	}
	defer tmpFile.Close()

	if _, err := tmpFile.Write(data); err != nil {
		return "", fmt.Errorf("failed to write ffmpeg binary to temporary file: %v", err)
	}

	if err := tmpFile.Sync(); err != nil {
		return "", fmt.Errorf("failed to sync temporary file: %v", err)
	}

	if runtime.GOOS != "windows" {
		if err := os.Chmod(tmpFile.Name(), 0755); err != nil {
			return "", fmt.Errorf("chmod failed: %w", err)
		}
	}

	if _, err := os.Stat(tmpFile.Name()); err != nil {
		return "", fmt.Errorf("verification failed: %v", err)
	}

	return tmpFile.Name(), nil
}

// ProbeDuration gets video duration in milliseconds using FFmpeg
func ProbeDuration(ffmpegPath, inputPath string) (int64, error) {
	cmd := exec.Command(ffmpegPath, "-i", inputPath)
	out, _ := cmd.CombinedOutput()
	m := reDuration.FindStringSubmatch(string(out))
	if len(m) < 4 {
		return 0, fmt.Errorf("could not parse duration")
	}
	h, _ := strconv.ParseFloat(m[1], 64)
	mmin, _ := strconv.ParseFloat(m[2], 64)
	s, _ := strconv.ParseFloat(m[3], 64)
	return int64((h*3600 + mmin*60 + s) * 1000), nil
}

// Cleanup removes the extracted FFmpeg binary
func Cleanup(path string) {
	if path != "" {
		os.Remove(path)
	}
}
