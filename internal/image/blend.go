package image

import (
	"fmt"
	"image"

	"github.com/anthonynsimon/bild/blend"
)

// BlendService handles image blending
type BlendService struct{}

// NewBlendService creates a new blend service
func NewBlendService() *BlendService {
	return &BlendService{}
}

// Blend applies a blend mode to an image (blends with itself for demo)
func (s *BlendService) Blend(imageData, mode string) (string, error) {
	img, err := decodeBase64ImageRaw(imageData)
	if err != nil {
		return "", fmt.Errorf("failed to decode image: %v", err)
	}

	var blendedImage image.Image
	switch mode {
	case "add":
		blendedImage = blend.Add(img, img)
	case "color-burn":
		blendedImage = blend.ColorBurn(img, img)
	case "color-dodge":
		blendedImage = blend.ColorDodge(img, img)
	case "darken":
		blendedImage = blend.Darken(img, img)
	case "difference":
		blendedImage = blend.Difference(img, img)
	case "exclusion":
		blendedImage = blend.Exclusion(img, img)
	case "lighten":
		blendedImage = blend.Lighten(img, img)
	case "linear-burn":
		blendedImage = blend.LinearBurn(img, img)
	case "linear-light":
		blendedImage = blend.LinearLight(img, img)
	case "multiply":
		blendedImage = blend.Multiply(img, img)
	case "normal":
		blendedImage = blend.Normal(img, img)
	case "opacity":
		blendedImage = blend.Opacity(img, img, 0.5)
	case "overlay":
		blendedImage = blend.Overlay(img, img)
	case "screen":
		blendedImage = blend.Screen(img, img)
	case "soft-light":
		blendedImage = blend.SoftLight(img, img)
	case "substract":
		blendedImage = blend.Subtract(img, img)
	default:
		return "", fmt.Errorf("unsupported blend mode: %s", mode)
	}

	return encodeImageToBase64(blendedImage)
}

// decodeBase64ImageRaw decodes base64 without stripping data URL prefix
func decodeBase64ImageRaw(imageData string) (image.Image, error) {
	return decodeBase64ImageInternal(imageData, false)
}
