package video

import (
	"os/exec"
)

// execCommandContext allows us to mock exec.CommandContext in tests
var execCommandContext = exec.CommandContext
