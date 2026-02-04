package image

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"strings"
)

// decodeBase64ImageInternal is the shared implementation for decoding base64 images
func decodeBase64ImageInternal(imageData string, stripDataURL bool) (image.Image, error) {
	// Remove data URL prefix if present and requested
	if stripDataURL || strings.Contains(imageData, ",") {
		if idx := strings.IndexByte(imageData, ','); idx != -1 {
			imageData = imageData[idx+1:]
		}
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
