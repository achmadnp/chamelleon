package video

import (
	"path/filepath"
	"reflect"
	"testing"
)

func TestPrepareCompressOutput(t *testing.T) {
	input := filepath.Join("dir", "video.mkv")
	expected := filepath.Join("dir", "video_compressed.mp4")

	result := PrepareCompressOutput(input)
	if result != expected {
		t.Errorf("expected %q, got %q", expected, result)
	}
}

func TestBuildCompressCommand(t *testing.T) {
	input := "in.mp4"
	output := "out.mp4"

	tests := []struct {
		name          string
		logic         string
		expectedArgs  []string
		expectedError bool
	}{
		{
			name:  "discord preset",
			logic: "discord",
			expectedArgs: []string{
				"-y", "-i", input,
				"-c:v", "libx264",
				"-preset", "faster",
				"-crf", "32",
				"-vf", "scale=-2:720",
				"-c:a", "aac",
				"-b:a", "128k",
				"-progress", "pipe:1",
				output,
			},
			expectedError: false,
		},
		{
			name:  "webOptimized preset",
			logic: "webOptimized",
			expectedArgs: []string{
				"-y", "-i", input,
				"-c:v", "libx264",
				"-preset", "fast",
				"-crf", "23",
				"-c:a", "aac",
				"-b:a", "128k",
				"-movflags", "+faststart",
				"-progress", "pipe:1",
				output,
			},
			expectedError: false,
		},
		{
			name:          "unknown logic",
			logic:         "nonexistent",
			expectedArgs:  nil,
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			args, err := BuildCompressCommand(input, output, tt.logic)

			if tt.expectedError && err == nil {
				t.Error("expected error, got nil")
			}
			if !tt.expectedError && err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if !reflect.DeepEqual(args, tt.expectedArgs) {
				t.Errorf("expected args %v, got %v", tt.expectedArgs, args)
			}
		})
	}
}
