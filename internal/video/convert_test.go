package video

import (
	"path/filepath"
	"testing"
)

func TestPrepareConvertOutput(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		format   string
		expected string
	}{
		{
			name:     "standard file",
			input:    filepath.Join("dir", "video.mp4"),
			format:   "mkv",
			expected: filepath.Join("dir", "video.mkv"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := PrepareConvertOutput(tt.input, tt.format)
			if result != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, result)
			}
		})
	}
}
