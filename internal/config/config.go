package config

import (
	"embed"
)

const (
	AppTitle     = "Chamelleon - Media Shapeshifter"
	WindowWidth  = 1024
	WindowHeight = 768
	MinWidth     = 1280
	MinHeight    = 960
	MaxWidth     = 1560
	MaxHeight    = 1080
)

// EmbeddedAssets holds all embedded files passed from main package
type EmbeddedAssets struct {
	Frontend embed.FS
	FFmpeg   embed.FS
	Icon     []byte
}

// AppConfig holds application configuration
type AppConfig struct {
	MaxParallelJobs int
	Assets          *EmbeddedAssets
}

// NewAppConfig creates a new app configuration with defaults
func NewAppConfig(assets *EmbeddedAssets) *AppConfig {
	return &AppConfig{
		MaxParallelJobs: 2,
		Assets:          assets,
	}
}
