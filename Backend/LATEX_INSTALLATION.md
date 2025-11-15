# LaTeX Installation Guide for All Operating Systems

This guide helps you install and configure LaTeX for PDF generation in the Resume Creator application.

## Overview

The application **automatically detects** your LaTeX installation on startup. It supports:

- ✅ **macOS**: MacTeX, TeX Live via Homebrew
- ✅ **Linux**: TeX Live from repositories or manual installation
- ✅ **Windows**: MiKTeX, TeX Live

No configuration needed if LaTeX is installed in standard locations or in your PATH!

---

## Quick Check

To check if LaTeX is already installed:

### macOS / Linux
```bash
which pdflatex
# Should output a path like: /Library/TeX/texbin/pdflatex
```

### Windows
```cmd
where pdflatex
# Should output a path like: C:\texlive\2024\bin\windows\pdflatex.exe
```

If you see a path, you're all set! Skip to [Testing Your Installation](#testing-your-installation).

---

## Installation Instructions

### macOS

**Option 1: MacTeX (Recommended - Full Installation)**

1. **Download MacTeX**
   ```bash
   # Using Homebrew (easiest)
   brew install --cask mactex

   # Or download from: https://tug.org/mactex/
   ```

2. **Wait for Installation** (takes 5-15 minutes, ~4GB download)

3. **Verify Installation**
   ```bash
   /Library/TeX/texbin/pdflatex --version
   # Should show: pdfTeX 3.141592...
   ```

**Option 2: BasicTeX (Minimal Installation)**

For a smaller installation (~100MB):

```bash
# Install BasicTeX
brew install --cask basictex

# Add to PATH
export PATH="/Library/TeX/texbin:$PATH"

# Install required packages
sudo tlmgr update --self
sudo tlmgr install collection-fontsrecommended
sudo tlmgr install geometry titlesec xcolor enumitem hyperref paracol
```

**Option 3: Homebrew TeX Live**

```bash
brew install texlive
```

---

### Linux

**Ubuntu/Debian:**

```bash
# Full installation (recommended)
sudo apt-get update
sudo apt-get install texlive-full

# Or minimal installation
sudo apt-get install texlive-latex-base texlive-latex-recommended \
                     texlive-fonts-recommended texlive-latex-extra
```

**Fedora/RHEL/CentOS:**

```bash
# Full installation
sudo dnf install texlive-scheme-full

# Or minimal installation
sudo dnf install texlive-latex texlive-collection-fontsrecommended
```

**Arch Linux:**

```bash
# Full installation
sudo pacman -S texlive-most

# Or minimal installation
sudo pacman -S texlive-core texlive-latexextra
```

**Manual TeX Live Installation (Any Linux):**

```bash
# Download installer
wget https://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz
tar -xzf install-tl-unx.tar.gz
cd install-tl-*

# Run installer
sudo ./install-tl

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="/usr/local/texlive/2024/bin/x86_64-linux:$PATH"
```

---

### Windows

**Option 1: MiKTeX (Recommended for Windows)**

1. **Download MiKTeX**
   - Visit: https://miktex.org/download
   - Download the installer (Windows 64-bit)

2. **Run Installer**
   - Choose "Install MiKTeX for all users" (recommended)
   - Default installation path: `C:\Program Files\MiKTeX`

3. **Configure MiKTeX**
   - Open "MiKTeX Console" from Start Menu
   - Click "Check for updates"
   - Set "Install missing packages on-the-fly" to "Yes"

4. **Verify Installation**
   ```cmd
   where pdflatex
   # Should show: C:\Program Files\MiKTeX\miktex\bin\x64\pdflatex.exe
   ```

**Option 2: TeX Live for Windows**

1. **Download TeX Live**
   - Visit: https://tug.org/texlive/acquire-netinstall.html
   - Download `install-tl-windows.exe`

2. **Run Installer**
   - Run as Administrator
   - Choose "Full installation" (recommended)
   - Default path: `C:\texlive\2024`

