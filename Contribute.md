# Contributing to Chamelleon

First off, thank you for considering contributing to Chamelleon!

It's people like you that make Chamelleon such a great tool. We welcome contributions from everyone, whether it's reporting a bug, suggesting a new feature, or submitting a pull request.

## How Can I Contribute?

### Reporting Bugs
If you find a bug, please open an issue in the repository. Provide as much information as possible, including:
- Your operating system (Windows, macOS, Linux).
- The version of Chamelleon you are using.
- Steps to reproduce the bug.
- Expected behavior vs. actual behavior.
- Any relevant logs or screenshots.

### Suggesting Enhancements
Have an idea for a new feature or improvement? We'd love to hear it! Open an issue and describe your idea in detail. Explain why it would be useful and how it aligns with Chamelleon's goal of being a fast, local, privacy-first media tool.

### Code Contributions
If you want to contribute code, follow these steps:

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/chamelleon.git
   ```
3. **Set up the development environment** (see prerequisites in the `README.md`):
   - Go 1.20+
   - Node.js 16+
   - Wails CLI (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)
   - `ffmpeg.exe` placed in the root directory.
4. **Create a new branch** for your feature or bugfix:
   ```bash
   git checkout -b feature/my-new-feature
   ```
5. **Make your changes**. 
   - **Backend (Go):** If you are modifying the core engine, video processing, or Wails bridge, look inside the `internal/` or `app.go` files.
   - **Frontend (React/TypeScript):** If you are modifying the UI, look inside the `frontend/` directory. We use Vite, React, Tailwind CSS, and Shadcn UI.
6. **Run the app** in development mode to test your changes:
   ```bash
   wails dev
   ```
7. **Run Tests.** If you added new functionality, please consider writing unit or integration tests. Make sure all existing tests pass.
8. **Commit your changes** with a clear and descriptive commit message:
   ```bash
   git commit -m "Add new smart compression preset for WebM"
   ```
9. **Push to your fork**:
   ```bash
   git push origin feature/my-new-feature
   ```
10. **Open a Pull Request** against the `main` branch of the official Chamelleon repository. Describe your changes, why they are needed, and link to any relevant issues.

## Stylechecks & Best Practices
- **Go Code:** Please ensure your Go code is formatted properly (`go fmt`).
- **Frontend Code:** Follow standard React/TypeScript conventions. Use Prettier to format your code.
- **Commit Messages:** Keep them concise but informative. Start with a category (feat, ui, chore, fix, docs) capital letter and use the imperative mood (e.g., "Add feature" instead of "Added feature").

Thank you for helping make Chamelleon better! 🎉
