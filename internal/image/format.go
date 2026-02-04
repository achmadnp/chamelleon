package image

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/anthonynsimon/bild/imgio"
)

// FormatService handles image format conversion
type FormatService struct{}

// NewFormatService creates a new format service
func NewFormatService() *FormatService {
	return &FormatService{}
}

// ChangeFormat converts an image to a different format
func (s *FormatService) ChangeFormat(filename, imageData, format string) (string, error) {
	var encoder imgio.Encoder
	switch format {
	case "jpeg":
		encoder = imgio.JPEGEncoder(100)
	case "png":
		encoder = imgio.PNGEncoder()
	case "bmp":
		encoder = imgio.BMPEncoder()
	default:
		return "", fmt.Errorf("unsupported format: %s", format)
	}

	img, err := decodeBase64ImageInternal(imageData, false)
	if err != nil {
		return "", fmt.Errorf("failed to decode image: %v", err)
	}

	outputPath := fmt.Sprintf("filename_converted.%s", format)
	if err := imgio.Save(outputPath, img, encoder); err != nil {
		return "", fmt.Errorf("failed to save image: %v", err)
	}

	return outputPath, nil
}

// Save saves a processed image to a file
func (s *FormatService) Save(filename, imageData string) (string, error) {
	img, err := decodeBase64ImageInternal(imageData, false)
	if err != nil {
		return "", fmt.Errorf("failed to decode image: %v", err)
	}

	outputPath := filepath.Join(os.TempDir(), filename)
	if err := imgio.Save(outputPath, img, imgio.PNGEncoder()); err != nil {
		return "", fmt.Errorf("failed to save processed image: %v", err)
	}

	return outputPath, nil
}