3. **Wait for Installation** (30-60 minutes, ~7GB)

4. **Verify Installation**
   ```cmd
   where pdflatex
   # Should show: C:\texlive\2024\bin\windows\pdflatex.exe
   ```

---

## Configuration

### Automatic Detection (Default)

The application automatically searches these paths:

**macOS:**
- `/Library/TeX/texbin/pdflatex` (MacTeX)
- `/usr/local/texlive/*/bin/universal-darwin/pdflatex`
- `/usr/local/texlive/*/bin/x86_64-darwin/pdflatex`
- `/opt/homebrew/bin/pdflatex` (Apple Silicon)
- `pdflatex` (if in PATH)

**Linux:**
- `/usr/bin/pdflatex`
- `/usr/local/bin/pdflatex`
- `/usr/local/texlive/*/bin/x86_64-linux/pdflatex`
- `/opt/texlive/*/bin/x86_64-linux/pdflatex`
- `pdflatex` (if in PATH)

**Windows:**
- `C:\texlive\*\bin\windows\pdflatex.exe`
- `C:\Program Files\MiKTeX\miktex\bin\x64\pdflatex.exe`
- `%USERPROFILE%\AppData\Local\Programs\MiKTeX\miktex\bin\x64\pdflatex.exe`
- `pdflatex` (if in PATH)

### Custom Path Configuration

If your LaTeX is installed in a non-standard location, set the path in `.env`:

```env
# macOS
LATEX_PDFLATEX_PATH=/custom/path/to/pdflatex

# Linux
LATEX_PDFLATEX_PATH=/opt/custom/texlive/bin/pdflatex

# Windows (use forward slashes or escaped backslashes)
LATEX_PDFLATEX_PATH=C:/texlive/2024/bin/windows/pdflatex.exe
# or
LATEX_PDFLATEX_PATH=C:\\texlive\\2024\\bin\\windows\\pdflatex.exe
```

---

## Testing Your Installation

### Method 1: Via Resume Creator Backend

Start the backend server and check the logs:

```bash
cd Backend
npm run dev
```

Look for this log message:
```
[INFO] Initialized LaTeX service { platform: 'darwin', searchPaths: 8 }
[INFO] Found pdflatex in PATH { platform: 'darwin' }
```

### Method 2: Test LaTeX Directly

Create a test file `test.tex`:

```latex
\documentclass{article}
\begin{document}
Hello, LaTeX!
\end{document}
```

Compile it:

```bash
# macOS/Linux
pdflatex test.tex

# Windows
pdflatex test.tex
```

If `test.pdf` is generated, your installation works!

### Method 3: Use the API Endpoint

With the backend running:

```bash
# Check LaTeX status
curl -X GET http://localhost:3200/api/latex/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "installed": true,
  "message": "pdflatex is installed and available",
  "path": "/Library/TeX/texbin/pdflatex"
}
```

---

## Troubleshooting

### LaTeX Not Found

**Error:** `pdflatex is not installed on this system`

**Solutions:**

1. **Verify installation:**
   ```bash
   # macOS/Linux
   which pdflatex

   # Windows
   where pdflatex
   ```

2. **Add to PATH:**

   **macOS/Linux** (add to `~/.bashrc` or `~/.zshrc`):
   ```bash
   export PATH="/Library/TeX/texbin:$PATH"  # macOS
   # or
   export PATH="/usr/local/texlive/2024/bin/x86_64-linux:$PATH"  # Linux
   ```

   **Windows:**
   - Open "Environment Variables"
   - Edit "Path" in System Variables
   - Add: `C:\Program Files\MiKTeX\miktex\bin\x64`
   - Or: `C:\texlive\2024\bin\windows`
   - Restart terminal/IDE

3. **Set custom path in `.env`:**
   ```env
   LATEX_PDFLATEX_PATH=/your/custom/path/to/pdflatex
   ```

4. **Restart the backend server** after PATH changes

---

