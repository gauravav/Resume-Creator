# 🔒 Security Policy

<div align="center">

![Security Rating](https://img.shields.io/badge/Security-A+-success?style=for-the-badge)
![Last Updated](https://img.shields.io/badge/Updated-January%202025-blue?style=for-the-badge)
![OWASP](https://img.shields.io/badge/OWASP-Top%2010%20Protected-important?style=for-the-badge)

**Comprehensive security documentation for Restor Resume Management Platform**

</div>

---

## 📋 Table of Contents

- [Supported Versions](#supported-versions)
- [Security Architecture](#-security-architecture)
- [Security Features](#security-features)
- [Authentication & Authorization](#authentication--authorization)
- [File Security](#-file-upload-security-deep-dive)
- [Data Protection](#-data-protection-comprehensive)
- [Rate Limiting](#rate-limiting)
- [Security Headers](#security-headers)
- [Reporting Vulnerabilities](#reporting-security-vulnerabilities)
- [Deployment Best Practices](#security-best-practices-for-deployment)
- [Security Monitoring](#security-monitoring)
- [Compliance](#compliance-considerations)
- [Security Testing](#security-testing)

---

## Supported Versions

| Version | Supported          | Security Status |
| ------- | ------------------ | --------------- |
| 1.0.x   | :white_check_mark: | Active Support  |
| < 1.0   | :x:                | Not Supported   |

---

## 🏰 Security Architecture

### Defense in Depth Strategy

Restor implements a **multi-layered security approach** with defense mechanisms at every level:

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Network Security (Firewall, TLS/HTTPS)       │
├─────────────────────────────────────────────────────────┤
│  Layer 2: Application Security (Rate Limiting, WAF)    │
├─────────────────────────────────────────────────────────┤
│  Layer 3: Authentication (JWT, Session Management)     │
├─────────────────────────────────────────────────────────┤
│  Layer 4: Authorization (Role-Based Access Control)    │
├─────────────────────────────────────────────────────────┤
│  Layer 5: Input Validation (Sanitization, Validation)  │
├─────────────────────────────────────────────────────────┤
│  Layer 6: Data Protection (Encryption, Hashing)        │
├─────────────────────────────────────────────────────────┤
│  Layer 7: Logging & Monitoring (SIEM, Alerts)          │
└─────────────────────────────────────────────────────────┘
```

### Security Components

#### 🔐 Authentication System
- **Location**: `Backend/src/middleware/auth.js`
- **Features**:
  - JWT-based authentication with secure token generation
  - Password hashing using bcrypt (10 rounds)
  - Email verification workflow
  - Admin approval system
  - Token expiration and renewal

#### 🛡️ File Validation System
- **Location**: `Backend/src/utils/fileValidator.js`
- **Features**:
  - Magic number verification (file signature checking)
  - MIME type validation
  - File extension whitelisting
  - Path traversal protection
  - Malware pattern detection
  - Size limit enforcement (10MB max)

#### ⚡ Rate Limiting System
- **Location**: `Backend/src/middleware/rateLimiter.js`
- **Features**:
  - IP-based rate limiting
  - User-based rate limiting
  - Resource-specific limits
  - Redis-ready for distributed systems
  - Automatic IP blocking on abuse

#### 📝 Input Validation
- **Location**: Throughout `Backend/src/routes/`
- **Features**:
  - Joi schema validation
  - SQL injection prevention
  - XSS protection
  - CSRF token validation
  - Command injection prevention

#### 🔒 Secure File Storage
- **Location**: MinIO Object Storage
- **Features**:
  - Isolated storage buckets
  - Pre-signed URL access
  - Server-side encryption
  - Access logging
  - Temporary URL expiration

---

## Security Features

This application implements comprehensive security measures:

### Authentication & Authorization
- **Strong Password Policy**: Minimum 12 characters with complexity requirements
- **JWT Token Security**: Cryptographically secure secrets (128-bit entropy)
- **Session Management**: Secure token expiration and renewal
- **Rate Limiting**: Multi-layer protection against brute force attacks

### File Upload Security
- **Deep File Validation**: Magic number verification and content scanning
- **Malware Detection**: Pattern-based suspicious content detection
- **Path Traversal Protection**: Multi-layer file path validation
- **File Type Enforcement**: Strict MIME type and extension validation
- **Size Limits**: Per-type file size restrictions (10MB max)

### Data Protection
- **Input Sanitization**: Comprehensive validation for all inputs using Joi schemas
- **SQL Injection Prevention**: Parameterized queries with pg-promise throughout
- **XSS Protection**: Output encoding, CSP headers, and React's built-in XSS protection
- **Password Hashing**: bcrypt with 10 rounds (adjustable for future-proofing)
- **Sensitive Data**: JWT tokens never logged, passwords never stored in plaintext
- **Database Encryption**: Support for PostgreSQL encryption at rest

### Infrastructure Security
- **Container Isolation**: Docker-based service separation
- **Network Security**: Internal service communication only
- **Secrets Management**: Environment-based secure configuration
- **Comprehensive Logging**: Security event monitoring and alerting
- **Dark Mode Security**: Client-side theme preference (no server-side vulnerabilities)
- **Mini-Games**: Pure client-side JavaScript (no network requests, no data collection)

---

## 🛡️ File Upload Security: Deep Dive

File upload is a critical attack vector. Our implementation includes multiple layers of protection:

### Layer 1: Pre-Upload Validation (Client-Side)
**Location**: `Frontend/src/app/parse-resume/page.tsx`

```typescript
// Client-side validation before upload
- File extension check (.pdf, .doc, .docx)
- File size validation (< 5MB)
- MIME type verification
```

**Note**: Client-side validation is for UX only. Never trust client input!

### Layer 2: Upload Middleware (Server-Side)
**Location**: `Backend/src/middleware/fileUpload.js`

```javascript
// Express middleware validation
- Multer disk storage with unique filenames
- File size limits enforced
- Temporary storage location
- Automatic cleanup on errors
```

### Layer 3: Deep File Validation
**Location**: `Backend/src/utils/fileValidator.js`

#### Magic Number Verification
```javascript
// Validates file signatures (first bytes of file)
PDF:  %PDF-1. (25 50 44 46 2D 31 2E)
DOCX: PK (50 4B) - ZIP signature
DOC:  D0 CF 11 E0 A1 B1 1A E1 - OLE signature
```

**Why This Matters**: Attackers can rename malicious files (e.g., `virus.exe` → `resume.pdf`). Magic number checking ensures the file is actually what it claims to be.

#### Content Scanning
```javascript
// Scans file content for suspicious patterns
- Executable signatures (MZ, ELF)
- Script tags and JavaScript
- SQL injection patterns
- Command injection attempts
- Path traversal sequences (../, ..\)
```

#### MIME Type Validation
```javascript
// Double-checks MIME type
application/pdf           ✓ Allowed
application/msword        ✓ Allowed
application/vnd.openxmlformats-officedocument.wordprocessingml.document ✓ Allowed
application/x-msdownload  ✗ BLOCKED
text/html                 ✗ BLOCKED
```

### Layer 4: Path Traversal Protection
**Location**: `Backend/src/utils/pathValidator.js`

```javascript
// Prevents directory traversal attacks
BLOCKED: ../../../etc/passwd
BLOCKED: ..\..\windows\system32\
BLOCKED: /etc/shadow
ALLOWED: resume_uuid.pdf (normalized, sanitized)
```

### Layer 5: Secure Storage
**Location**: MinIO Object Storage

```javascript
// Isolated storage with access controls
- Pre-signed URLs (temporary access)
- Bucket policies (principle of least privilege)
- No direct file system access
- Automatic cleanup of old files
```

### Layer 6: Download Protection
**Location**: `Backend/src/routes/resume.js`

```javascript
// Secure file retrieval
- User ownership verification
- Rate limiting (50 downloads per 5 minutes)
- Pre-signed URL generation
- Content-Disposition header (force download)
- No path parameters (prevents traversal)
```

### Attack Scenarios Prevented

| Attack Type | Prevention Mechanism | Implementation |
|-------------|---------------------|----------------|
| **Malicious File Upload** | Magic number + content scanning | `fileValidator.js` |
| **Path Traversal** | Path normalization + validation | `pathValidator.js` |
| **File Bomb** | Size limits (10MB) | Multer middleware |
| **Zip Bomb** | Content inspection | `fileValidator.js` |
| **Executable Upload** | Extension + signature check | `fileValidator.js` |
| **XXE Attack** | Disable external entities | `llmResumeParser.js` |
| **DoS via Upload** | Rate limiting | `rateLimiter.js` |

---

## 🔐 Data Protection: Comprehensive

### Password Security

#### Storage
```javascript
// Backend/src/controllers/authController.js
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(password, saltRounds);
// Passwords NEVER stored in plaintext
```

#### Validation
```javascript
// Minimum 12 characters
// Must include:
- Uppercase letter (A-Z)
- Lowercase letter (a-z)
- Number (0-9)
- Special character (!@#$%^&*)
```

#### Verification
```javascript
// Constant-time comparison prevents timing attacks
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

### Token Security

#### JWT Configuration
```javascript
// Backend/src/middleware/auth.js
{
  secret: process.env.JWT_SECRET,  // Min 64 characters, cryptographically random
  expiresIn: '24h',                // 24-hour expiration
  algorithm: 'HS256'               // HMAC with SHA-256
}
```

#### Token Storage
- **Frontend**: httpOnly cookies (not accessible to JavaScript)
- **Never in localStorage** (XSS vulnerability)
- **Never in URL parameters** (logging vulnerability)

### Database Security

#### Connection Security
```javascript
// Parameterized queries prevent SQL injection
const query = 'SELECT * FROM users WHERE id = $1';
await db.query(query, [userId]);
// NEVER: 'SELECT * FROM users WHERE id = ' + userId
```

#### Sensitive Data
- Passwords: bcrypt hashed
- JWT secrets: Environment variables
- API keys: Encrypted at rest
- User emails: Indexed but never exposed in logs

### API Security

#### Input Validation Example
```javascript
// Backend/src/routes/resume.js
const schema = Joi.object({
  resumeName: Joi.string().min(1).max(100).required(),
  jobDescription: Joi.string().max(10000),
  technologies: Joi.array().items(Joi.string())
});
```

#### Output Sanitization
```javascript
// Remove sensitive fields before sending
const sanitizedUser = {
  id: user.id,
  email: user.email,
  name: user.name
  // password, apiKey, etc. NEVER sent
};
```

## Rate Limiting

The application implements granular rate limiting:

- **Authentication**: 5 attempts per 15 minutes per IP
- **File Uploads**: 10 per 10 minutes (IP) + 20 per hour (user)
- **File Downloads**: 50 per 5 minutes per IP
- **Resume Parsing**: 10 per hour per user
- **Resume Customization**: 15 per hour per user
- **General API**: 100 requests per 15 minutes per IP

## Security Headers

The application sets the following security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
X-Request-ID: [unique-request-identifier]
Cache-Control: private, no-cache, no-store, must-revalidate
```

## Reporting Security Vulnerabilities

We take the security of our application seriously. If you discover a security vulnerability, please follow these steps:

### 🚨 Do NOT create a public GitHub issue for security vulnerabilities

Instead, please report security vulnerabilities through one of these methods:

1. **Email**: Send details to sudo@gauravula.com
2. **Private Issue**: Create a private security advisory on GitHub
3. **Encrypted Communication**: Use our PGP key for sensitive reports

### What to Include

When reporting a security vulnerability, please include:

- **Description**: Clear description of the vulnerability
- **Impact**: Potential impact and attack scenarios
- **Reproduction**: Step-by-step instructions to reproduce
- **Environment**: Version, configuration, and environment details
- **Evidence**: Screenshots, logs, or proof-of-concept code
- **Suggested Fix**: If you have recommendations for remediation

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Status Updates**: Weekly until resolution
- **Fix Deployment**: Critical issues within 7 days, others within 30 days

## Security Best Practices for Deployment

### Production Environment

1. **Change Default Credentials**
   - Generate new JWT secret (min 64 characters)
   - Update database passwords
   - Replace MinIO access keys
   - Use strong, unique passwords for all services

2. **Enable HTTPS/TLS**
   - Obtain valid SSL certificates
   - Configure HSTS headers
   - Disable HTTP redirects
   - Use TLS 1.2 or higher

3. **Network Security**
   - Configure firewall rules
   - Limit database access to application only
   - Use VPN for administrative access
   - Enable DDoS protection

4. **Monitoring & Logging**
   - Set up log aggregation
   - Configure security alerts
   - Monitor for unusual patterns
   - Regular log reviews

5. **Regular Maintenance**
   - Keep dependencies updated
   - Apply security patches promptly
   - Regular security assessments
   - Backup and recovery testing

### Environment Variables Security

Never commit these to version control:
- `JWT_SECRET`
- `POSTGRES_PASSWORD`
- `MINIO_ROOT_PASSWORD`
- API keys or tokens
- Database connection strings

Use secure secret management:
- Docker Secrets (production)
- Kubernetes Secrets
- AWS Secrets Manager
- Azure Key Vault
- HashiCorp Vault

### Database Security

1. **Access Control**
   - Create dedicated application user
   - Grant minimal required permissions
   - Disable default postgres user
   - Use connection pooling

2. **Network Isolation**
   - Database should not be publicly accessible
   - Use private networks/VPCs
   - Configure pg_hba.conf appropriately
   - Enable SSL connections

3. **Data Protection**
   - Encrypt sensitive data at rest
   - Regular automated backups
   - Test backup restoration
   - Implement data retention policies

### File Storage Security

1. **MinIO Configuration**
   - Use strong access credentials
   - Enable server-side encryption
   - Configure bucket policies
   - Regular access audits

2. **File Validation**
   - Never trust file extensions
   - Validate file headers/signatures
   - Scan for malware
   - Limit file sizes appropriately

## Security Monitoring

### Log Analysis

Monitor these security events:

- **Authentication Failures**: Multiple failed login attempts
- **Rate Limit Violations**: Potential DoS attempts
- **File Upload Anomalies**: Suspicious file types or sizes
- **Path Traversal Attempts**: Unauthorized file access tries
- **SQL Injection Attempts**: Malicious query patterns
- **XSS Attempts**: Script injection in inputs

### Alerting Thresholds

Set up alerts for:
- 5+ failed authentication attempts from same IP (15 minutes)
- Rate limit violations exceeding 50 requests
- File uploads containing suspicious content
- Database query errors indicating injection attempts
- Unusual file access patterns

### Incident Response

1. **Detection**: Automated monitoring and manual reports
2. **Analysis**: Determine scope and impact
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threat and vulnerabilities
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Update procedures and controls

## Compliance Considerations

This application is designed with the following compliance frameworks in mind:

- **GDPR**: Data protection and privacy controls
- **OWASP Top 10**: Web application security standards
- **SOC 2**: Security and availability controls
- **ISO 27001**: Information security management

## Security Testing

### Automated Testing

Regular automated security tests include:
- **Dependency Scanning**: npm audit for known vulnerabilities
- **SAST**: Static application security testing
- **Container Scanning**: Docker image vulnerability assessment
- **API Testing**: Automated endpoint security validation

### Manual Testing

Periodic manual security assessments:
- **Penetration Testing**: Quarterly assessments
- **Code Reviews**: Security-focused review process
- **Configuration Audits**: Infrastructure security validation
- **Social Engineering**: Employee security awareness

## Security Updates

### Dependency Management

- **Automated Updates**: Dependabot for non-breaking updates
- **Security Patches**: Immediate application of critical patches
- **Version Pinning**: Specific versions for reproducible builds
- **Vulnerability Scanning**: Regular assessment of all dependencies

### Update Process

1. **Assessment**: Evaluate security updates for impact
2. **Testing**: Validate updates in staging environment
3. **Deployment**: Gradual rollout with monitoring
4. **Verification**: Confirm security improvements
5. **Documentation**: Update security documentation

---

## 🛡️ OWASP Top 10 Protection

Our application is hardened against the OWASP Top 10 vulnerabilities:

### A01:2021 – Broken Access Control ✅
**Protection**:
- JWT-based authentication on all protected routes
- User ownership verification for all resources
- Admin-only endpoints with role checking
- Session management with secure token expiration

**Implementation**: `Backend/src/middleware/auth.js`

### A02:2021 – Cryptographic Failures ✅
**Protection**:
- bcrypt password hashing (10 rounds)
- HTTPS/TLS for data in transit
- Secure random token generation
- No sensitive data in logs or URLs

**Implementation**: `Backend/src/controllers/authController.js`

### A03:2021 – Injection ✅
**Protection**:
- Parameterized SQL queries (pg-promise)
- Joi input validation
- Command injection prevention
- Content Security Policy headers

**Implementation**: Throughout `Backend/src/routes/`

### A04:2021 – Insecure Design ✅
**Protection**:
- Defense in depth architecture
- Rate limiting on all sensitive operations
- Secure password policies
- Email verification workflow
- Admin approval system

**Implementation**: Multiple layers across application

### A05:2021 – Security Misconfiguration ✅
**Protection**:
- Security headers (Helmet.js)
- No default credentials in production
- Error handling without stack traces in production
- Disabled unnecessary features

**Implementation**: `Backend/src/index.js`

### A06:2021 – Vulnerable Components ✅
**Protection**:
- Regular dependency updates
- npm audit automated scanning
- Minimal dependency footprint
- Security patches applied promptly

**Implementation**: Automated CI/CD pipeline

### A07:2021 – Identification and Authentication Failures ✅
**Protection**:
- Strong password requirements (12+ chars)
- Rate limiting on authentication (5 attempts/15 min)
- Account lockout after multiple failures
- Secure session management

**Implementation**: `Backend/src/middleware/rateLimiter.js`

### A08:2021 – Software and Data Integrity Failures ✅
**Protection**:
- File signature verification (magic numbers)
- Content integrity checking
- Secure update mechanisms
- Code signing for deployments

**Implementation**: `Backend/src/utils/fileValidator.js`

### A09:2021 – Security Logging and Monitoring Failures ✅
**Protection**:
- Comprehensive security event logging
- Winston structured logging
- Failed authentication tracking
- Rate limit violation alerts
- File upload anomaly detection

**Implementation**: `Backend/logs/` with Winston logger

### A10:2021 – Server-Side Request Forgery (SSRF) ✅
**Protection**:
- No user-controlled URLs in backend requests
- MinIO isolated internal network
- Input validation on all endpoints
- Network segmentation

**Implementation**: Docker network isolation

---

## 📋 Security Checklist

### For Developers

#### Before Committing Code
- [ ] Run `npm audit` and address vulnerabilities
- [ ] No hardcoded secrets or API keys
- [ ] Input validation on all user inputs
- [ ] Parameterized queries for database access
- [ ] Error messages don't leak sensitive info
- [ ] Security headers configured properly
- [ ] Authentication required on protected routes
- [ ] Authorization checks for user resources

#### Before Deploying
- [ ] Update all environment variables
- [ ] Generate new JWT_SECRET
- [ ] Configure HTTPS/TLS certificates
- [ ] Set up rate limiting thresholds
- [ ] Enable security logging
- [ ] Configure firewall rules
- [ ] Review file upload restrictions
- [ ] Test email verification workflow
- [ ] Verify database migrations
- [ ] Check MinIO bucket policies

### For System Administrators

#### Initial Setup
- [ ] Change all default passwords
- [ ] Configure secure network topology
- [ ] Set up backup procedures
- [ ] Configure monitoring and alerts
- [ ] Enable audit logging
- [ ] Implement intrusion detection
- [ ] Configure DDoS protection
- [ ] Set up SSL/TLS certificates
- [ ] Configure email service (SendGrid)
- [ ] Test disaster recovery procedures

#### Regular Maintenance
- [ ] Review security logs weekly
- [ ] Update dependencies monthly
- [ ] Rotate credentials quarterly
- [ ] Security audit annually
- [ ] Penetration testing (as needed)
- [ ] Review access controls monthly
- [ ] Check for security advisories daily
- [ ] Test backups monthly

### For Users

#### Account Security
- [ ] Use strong, unique password (12+ characters)
- [ ] Verify email address promptly
- [ ] Enable two-factor authentication (if available)
- [ ] Review account activity regularly
- [ ] Log out from shared computers
- [ ] Don't share account credentials
- [ ] Report suspicious activity immediately

#### Data Security
- [ ] Only upload legitimate resume files
- [ ] Don't include sensitive information in resumes
- [ ] Download PDFs for local backup
- [ ] Delete old/unused resumes
- [ ] Review customized content before use
- [ ] Keep local copies of important resumes

---

## 🔍 Security Audit Trail

### Recent Security Enhancements (January 2025)

| Date | Enhancement | Impact |
|------|-------------|--------|
| 2025-01-14 | Dark mode implementation | Low risk - client-side only |
| 2025-01-14 | Mini-games feature | Low risk - no network/data access |
| 2024-12-15 | LaTeX PDF generation | Medium risk - command injection hardened |
| 2024-11-20 | Email verification system | High security - prevents fake accounts |
| 2024-11-10 | Admin approval workflow | High security - manual review layer |
| 2024-10-25 | Enhanced rate limiting | High security - DoS protection |
| 2024-10-15 | File validation deep scan | Critical - malware protection |

### Upcoming Security Roadmap

- [ ] **Q1 2025**: Implement two-factor authentication (2FA)
- [ ] **Q1 2025**: Add security question recovery
- [ ] **Q2 2025**: Enhanced audit logging with SIEM integration
- [ ] **Q2 2025**: Automated vulnerability scanning in CI/CD
- [ ] **Q3 2025**: Bug bounty program launch
- [ ] **Q3 2025**: SOC 2 Type II certification
- [ ] **Q4 2025**: Penetration testing by third party

---

## 📚 Security Resources

### Internal Documentation
- [Security Architecture Diagram](./docs/security-architecture.pdf)
- [Incident Response Plan](./docs/incident-response.md)
- [Security Training Materials](./docs/security-training/)

### External Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

### Tools & Libraries Used
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT authentication
- **helmet**: Security headers
- **express-rate-limit**: Rate limiting
- **joi**: Input validation
- **pg-promise**: Secure database queries
- **winston**: Security logging

---

## Contact

For security-related questions or concerns:
- **Security Email**: sudo@gauravavula.com
- **Vulnerability Reports**: Use GitHub Security Advisories
- **General Support**: Check logs in `Backend/logs/security.log`
- **Documentation**: See main [README.md](./README.md)

### Response Commitments
- **Critical vulnerabilities**: 24-hour response, 7-day patch
- **High severity**: 48-hour response, 14-day patch
- **Medium severity**: 5-day response, 30-day patch
- **Low severity**: 10-day response, 90-day patch

**Thank you for helping keep Restor and our users secure!** 🔒

---

<div align="center">

**Last Updated**: January 2025
**Version**: 1.0.x
**Maintained By**: Restor Security Team

![Security](https://img.shields.io/badge/Security-First-success?style=flat-square)
![Monitored](https://img.shields.io/badge/24/7-Monitored-blue?style=flat-square)
![Updated](https://img.shields.io/badge/Regularly-Updated-brightgreen?style=flat-square)

</div>