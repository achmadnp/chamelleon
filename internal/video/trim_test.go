package video

import (
	"path/filepath"
	"testing"
)

func TestPrepareTrimOutput(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "standard file",
			input:    filepath.Join("dir", "video.mp4"),
			expected: filepath.Join("dir", "video_trimmed.mp4"),
		},
		{
			name:     "no extension",
			input:    filepath.Join("dir", "video"),
			expected: filepath.Join("dir", "video_trimmed"),
		},
		{
			name:     "multiple extensions",
			input:    filepath.Join("dir", "video.tar.gz"),
			expected: filepath.Join("dir", "video.tar_trimmed.gz"),
		},
		{
			name:     "empty path",
			input:    "",
			expected: "._trimmed",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := PrepareTrimOutput(tt.input)
			if result != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, result)
			}
		})
	}
}

func TestPrepareGifOutput(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "standard file",
			input:    filepath.Join("dir", "video.mp4"),
			expected: filepath.Join("dir", "video.gif"),
		},
		{
			name:     "no extension",
			input:    filepath.Join("dir", "video"),
			expected: filepath.Join("dir", "video.gif"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := PrepareGifOutput(tt.input)
			if result != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, result)
			}
		})
	}
}
