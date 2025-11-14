# 📄 Restor - AI-Powered Resume Management Platform

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)

**A comprehensive, security-hardened resume management application built with modern web technologies.**

*Upload, parse, customize, and manage your resumes with enterprise-grade security features and AI-powered customization.*

</div>

> 🎯 **Perfect for job seekers**: Tailor your resume for every job application with AI assistance
> 🔒 **Enterprise-grade security**: Your data is protected with comprehensive security measures
> 🎨 **Beautiful UI/UX**: Modern dark mode support and intuitive interface
> 🎮 **Engaging experience**: Interactive mini-games while AI processes your resume

---

## 🎯 What is Restor?

Restor is a modern web application that revolutionizes how you manage and customize your resumes. Using cutting-edge AI technology, it helps you create perfectly tailored resumes for every job application while maintaining enterprise-grade security.

**Key Highlights:**
- 🚀 **One-Click Customization**: Paste a job description, and let AI optimize your resume
- 📝 **Smart Parsing**: Upload any resume format and convert it to structured, editable data
- 🎨 **Visual Feedback**: See exactly what changed with beautiful highlighting
- 🔒 **Secure & Private**: Your data stays protected with multiple security layers
- 🌓 **Modern Interface**: Beautiful dark mode and responsive design
- 🎮 **Enjoyable Experience**: Mini-games make waiting time fun

---

## 📋 Table of Contents

