package image

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/png"
	"strings"

	"github.com/anthonynsimon/bild/adjust"
)

// AdjustService handles image adjustments
type AdjustService struct{}

// NewAdjustService creates a new adjust service
func NewAdjustService() *AdjustService {
	return &AdjustService{}
}

// AdjustParams holds parameters for image adjustment
type AdjustParams struct {
	Brightness float64
	Contrast   float64
	Gamma      float64
	Saturation float64
	Hue        int
}

// Adjust applies brightness, contrast, gamma, saturation, and hue adjustments to an image
func (s *AdjustService) Adjust(imageData string, params AdjustParams) (string, error) {
	img, err := decodeBase64Image(imageData)
	if err != nil {
		return "", fmt.Errorf("failed to decode image: %v", err)
	}

	result := adjust.Brightness(img, params.Brightness)
	result = adjust.Contrast(result, params.Contrast)
	result = adjust.Gamma(result, params.Gamma)
	result = adjust.Hue(result, params.Hue)
	result = adjust.Saturation(result, params.Saturation)

	return encodeImageToBase64(result)
}

// decodeBase64Image decodes a base64 encoded image (with or without data URL prefix)
func decodeBase64Image(imageData string) (image.Image, error) {
	// Remove data URL prefix if present
	if idx := strings.IndexByte(imageData, ','); idx != -1 {
		imageData = imageData[idx+1:]
	}

	data, err := base64.StdEncoding.DecodeString(imageData)
	if err != nil {
		return nil, fmt.Errorf("failed to decode base64 image data: %v", err)
	}

	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %v", err)
	}

	return img, nil
}

// encodeImageToBase64 encodes an image to base64 PNG
func encodeImageToBase64(img image.Image) (string, error) {
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return "", fmt.Errorf("failed to encode image: %v", err)
	}
	return base64.StdEncoding.EncodeToString(buf.Bytes()), nil
}
