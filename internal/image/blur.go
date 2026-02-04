package image

import (
	"fmt"
	"image"

	"github.com/anthonynsimon/bild/blur"
)

// BlurService handles image blurring
type BlurService struct{}

// NewBlurService creates a new blur service
func NewBlurService() *BlurService {
	return &BlurService{}
}

// Blur applies a blur effect to an image
func (s *BlurService) Blur(imageData, mode string) (string, error) {
	img, err := decodeBase64ImageInternal(imageData, false)
	if err != nil {
		return "", fmt.Errorf("failed to decode image: %v", err)
	}

	var blurredImage image.Image
	switch mode {
	case "gaussian":
		blurredImage = blur.Gaussian(img, 5.0)
	case "box":
		blurredImage = blur.Box(img, 5.0)
	default:
		return "", fmt.Errorf("unsupported blur mode: %s", mode)
	}

	return encodeImageToBase64(blurredImage)
}
