package image

import (
	"fmt"
	"image"

	"github.com/anthonynsimon/bild/effect"
)

// EffectService handles image effects
type EffectService struct{}

// NewEffectService creates a new effect service
func NewEffectService() *EffectService {
	return &EffectService{}
}

// Apply applies an effect to an image
func (s *EffectService) Apply(imageData, effectMode string) (string, error) {
	img, err := decodeBase64ImageInternal(imageData, false)
	if err != nil {
		return "", fmt.Errorf("failed to decode image: %v", err)
	}

	var processedImage image.Image
	switch effectMode {
	case "dilate":
		processedImage = effect.Dilate(img, 3)
	case "edge-detection":
		processedImage = effect.EdgeDetection(img, 1.0)
	case "emboss":
		processedImage = effect.Emboss(img)
	case "erode":
		processedImage = effect.Erode(img, 3)
	case "invert":
		processedImage = effect.Invert(img)
	case "median":
		processedImage = effect.Median(img, 3)
	case "sepia":
		processedImage = effect.Sepia(img)
	case "sharpen":
		processedImage = effect.Sharpen(img)
	case "sobel":
		processedImage = effect.Sobel(img)
	case "unsharp-mask":
		processedImage = effect.UnsharpMask(img, 1.0, 1.0)
	default:
		return "", fmt.Errorf("unsupported effect: %s", effectMode)
	}

	return encodeImageToBase64(processedImage)
}