### Permission Denied (Linux/macOS)

**Error:** `EACCES: permission denied`

**Solution:**
```bash
# Make pdflatex executable
chmod +x /path/to/pdflatex

# Or reinstall with proper permissions
sudo apt-get install --reinstall texlive
```

---

### Missing LaTeX Packages

**Error:** `! LaTeX Error: File 'geometry.sty' not found`

**Solutions:**

**macOS (MacTeX):**
```bash
sudo tlmgr update --all
sudo tlmgr install geometry titlesec xcolor enumitem
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get install texlive-latex-extra

# Fedora
sudo dnf install texlive-collection-latexextra
```

**Windows (MiKTeX):**
- Open MiKTeX Console
- Go to "Packages"
- Search and install missing packages
- Or enable "Install missing packages on-the-fly"

---

### Windows: File Path Issues

**Error:** `File not found` or `Invalid path`

**Solutions:**

1. **Use forward slashes in `.env`:**
   ```env
   LATEX_PDFLATEX_PATH=C:/texlive/2024/bin/windows/pdflatex.exe
   ```

2. **Or use escaped backslashes:**
   ```env
   LATEX_PDFLATEX_PATH=C:\\texlive\\2024\\bin\\windows\\pdflatex.exe
   ```

3. **Check path is correct:**
   ```cmd
   dir "C:\texlive\2024\bin\windows\pdflatex.exe"
   ```

---

### Compilation Errors

**Error:** `LaTeX compilation failed`

**Check the logs:**
```bash
cd Backend
npm run dev
```

Look for detailed error messages in the console.

**Common issues:**
- Special characters not escaped (%, $, #, &, _)
- Missing packages
- Syntax errors in LaTeX template

---

## Required LaTeX Packages

The application uses these LaTeX packages:

- `geometry` - Page layout
- `titlesec` - Section formatting
- `xcolor` - Colors
- `enumitem` - List customization
- `hyperref` - Links and PDF metadata
- `paracol` - Multi-column layouts
- `fontenc` - Font encoding
- `inputenc` - Input encoding

All included in:
- MacTeX (full)
- TeX Live (full)
- MiKTeX (with auto-install enabled)

---

## Performance Tips

1. **Use Full Installation**
   - Faster compilation (all packages pre-installed)
   - No internet required during PDF generation

2. **Enable Package Auto-Install** (MiKTeX)
   - Automatically downloads missing packages
   - Convenient but requires internet

3. **Keep LaTeX Updated**
   ```bash
   # macOS/Linux
   sudo tlmgr update --self
   sudo tlmgr update --all

   # Windows MiKTeX
   # Use MiKTeX Console → Updates
   ```

---

## Disk Space Requirements

| Installation | Size | Packages |
|-------------|------|----------|
| **MacTeX (Full)** | ~4 GB | All packages |
| **BasicTeX** | ~100 MB | Minimal |
| **TeX Live (Full)** | ~7 GB | All packages |
| **TeX Live (Basic)** | ~500 MB | Essential only |
| **MiKTeX (Full)** | ~2 GB | All packages |
| **MiKTeX (Basic)** | ~200 MB | Auto-download enabled |

---

## Need Help?

1. **Check server logs:**
   ```bash
   cd Backend
   npm run dev
   ```

2. **Test LaTeX installation:**
   ```bash
   pdflatex --version
   ```

3. **Verify API status:**
   ```bash
   curl http://localhost:3200/api/latex/status -H "Authorization: Bearer TOKEN"
   ```

4. **LaTeX documentation:**
   - MacTeX: https://tug.org/mactex/
   - MiKTeX: https://miktex.org/
   - TeX Live: https://tug.org/texlive/

---

## Summary

✅ Install LaTeX using your OS package manager
✅ Application auto-detects installation
✅ Set custom path in `.env` if needed
✅ Test using `/api/latex/status` endpoint
✅ Check logs if issues occur

Your Resume Creator is now ready to generate professional PDFs! 🎉
