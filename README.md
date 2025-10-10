# 📄 Restor - Secure Resume Management Platform

A comprehensive, security-hardened resume management application built with modern web technologies. Upload, parse, customize, and manage your resumes with enterprise-grade security features.

## 🚀 Features

### Core Functionality
- **Resume Upload & Parsing** - Support for PDF, DOC, and DOCX formats
- **AI-Powered Content Extraction** - Intelligent parsing of resume sections
- **Resume Customization** - Tailor resumes for specific job opportunities
- **PDF Generation** - Create professional PDFs from parsed data
- **Multi-Resume Management** - Organize and version multiple resumes

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
- **Tailwind CSS** - Utility-first styling
- **React Hook Form** - Form management
- **Axios** - HTTP client

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

## 🔄 Recent Updates & Fixes

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