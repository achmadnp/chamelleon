package image

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"strings"

	"github.com/anthonynsimon/bild/transform"
)

// CompressService handles image compression
type CompressService struct{}

// NewCompressService creates a new compress service
func NewCompressService() *CompressService {
	return &CompressService{}
}

// CompressParams holds parameters for image compression
type CompressParams struct {
	Quality    int  `json:"quality"`    // 1-100, applicable to JPEG
	MaxWidth   int  `json:"maxWidth"`   // 0 = no resize
	MaxHeight  int  `json:"maxHeight"`  // 0 = no resize
	Grayscale  bool `json:"grayscale"`  // convert to grayscale for additional compression
}

// CompressResult holds the result of image compression
type CompressResult struct {
	Data         string `json:"data"`         // base64 data URL
	OriginalSize int    `json:"originalSize"` // original file size in bytes
	NewSize      int    `json:"newSize"`      // compressed file size in bytes
	Format       string `json:"format"`       // output format used
}

// Compress compresses an image with the given parameters.
// It encodes the result as JPEG (lossy) with the given quality to achieve compression.
// If quality is 0, it defaults to 75.
func (s *CompressService) Compress(imageData string, params CompressParams) (*CompressResult, error) {
	// Calculate original data size
	rawData, err := extractBase64Data(imageData)
	if err != nil {
		return nil, fmt.Errorf("failed to extract base64 data: %v", err)
	}
	originalSize := len(rawData)

	// Decode the source image
	img, err := decodeBase64ImageInternal(imageData, true)
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %v", err)
	}

	// Resize if dimensions are specified
	if params.MaxWidth > 0 || params.MaxHeight > 0 {
		img = resizeWithAspectRatio(img, params.MaxWidth, params.MaxHeight)
	}

	// Set default quality
	quality := params.Quality
	if quality <= 0 {
		quality = 75
	}
	if quality > 100 {
		quality = 100
	}

	// Encode as JPEG for lossy compression
	var buf bytes.Buffer
	var mimeType string

	if quality >= 90 {
		// For high quality, use PNG (lossless) if quality is near max
		err = png.Encode(&buf, img)
		mimeType = "image/png"
	} else {
		// Use JPEG for lossy compression
		rgbaImg := imageToRGBA(img)
		err = jpeg.Encode(&buf, rgbaImg, &jpeg.Options{Quality: quality})
		mimeType = "image/jpeg"
	}

	if err != nil {
		return nil, fmt.Errorf("failed to encode compressed image: %v", err)
	}

	newSize := buf.Len()
	encoded := base64.StdEncoding.EncodeToString(buf.Bytes())
	dataURL := fmt.Sprintf("data:%s;base64,%s", mimeType, encoded)

	format := "jpeg"
	if strings.Contains(mimeType, "png") {
		format = "png"
	}

	return &CompressResult{
		Data:         dataURL,
		OriginalSize: originalSize,
		NewSize:      newSize,
		Format:       format,
	}, nil
}

// resizeWithAspectRatio resizes an image to fit within maxW x maxH maintaining aspect ratio
func resizeWithAspectRatio(img image.Image, maxW, maxH int) image.Image {
	bounds := img.Bounds()
	srcW := bounds.Dx()
	srcH := bounds.Dy()

	if maxW <= 0 {
		maxW = srcW
	}
	if maxH <= 0 {
		maxH = srcH
	}

	// If image is already smaller, don't upscale
	if srcW <= maxW && srcH <= maxH {
		return img
	}

	// Calculate new size maintaining aspect ratio
	scaleW := float64(maxW) / float64(srcW)
	scaleH := float64(maxH) / float64(srcH)
	scale := scaleW
	if scaleH < scaleW {
		scale = scaleH
	}

	newW := int(float64(srcW) * scale)
	newH := int(float64(srcH) * scale)

	if newW < 1 {
		newW = 1
	}
	if newH < 1 {
		newH = 1
	}

	return transform.Resize(img, newW, newH, transform.Lanczos)
}
