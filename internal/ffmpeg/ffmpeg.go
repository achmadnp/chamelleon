package ffmpeg

import (
	"embed"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
	"strings"
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

var reVideoCodec = regexp.MustCompile(`Stream #\d:\d(?:\[.*?\])?.*?: Video: ([a-zA-Z0-9_-]+)`)
var reAudioCodec = regexp.MustCompile(`Stream #\d:\d(?:\[.*?\])?.*?: Audio: ([a-zA-Z0-9_-]+)`)

// ProbeCodecs extracts the video and audio codecs of a media file.
func ProbeCodecs(ffmpegPath, inputPath string) (videoCodec, audioCodec string, err error) {
	cmd := exec.Command(ffmpegPath, "-i", inputPath)
	out, _ := cmd.CombinedOutput()
	outStr := string(out)

	vMatch := reVideoCodec.FindStringSubmatch(outStr)
	if len(vMatch) > 1 {
		videoCodec = vMatch[1]
	}

	aMatch := reAudioCodec.FindStringSubmatch(outStr)
	if len(aMatch) > 1 {
		audioCodec = aMatch[1]
	}

	return videoCodec, audioCodec, nil
}

// GetAvailableHWAccels runs ffmpeg -hwaccels and returns a list of supported accels.
func GetAvailableHWAccels(ffmpegPath string) ([]string, error) {
	cmd := exec.Command(ffmpegPath, "-hwaccels")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("failed to list hwaccels: %w", err)
	}

	lines := strings.Split(string(out), "\n")
	var accels []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "Hardware acceleration methods:") || strings.HasPrefix(line, "ffmpeg version") {
			continue
		}
		if !strings.Contains(line, " ") { // Ensure it's just the hwaccel name
			accels = append(accels, line)
		}
	}
	return accels, nil
}

// Cleanup removes the extracted FFmpeg binary
func Cleanup(path string) {
	if path != "" {
		os.Remove(path)
	}
}
