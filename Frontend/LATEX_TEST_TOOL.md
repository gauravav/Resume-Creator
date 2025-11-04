# LaTeX Test Tool - Admin Feature

This document describes the LaTeX to PDF test tool available in the admin dashboard.

## Overview

The LaTeX Test Tool is an admin-only feature that allows administrators to test the LaTeX to PDF conversion functionality. This tool provides a user-friendly interface to upload LaTeX files, edit content, and generate PDF documents.

## Accessing the Tool

1. Log in as an admin user
2. Navigate to the Admin Dashboard at `/admin`
3. Click on the "LaTeX to PDF Test Tool" card
4. You'll be redirected to `/admin/latex-test`

## Features

### 1. System Status Check
- Automatically checks if `pdflatex` is installed on the server
- Displays a status message indicating whether the system is ready
- Green status: pdflatex is installed and ready
- Red status: pdflatex is not installed

### 2. File Upload
- Upload `.tex` files directly from your computer
- Automatically extracts content and populates the editor
- File name is automatically extracted (without .tex extension)

### 3. Sample Template
- Click "Load Sample Template" to load a pre-built resume template
- Great for testing basic functionality
- Includes common LaTeX packages and formatting

### 4. Content Editor
- Large textarea for editing LaTeX content
- Syntax highlighting support (monospace font)
- Character count displayed
- Real-time editing

### 5. File Name Configuration
- Set custom output PDF filename
- Default: "test-document"
- Extension (.pdf) is automatically added

### 6. PDF Generation & Download
- Click "Convert to PDF & Download" to generate PDF
- Shows loading spinner during conversion
- Automatically downloads the generated PDF
- Displays success/error messages

## Sample Template

The tool includes a professional resume template with:
- Header section (name, contact info)
- Summary section
- Experience section with multiple positions
- Education section
- Skills section
- Proper formatting with bullet points

## Usage Instructions

### Basic Usage
1. Click "Load Sample Template" to start with an example
2. Modify the content as needed
3. Enter a filename (optional)
4. Click "Convert to PDF & Download"
5. The PDF will be downloaded to your computer

### Upload Custom File
1. Click "Upload .tex File"
2. Select a `.tex` file from your computer
3. The content will be loaded into the editor
4. Make any necessary edits
5. Click "Convert to PDF & Download"

### Manual Entry
1. Clear the editor or start fresh
2. Paste or type your LaTeX content
3. Ensure you have:
   - `\documentclass{...}` declaration
   - `\begin{document}` and `\end{document}` tags
4. Click "Convert to PDF & Download"

## Required LaTeX Structure

For successful conversion, your LaTeX content must include:

```latex
\documentclass{article}  % Or any other document class

% Optional: packages
\usepackage{...}

\begin{document}

% Your content here

\end{document}
```

## Error Handling

### Common Errors:

1. **"pdflatex is not installed"**
   - Solution: Install MacTeX on the server
   - Command: `brew install --cask mactex`

2. **"LaTeX content must include \documentclass"**
   - Solution: Add document class at the beginning
   - Example: `\documentclass{article}`

3. **"LaTeX content must include \begin{document}"**
   - Solution: Wrap content in document environment
   - Add `\begin{document}` and `\end{document}`

4. **"LaTeX compilation encountered errors"**
   - Solution: Check LaTeX syntax
   - Verify all packages are available
   - Check for unmatched braces or brackets

5. **"Network error"**
   - Solution: Check backend server status
   - Verify authentication token is valid

## Technical Details

### Frontend Route
- Path: `/admin/latex-test`
- Component: `src/app/admin/latex-test/page.tsx`
- Authentication: Required (Admin only)

### Backend API
- Endpoint: `POST /api/latex/convert`
- Status: `GET /api/latex/status`
- Rate Limit: 20 conversions per hour per user

### Features
- Real-time status checking
- File upload support (.tex files)
- Content validation
- Error display with clear messages
- Success notifications
- Automatic PDF download
- Character count display

## Security

- Admin authentication required
- Rate limiting applied (20 conversions/hour)
- File type validation (.tex only)
- Content validation before conversion
- Temporary files cleaned up after conversion

## Browser Compatibility

Tested and working on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Tips for Best Results

1. **Use Standard Packages**: Stick to common LaTeX packages
2. **Test Incrementally**: Test with small content first
3. **Check Syntax**: Validate LaTeX syntax before conversion
4. **File Names**: Use descriptive, alphanumeric filenames
5. **Content Size**: Keep content reasonable (<100KB recommended)

## Troubleshooting

### PDF Not Downloading
- Check browser download settings
- Ensure pop-ups are allowed
- Check browser console for errors

### Conversion Taking Too Long
- Check LaTeX content complexity
- Verify server resources
- Check network connection

### Invalid LaTeX Errors
- Validate LaTeX syntax locally first
- Use simpler templates to start
- Check for special characters
- Verify package availability

## Support

For issues or questions:
1. Check backend server logs
2. Verify pdflatex installation
3. Review LATEX_API.md in Backend directory
4. Check browser console for frontend errors

## Future Enhancements

Potential improvements:
- Syntax highlighting in editor
- Live preview
- Multiple file upload support
- LaTeX template library
- Conversion history
- Batch conversion
