package video

import (
	"context"
	"embed"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"testing"

	"chamelleon/internal/ffmpeg"
	"chamelleon/internal/job"
)

//go:embed ffmpeg.exe
var mockFFmpegFS embed.FS

// setupMockDependencies creates a mocked manager and a temp job manager
func setupMockDependencies(t *testing.T) (*ffmpeg.Manager, *job.Manager) {
	ffmpegMgr := ffmpeg.NewManager(mockFFmpegFS)
	jobMgr := job.NewManager(2)
	return ffmpegMgr, jobMgr
}

// mockExecCommandContext intercepts exec.CommandContext calls
func mockExecCommandContext(ctx context.Context, command string, args ...string) *exec.Cmd {
	cs := []string{"-test.run=TestHelperProcess", "--", command}
	cs = append(cs, args...)
	cmd := exec.CommandContext(ctx, os.Args[0], cs...)
	cmd.Env = append(os.Environ(), "GO_WANT_HELPER_PROCESS=1")
	return cmd
}

// TestHelperProcess is not a real test, it's a hook for mockExecCommandContext
func TestHelperProcess(t *testing.T) {
	if os.Getenv("GO_WANT_HELPER_PROCESS") != "1" {
		return
	}

	// Read args passed after "--"
	args := os.Args
	for len(args) > 0 {
		if args[0] == "--" {
			args = args[1:]
			break
		}
		args = args[1:]
	}

	if len(args) == 0 {
		os.Exit(0)
	}

	// Echo command arguments for validation if requested via a mock arg
	cmdStr := strings.Join(args, " ")
	
	// Print a mocked FFmpeg output line to satisfy progress parsers
	fmt.Fprintf(os.Stdout, "progress=end\n")
	
	// In a real test, one might want to write to a file representing "output".
	// We check if the command would write an output file, and if so,
	// maybe touch it to prevent "no such file" errors in services.
	// Output file is usually the last argument in FFmpeg
	if len(args) > 1 && !strings.HasPrefix(args[len(args)-1], "-") {
		outFile := args[len(args)-1]
		if !strings.HasPrefix(outFile, "pipe:") {
			_ = os.WriteFile(outFile, []byte(cmdStr), 0644)
		}
	}

	os.Exit(0)
}

func init() {
	execCommandContext = mockExecCommandContext
}
