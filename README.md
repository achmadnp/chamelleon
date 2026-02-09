# Chamelleon

Chamelleon is a desktop application for video conversion, compression, and image manipulation, built with [Wails](https://wails.io/), utilizing Go, and React.

## Features

### Video Processing
-   **Video Conversion**: Convert videos to various formats.
-   **Video Compression**: Compress video files to reduce size while maintaining quality.
-   **Job Management**: Monitor progress, cancel jobs, and manage parallel processing.

### Image Manipulation
-   **Format Conversion**: Change image formats effortlessly.
-   **Adjustments**: Fine-tune brightness, contrast, gamma, saturation, and hue.
-   **Effects & Filters**: Apply blur, blend modes, and other artistic effects.

## Tech Stack

-   **Backend**: Go (Wails framework)
-   **Frontend**: React, TypeScript, Vite
-   **UI Framework**: TailwindCSS, Shadcn UI
-   **Media Engine**: FFmpeg (Embedded)

## Prerequisites

To build and run this application from source, you need:

-   [Go 1.20+](https://go.dev/dl/)
-   [Node.js 16+](https://nodejs.org/)
-   [Wails CLI](https://wails.io/docs/gettingstarted/installation)

## Development

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/chamelleon.git
    cd chamelleon
    ```

2.  **Install frontend dependencies**:
    ```bash
    cd frontend
    npm install
    ```

3.  **Run in development mode**:
    From the root directory, run:
    ```bash
    wails dev
    ```
    This will start the backend and frontend dev servers. The application window should appear shortly.

## Building

To create a production build:

```bash
wails build
```

This will generate a binary in the `build/bin` directory.

## FFmpeg Integration

Chamelleon relies on FFmpeg for media processing.
-   **Development**: Ensure you have `ffmpeg.exe` in the root directory or available in your system PATH if the app logic supports it (current logic embeds `ffmpeg.exe` from root).
-   **Production**: The `ffmpeg.exe` binary is embedded into the application executable, making it a portable single-file application.

## License

[MIT License](LICENSE)
