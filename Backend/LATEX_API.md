# LaTeX to PDF Conversion API

This document describes the LaTeX to PDF conversion endpoints available in the Resume Creator API.

## Prerequisites

- MacTeX must be installed on the server
- The `pdflatex` command must be available (automatically detected at `/Library/TeX/texbin/pdflatex` on macOS)

## Endpoints

### 1. Convert LaTeX to PDF

**Endpoint:** `POST /api/latex/convert`

**Authentication:** Required (JWT Bearer token)

**Rate Limit:** 20 conversions per hour per user

**Request Body:**
```json
{
  "latexContent": "\\documentclass{article}...",
  "fileName": "my-resume" // optional, defaults to "document"
}
```

**Response:**
- **Success (200):** PDF file as binary data
  - Headers:
    - `Content-Type: application/pdf`
    - `Content-Disposition: attachment; filename="<fileName>.pdf"`
    - `X-Processing-Time: <milliseconds>`
- **Error (400):** Invalid LaTeX content
- **Error (500):** Conversion failed

**Example using cURL:**
```bash
curl -X POST http://localhost:3200/api/latex/convert \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latexContent": "\\documentclass{article}\\begin{document}Hello World\\end{document}",
    "fileName": "test"
  }' \
  --output test.pdf
```

**Example using JavaScript (axios):**
```javascript
const axios = require('axios');
const fs = require('fs');

const latexContent = `\\documentclass{article}
\\begin{document}
Hello World
\\end{document}`;

const response = await axios.post(
  'http://localhost:3200/api/latex/convert',
  {
    latexContent,
    fileName: 'my-document'
  },
  {
    headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN',
      'Content-Type': 'application/json'
    },
    responseType: 'arraybuffer'
  }
);

fs.writeFileSync('my-document.pdf', response.data);
```

---

### 2. Check LaTeX System Status

**Endpoint:** `GET /api/latex/status`

**Authentication:** Required (JWT Bearer token)

**Response:**
```json
{
  "success": true,
  "pdflatex": {
    "installed": true,
    "message": "pdflatex is available and ready to use"
  }
}
```

**Example:**
```bash
curl -X GET http://localhost:3200/api/latex/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 3. Validate LaTeX Content

**Endpoint:** `POST /api/latex/validate`

**Authentication:** Required (JWT Bearer token)

**Request Body:**
```json
{
  "latexContent": "\\documentclass{article}..."
}
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "message": "LaTeX content is valid"
}
```

**Example:**
```bash
curl -X POST http://localhost:3200/api/latex/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latexContent": "\\documentclass{article}\\begin{document}Test\\end{document}"
  }'
```

---

## LaTeX Requirements

For LaTeX content to be valid, it must include:
1. `\documentclass` declaration
2. `\begin{document}` and `\end{document}` tags

**Minimum valid LaTeX:**
```latex
\documentclass{article}
\begin{document}
Your content here
\end{document}
```

---

## Resume Template Example

Here's a complete LaTeX resume template:

```latex
\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=1in]{geometry}
\\usepackage{enumitem}

\\begin{document}

\\begin{center}
{\\LARGE \\textbf{John Doe}}\\\\
\\vspace{0.2cm}
Email: john.doe@example.com | Phone: (555) 123-4567
\\end{center}

\\section*{Summary}
Experienced software engineer with 5+ years of experience.

\\section*{Experience}

\\textbf{Senior Software Engineer} \\hfill \\textit{Jan 2021 - Present}\\\\
\\textit{Tech Company Inc.}
\\begin{itemize}[leftmargin=*]
\\item Led development of microservices architecture
\\item Improved system performance by 40\\%
\\item Mentored junior developers
\\end{itemize}

\\section*{Education}

\\textbf{Bachelor of Science in Computer Science} \\hfill \\textit{2015 - 2019}\\\\
\\textit{University of Technology}

\\section*{Skills}

\\textbf{Languages:} JavaScript, Python, Java\\\\
\\textbf{Frameworks:} React, Node.js, Express\\\\
\\textbf{Tools:} Git, Docker, AWS

\\end{document}
```

---

## Error Handling

Common errors and solutions:

1. **"pdflatex is not installed"**
   - Install MacTeX: `brew install --cask mactex`

2. **"LaTeX content must include \documentclass"**
   - Ensure your LaTeX has a proper document class declaration

3. **"LaTeX compilation encountered errors"**
   - Check your LaTeX syntax
   - Ensure all packages are available
   - Check for unmatched brackets or missing commands

4. **Rate limit exceeded**
   - Wait before making more requests (20 per hour limit)

---

## Performance Notes

- PDF generation takes approximately 500-1000ms for typical resumes
- The conversion runs `pdflatex` twice to resolve references
- Temporary files are automatically cleaned up after conversion
- Maximum buffer size for LaTeX output: 10MB

---

## Testing

Two test files are provided:

1. **test-latex-direct.js** - Direct service test (no authentication needed)
   ```bash
   node test-latex-direct.js
   ```

2. **test-latex.js** - Full API test (requires authentication token)
   ```bash
   # Edit the file to add your JWT token first
   node test-latex.js
   ```

---

## Implementation Details

### Service Location
- **Service:** `src/services/latexService.js`
- **Controller:** `src/controllers/latexController.js`
- **Routes:** `src/routes/latex.js`

### Key Features
- Automatic detection of `pdflatex` installation
- Support for multiple installation paths (macOS, Linux)
- Temporary directory management
- Comprehensive error handling
- Detailed logging
- Rate limiting per user

### Security
- All endpoints require authentication
- Rate limiting prevents abuse
- Temporary files are securely cleaned up
- LaTeX compilation runs in isolated directories
