package video

import (
	"path/filepath"
	"testing"
)

func TestPrepareAudioOutput(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		suffix   string
		ext      string
		expected string
	}{
		{
			name:     "standard file to mp3",
			input:    filepath.Join("dir", "video.mp4"),
			suffix:   "audio",
			ext:      "mp3",
			expected: filepath.Join("dir", "video_audio.mp3"),
		},
		{
			name:     "no extension to wav",
			input:    filepath.Join("dir", "video"),
			suffix:   "extracted",
			ext:      "wav",
			expected: filepath.Join("dir", "video_extracted.wav"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := PrepareAudioOutput(tt.input, tt.suffix, tt.ext)
			if result != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, result)
			}
		})
	}
}