- [Features](#-features)
- [User Guide](#-user-guide)
- [Quick Start](#-quick-start)
- [Interactive Features](#-interactive-features)
- [Technology Stack](#-technology-stack)
- [API Documentation](#-api-documentation)
- [Configuration](#-configuration)
- [Security Features](#-security-features)
- [Development](#-development)
- [Troubleshooting](#-support--troubleshooting)

---

## 🚀 Features

### Core Functionality
- **📄 Resume Upload & Parsing** - Support for PDF, DOC, DOCX, and LaTeX formats
- **🤖 AI-Powered Content Extraction** - Intelligent parsing of resume sections with structure preservation
- **✨ Smart Resume Customization** - AI-powered resume tailoring for specific job opportunities
- **📑 Multi-Format Generation** - Create professional PDFs with LaTeX support for precise formatting
- **📚 Multi-Resume Management** - Organize and version multiple resumes with base resume support
- **🎨 Dark Mode Support** - Beautiful dark theme across the entire application
- **🎮 Interactive Mini-Games** - Play games while waiting for AI processing (Snake, Memory Match, Whack-a-Bug)
- **📊 Token Usage Tracking** - Monitor your AI usage and limits
- **🔄 Real-Time Processing** - Live feedback during resume parsing and customization

### User Experience Features
- **🌓 Dark Mode Toggle** - Seamless theme switching with system preference detection
- **🎯 Change Highlighting** - Visual indicators for AI-modified content with magical glow effects
- **📝 Inline Editing** - Edit and refine your resume directly in the preview
- **🔄 Undo/Revert** - Easily revert AI changes to original content
- **🪄 AI Responsibility Rewrite** - Context-aware rewriting of individual responsibilities
- **💾 Auto-Save Prompts** - Never lose your work with smart save prompts
- **🎲 Entertainment Features** - Mini-games to enjoy during processing waits
- **📱 Responsive Design** - Beautiful UI on desktop, tablet, and mobile

### Security Features
- **🔐 Enterprise Security** - Comprehensive security hardening implemented
- **🛡️ File Upload Protection** - Deep file validation and malware scanning
- **🔍 Path Traversal Protection** - Multi-layer file access validation
- **⚡ Advanced Rate Limiting** - Resource-specific and user-based limits
- **📊 Security Monitoring** - Detailed logging and threat detection
- **🔑 Strong Authentication** - Enhanced password policies and JWT security
- **✉️ Email Verification System** - Secure user verification with dynamic URL generation
- **👤 User Management** - Admin approval workflow and comprehensive user profiles

## 🏗️ Architecture

```
Restor/
├── Frontend/                    # Next.js React application
│   ├── src/
│   │   ├── app/                # App router pages
│   │   ├── components/         # React components
│   │   └── styles/            # CSS styles
│   ├── public/                # Static assets
│   ├── package.json
│   └── Dockerfile
├── Backend/                    # Node.js Express API
│   ├── src/
│   │   ├── controllers/       # Route controllers
│   │   ├── middleware/        # Express middleware
│   │   ├── models/           # Data models
│   │   ├── routes/           # API routes
│   │   ├── utils/            # Utility functions
│   │   └── config/           # Configuration files
│   ├── logs/                 # Application logs
│   ├── package.json
│   └── Dockerfile
├── scripts/                   # Utility scripts
├── docker-compose.yml        # Multi-service orchestration
├── .env                      # Environment configuration
└── README.md                # This file
```

## 🔧 Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS v4** - Utility-first styling with dark mode support
- **React 18** - Latest React with hooks and concurrent features
- **Context API** - State management for theme preferences
- **React Hook Form** - Form management and validation
- **Axios** - HTTP client for API communication
- **Lucide React** - Beautiful icon system
- **Custom Game Engine** - Built-in mini-games (Snake, Memory, Whack-a-Bug)

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **PostgreSQL** - Relational database with user profiles and timezone support
- **MinIO** - S3-compatible object storage
- **JWT** - Authentication tokens
- **Joi** - Input validation
- **bcryptjs** - Password hashing
- **SendGrid** - Email service for verification and notifications

### Infrastructure
- **Docker & Docker Compose** - Containerization
- **Nginx** - Reverse proxy (production)
- **Winston** - Structured logging

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Restor
```

### 2. Environment Setup
The `.env` file contains secure, production-ready credentials. For development, you may customize these values:

```bash
# Review and modify .env file if needed
nano .env
```

### 3. Start the Application
```bash
# Windows
start-rector.bat

# Linux/MacOS
./start-rector.sh

# Or manually with Docker Compose
docker-compose up -d --build
```

### 4. Access the Application

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3001 | Main application interface |
| **Backend API** | http://localhost:3000 | REST API endpoints |
| **MinIO Console** | http://localhost:9003 | Object storage management |
| **Health Check** | http://localhost:3000/health | Service status |

## 📖 User Guide

### Getting Started Workflow

#### 1️⃣ Account Setup
1. **Register**: Create your account at `/register`
2. **Verify Email**: Click the link sent to your email
3. **Wait for Approval**: Admin will review and approve your account
4. **Login**: Access the platform at `/login`

#### 2️⃣ Upload Your First Resume
1. Navigate to **Parse Resume** from the dashboard
2. **Drag & drop** or **click to select** your resume file (PDF, DOC, DOCX)
3. **Enter a name** for your resume
4. Click **Parse Resume** - enjoy a mini-game while AI processes!
5. **Review and Edit** the parsed data
6. Click **Save Resume** to add it to your collection

#### 3️⃣ Create Custom Resumes
1. Go to **Create Custom Resume** from the dashboard
2. **Select a base resume** from your collection
3. **Paste the job description** for the position you're applying to
4. **Preview your resume** alongside the job requirements
5. Click **Create Custom Resume** - play games while AI tailors it!
6. **Review AI changes** with highlighted modifications
7. **Edit as needed** using inline editing tools
8. **Save your customized resume** with a descriptive name

#### 4️⃣ Manage Your Resumes
- **Dashboard**: View all your resumes at a glance
- **Edit**: Modify any resume's content
- **Download**: Get PDF versions of your resumes
- **Delete**: Remove resumes you no longer need
- **Track Usage**: Monitor your AI token consumption

### Key Features Explained

#### 🤖 AI-Powered Resume Customization
The platform uses advanced AI to:
- **Analyze Job Requirements**: Understand what employers are looking for
- **Tailor Content**: Modify your resume to highlight relevant experience
- **Optimize Keywords**: Include industry-specific terminology
- **Enhance Descriptions**: Improve the impact of your responsibilities
- **Prioritize Skills**: Reorganize your skills section for the role

#### ✨ Change Highlighting
When AI customizes your resume, you'll see:
- **Purple Glow**: Modified sections and fields
- **Green Highlight**: Newly added content
- **Original Text Toggle**: Compare before/after versions
- **Undo Options**: Revert individual changes

#### 🔄 Inline Responsibility Rewriting
For any responsibility or description:
1. Click the **magic wand** icon (🪄)
2. AI generates an improved version
3. Review and choose to accept or discard
4. Iterate as many times as needed

## 🔄 Recent Updates & Fixes

### UI/UX Enhancements (January 2025)
- **🌓 Dark Mode Implementation**: Complete dark theme support across all pages and components
  - Theme toggle with light/dark/system preferences
  - Persistent theme selection via localStorage
  - Beautiful gradient-based dark mode designs
  - Optimized for readability and reduced eye strain
- **🎮 Interactive Mini-Games**: Entertainment during AI processing
  - 🐍 Snake Game - Classic arcade game with score tracking
  - 🧠 Memory Match - Card matching game with resume-themed icons
  - 🐛 Whack-a-Bug - Fast-paced bug squashing game
  - Automatic modal display during parsing and customization
  - Full dark mode support in all games
- **✨ Enhanced Change Visualization**:
  - Magical glow effects on AI-modified content
  - Color-coded additions, modifications, and removals
  - Expandable original text comparison
  - Section-by-section change indicators
- **📑 LaTeX Support**:
  - PDF generation with LaTeX templates
  - Structure metadata preservation
  - Platform-specific LaTeX processing (macOS/Linux)

### Database Schema Updates (September 2025)
- **✅ User Timezone Support**: Added `timezone` column to users table with automatic UTC default
- **🔧 Database Initialization**: Enhanced database initialization to handle missing columns gracefully
- **📊 User Profile Management**: Complete user profile system with timezone preferences

### Email System Enhancements
- **🌐 Dynamic URL Generation**: Email verification links now automatically adapt based on deployment:
  - **Localhost Development**: Links use `http://localhost:3000`
  - **Remote Server**: Links use actual server IP address and port
  - **Custom Domain**: Respects `FRONTEND_URL` environment variable
- **📧 SendGrid Integration**: Professional email delivery with comprehensive templates
- **🔔 Admin Notifications**: Automated notifications for user registration and approval workflow

### URL Configuration System
The application now includes intelligent URL detection in `/src/utils/urlUtils.js`:
- **Request-Based Detection**: Uses request headers when available
- **Environment Detection**: Checks service configuration (DB, MinIO) to determine deployment type
- **Network Interface Detection**: Automatically discovers server IP for remote deployments
- **Fallback System**: Multiple fallback layers ensure emails always have working links

### User Management Workflow
1. **User Registration** → Email verification sent with dynamic URL
2. **Email Verification** → Admin notification sent
3. **Admin Approval** → Welcome email sent to user
4. **Account Active** → Full access to resume management features

## 🎮 Interactive Features

### Mini-Games
While your resume is being processed by AI, enjoy one of three built-in mini-games:

#### 🐍 Snake Game
- **Controls**: Arrow keys (↑ ↓ ← →)
- **Objective**: Eat food to grow, avoid walls and yourself
- **Scoring**: +10 points per food item
- **Features**: Real-time score tracking, restart option

#### 🧠 Memory Match
- **Controls**: Click/tap to flip cards
- **Objective**: Match pairs of resume-themed emoji cards
- **Scoring**: +20 points per match, move counter
- **Features**: 8 unique card pairs, win detection

#### 🐛 Whack-a-Bug
- **Controls**: Click/tap on bugs
- **Objective**: Squash as many bugs as possible in 30 seconds
- **Scoring**: +10 points per bug
- **Features**: 30-second timer, final score display

**When Games Appear:**
- During resume parsing (Upload & Parse flow)
- During AI customization (Tailor for Job flow)
- Automatically dismissed when processing completes

### Dark Mode
Switch between light and dark themes using the toggle button in the navigation bar:

- **🌞 Light Mode**: Clean, bright interface for daytime use
- **🌙 Dark Mode**: Easy-on-the-eyes dark theme for low-light environments
- **💻 System**: Automatically matches your operating system preference

**Theme Persistence**: Your preference is saved and remembered across sessions.

**Availability**: Dark mode is fully supported across:
- Dashboard and all main pages
- Resume editing and preview interfaces
- Dialog boxes and modals
- All forms and input fields
- Mini-games interface

## 📚 API Documentation

### Authentication Endpoints
```
POST /api/auth/register       - User registration with email verification
POST /api/auth/login          - User login with approval checks
GET  /api/auth/me            - Get current user profile
GET  /api/auth/validate      - Validate JWT token
GET  /api/auth/verify-email  - Email verification endpoint
```

### User Management Endpoints
```
GET  /api/admin/users              - Get all users (admin only)
GET  /api/admin/users/pending      - Get pending approval users
POST /api/admin/users/:id/approve  - Approve user account
POST /api/admin/users/:id/reject   - Reject user account
POST /api/admin/users/:id/reset-tokens - Reset user token usage
```

### Account Management Endpoints
```
PUT  /api/account/profile     - Update user profile (name, timezone)
POST /api/account/password    - Change password
GET  /api/account/usage       - Get token usage statistics
```

### Resume Management Endpoints
```
POST /api/resumes/upload           - Upload and parse resume
POST /api/resumes/parse           - Parse uploaded file
POST /api/resumes/save-parsed     - Save parsed resume data
GET  /api/resumes                 - List user resumes
GET  /api/resumes/download/:file  - Download resume file
DELETE /api/resumes/:id           - Delete resume
POST /api/resumes/customize-for-job - Customize for job posting
GET  /api/resumes/pdf/:id         - Generate PDF
```

### Rate Limits
- **Authentication**: 5 attempts per 15 minutes
- **File Uploads**: 10 per 10 minutes (IP), 20 per hour (user)
- **File Downloads**: 50 per 5 minutes
- **Resume Parsing**: 10 per hour (user)
- **Resume Customization**: 15 per hour (user)

## 🔒 Security Features

### Authentication & Authorization
- **Strong Password Policy**: 12+ characters with complexity requirements
- **JWT Token Security**: Cryptographically secure secrets
- **Session Management**: Secure token expiration and renewal
- **Rate Limiting**: Comprehensive protection against brute force attacks

### File Upload Security
- **Deep File Validation**: Magic number verification and content scanning
- **Malware Detection**: Pattern-based suspicious content detection
- **Path Traversal Protection**: Multi-layer file path validation
- **File Type Enforcement**: Strict MIME type and extension validation
- **Size Limits**: Per-type file size restrictions

### Data Protection
- **Input Sanitization**: Comprehensive validation for all inputs
- **SQL Injection Prevention**: Parameterized queries throughout
- **XSS Protection**: Output encoding and CSP headers
- **CSRF Protection**: Token-based request validation

### Infrastructure Security
- **Container Isolation**: Docker-based service separation
- **Network Security**: Internal service communication
- **Secrets Management**: Environment-based configuration
- **Logging & Monitoring**: Comprehensive security event logging

## 🛠️ Development

### Local Development Setup
```bash
# Backend development
cd Backend
npm install
npm run dev

# Frontend development  
cd Frontend
npm install
npm run dev
```

### Database Management
```bash
# Run database migrations
cd Backend
npm run migrate

# Reset database (development only)
npm run reset-db
```

### Docker Development
```bash
# Rebuild services
docker-compose up --build

# View logs
docker-compose logs -f [service-name]

# Shell into container
docker-compose exec [service-name] bash
```

### Testing
```bash
# Backend tests
cd Backend
npm test

# Frontend tests
cd Frontend
npm test
```

## 📊 Monitoring & Logging

### Log Files
- **Application Logs**: `Backend/logs/application.log`
- **Error Logs**: `Backend/logs/error.log`
- **Security Logs**: `Backend/logs/security.log`
- **Access Logs**: `Backend/logs/access.log`

### Health Monitoring
All services include health checks:
- **Database**: Connection and query validation
- **Object Storage**: Service availability check
- **Backend API**: Endpoint responsiveness
- **Frontend**: HTTP response validation

### Key Metrics
- Request response times
- Error rates and types
- Authentication success/failure rates
- File upload/download volumes
- Rate limit violations
- Security events

## 🔧 Configuration

### Environment Variables

#### Database Configuration
```env
POSTGRES_DB=resume_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=[secure-password]
DB_HOST=localhost
DB_PORT=5433
```

#### MinIO Object Storage
```env
MINIO_ROOT_USER=[secure-access-key]
MINIO_ROOT_PASSWORD=[secure-secret-key]
MINIO_BUCKET_NAME=resumes
MINIO_ENDPOINT=localhost
MINIO_PORT=9002
```

#### Email Configuration (SendGrid)
```env
SENDGRID_API_KEY=[your-sendgrid-api-key]
SENDGRID_FROM_EMAIL=[verified-sender-email]
SENDGRID_FROM_NAME=Resume Builder
ADMIN_EMAIL=[admin-email-for-notifications]
```

#### URL Configuration
```env
# Optional: Set explicit URLs (auto-detected if not set)
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3200

# For production deployments:
# FRONTEND_URL=https://your-domain.com
# BACKEND_URL=https://api.your-domain.com
```

#### Application Security
```env
JWT_SECRET=[cryptographically-secure-secret]
NODE_ENV=production
```

#### AI/LLM Configuration
```env
# Choose your LLM provider: "local" or "cloud"
LLM_PROVIDER=cloud

# For local LM Studio
LLM_API_URL=http://localhost:1234/v1
LLM_MODEL_NAME=microsoft/phi-4

# For Google Gemini
GEMINI_API_KEY=[your-gemini-api-key]
GEMINI_MODEL_NAME=gemini-2.0-flash-lite
```

### Service Configuration

#### Rate Limiting
Customize rate limits in `Backend/src/middleware/rateLimiter.js`:
- Authentication attempts
- File upload frequency
- API request limits
- User resource quotas

#### File Validation
Configure file security in `Backend/src/utils/fileValidator.js`:
- Allowed file types
- Maximum file sizes
- Content scanning rules
- Filename restrictions

## 📈 Performance & Scalability

### Optimization Features
- **Efficient File Processing**: Stream-based file handling
- **Database Indexing**: Optimized query performance
- **Caching Strategy**: Redis-ready architecture
- **Load Balancing**: Docker Compose scaling support

### Scaling Recommendations
1. **Horizontal Scaling**: Multiple backend instances behind load balancer
2. **Database Scaling**: PostgreSQL read replicas for high-traffic scenarios
3. **Object Storage**: MinIO clustering for redundancy
4. **CDN Integration**: Static asset delivery optimization

## 🚨 Security Considerations

### Production Deployment Checklist
- [ ] Change all default passwords and secrets
- [ ] Enable HTTPS/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Enable audit logging
- [ ] Review and customize rate limits
- [ ] Implement backup strategies
- [ ] Configure intrusion detection
- [ ] **Set up SendGrid account and verify sender email**
- [ ] **Configure environment URLs for your domain**
- [ ] **Set admin email for notifications**
- [ ] **Test email verification workflow**
- [ ] **Verify database timezone column exists**

### Security Best Practices
1. **Regular Updates**: Keep dependencies current
2. **Security Scanning**: Regular vulnerability assessments
3. **Access Control**: Principle of least privilege
4. **Data Encryption**: At rest and in transit
5. **Incident Response**: Defined security procedures

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Add tests for new functionality
- Update documentation as needed
- Ensure security best practices are maintained

## 💡 Pro Tips

### Maximizing Resume Effectiveness
1. **Use Base Resumes**: Create one comprehensive "master" resume, then customize for each job
2. **Be Specific**: Include detailed job descriptions when customizing for better AI matching
3. **Review AI Changes**: Always review and refine AI suggestions - you know your experience best
4. **Version Control**: Save different versions for different job types (e.g., "Software Engineer - Backend", "Software Engineer - Full Stack")
5. **Regular Updates**: Keep your base resume current with new skills and experiences

### Best Practices
- **Token Management**: Monitor your AI usage to stay within limits
- **Test Downloads**: Always preview PDFs before sending to employers
- **Backup Strategy**: Download PDFs of important resumes for local backup
- **Dark Mode**: Use dark mode for extended editing sessions to reduce eye strain
- **Game Breaks**: Enjoy the mini-games during processing - they're designed to be quick and fun!

### Security Tips
- **Strong Passwords**: Use unique, complex passwords for your account
- **Regular Logout**: Log out when using shared computers
- **Email Verification**: Complete email verification promptly
- **Review Permissions**: Check what data you're sharing

## 📄 License

This project is licensed under the ISC License - see individual component licenses for details.

## 📞 Support & Troubleshooting

### Common Issues

**Service won't start?**
```bash
# Check service status
docker-compose ps

# View service logs
docker-compose logs [service-name]

# Restart specific service
docker-compose restart [service-name]
```

**Database connection issues?**
```bash
# Check PostgreSQL health
docker-compose exec postgres pg_isready -U postgres

# Reset database (development only)
npm run reset-db
```

**File upload failures?**
- Check file size limits (10MB maximum)
- Verify file type (PDF, DOC, DOCX only)
- Review security logs for validation errors

**Database column errors?**
```bash
# Fix missing timezone column
cd Backend
node -e "require('./src/config/dbInit').initializeDatabase()"

# Or restart the application (auto-fixes on startup)
npm start
```

**Email verification links not working?**
- Check email links match your server's host/IP
- Verify `FRONTEND_URL` environment variable
- Review email service logs: `docker-compose logs backend`
- Ensure SendGrid API key is valid and sender email is verified

**User approval workflow issues?**
- Super admin email: Set `ADMIN_EMAIL` in environment
- Check user account status in database
- Review admin notification emails
- Verify email service configuration

**Dark mode not working?**
- Clear browser cache and localStorage
- Check browser compatibility (modern browsers only)
- Verify theme toggle button is visible in navigation
- Try manually switching themes using the toggle

**Mini-games not appearing?**
- Games only show during active processing (parsing or customization)
- Check browser console for JavaScript errors
- Ensure JavaScript is enabled in your browser
- Try refreshing the page and starting the process again

**Resume changes not highlighting?**
- Highlighting requires original resume data for comparison
- Ensure you're using "Create Custom Resume" flow (not manual editing)
- Check that AI customization completed successfully
- Review browser console for any errors

### Getting Help
- Check the logs in `Backend/logs/`
- Review Docker Compose service status
- Verify environment configuration
- Check network connectivity between services

### Performance Troubleshooting
- Monitor resource usage: `docker stats`
- Check database query performance
- Review rate limiting logs
- Analyze request patterns

---

## 🔐 Security Notice

This application implements enterprise-grade security features including:
- Advanced threat protection
- Comprehensive input validation  
- Secure file handling
- Detailed security logging
- Multi-layer access controls

For security issues, please contact the development team privately rather than opening public issues.

---

**Built with ❤️ for secure, professional resume management**