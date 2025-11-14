# Resume API Backend

Node.js API server for resume application with authentication, MinIO storage, and AI-powered resume customization.

## Features

- 🔐 User authentication with JWT
- 📄 Resume upload and parsing (PDF, DOC, DOCX)
- 🤖 AI-powered resume customization using LLM
- 📦 MinIO object storage for file management
- 🗄️ PostgreSQL database
- ⚡ Worker threads for CPU-intensive operations
- 🚀 PM2 clustering for high concurrency
- 📧 Email notifications (SendGrid/SMTP)

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- MinIO server
- LM Studio (for local LLM) or DeepSeek API key (for cloud LLM)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Initialize database:
```bash
npm run migrate
```

## Running the Server

### Development Mode (Single Instance)

```bash
npm start
# or with auto-reload
npm run dev
```

### Production Mode (PM2 Clustering)

PM2 clustering enables the server to handle multiple users concurrently by running multiple instances across all CPU cores.

#### Start Cluster

```bash
# Development
npm run pm2:start

# Production
npm run pm2:start:prod
```

#### Monitor & Manage

```bash
# Check status of all instances
npm run pm2:status

# View real-time logs
npm run pm2:logs

# Monitor CPU and memory usage
npm run pm2:monit

# Restart all instances
npm run pm2:restart

# Reload with zero-downtime (recommended for updates)
npm run pm2:reload

# Stop cluster
npm run pm2:stop

# Remove from PM2
npm run pm2:delete
```

#### Enable Auto-Start on Server Reboot

```bash
pm2 startup
pm2 save
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start server (single instance) |
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm run migrate` | Run database migrations |
| `npm run reset-db` | Reset database to initial state |
| `npm run pm2:start` | Start PM2 cluster (development) |
| `npm run pm2:start:prod` | Start PM2 cluster (production) |
| `npm run pm2:stop` | Stop PM2 cluster |
| `npm run pm2:restart` | Restart all PM2 instances |
| `npm run pm2:reload` | Zero-downtime reload |
| `npm run pm2:delete` | Remove from PM2 |
| `npm run pm2:logs` | View PM2 logs |
| `npm run pm2:monit` | Monitor PM2 processes |
| `npm run pm2:status` | Check PM2 status |

## Architecture

### Concurrency & Performance

The backend uses two complementary approaches for handling high concurrency:

1. **Worker Threads** - Offloads CPU-intensive PDF/DOCX parsing to separate threads, preventing the main event loop from blocking
2. **PM2 Clustering** - Runs multiple server instances (one per CPU core) with automatic load balancing

**Performance Benefits:**
- Handles 100+ concurrent users
- 5-10x improvement in throughput vs single instance
- Non-blocking PDF parsing
- Full CPU utilization across all cores

See [CONCURRENCY.md](./CONCURRENCY.md) for detailed documentation.

### Key Components

- **Controllers** - Request handlers for API endpoints
- **Routes** - API route definitions
- **Services** - Business logic and external integrations
- **Utils** - Helper functions and utilities
- **Workers** - Worker threads for CPU-intensive operations
- **Middleware** - Authentication, rate limiting, validation

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/resend-verification` - Resend verification email

### Resumes
- `POST /api/resumes/upload` - Upload resume file
- `POST /api/resumes/parse` - Parse resume with LLM
- `POST /api/resumes/save-parsed` - Save parsed resume data
- `GET /api/resumes` - Get all user resumes
- `GET /api/resumes/parsed` - Get parsed resumes
- `GET /api/resumes/parsed-data/:resumeId` - Get resume data
- `PUT /api/resumes/parsed-data/:resumeId` - Update resume data
- `POST /api/resumes/customize-for-job` - Customize resume for job
- `GET /api/resumes/pdf/:resumeId` - Generate PDF
- `DELETE /api/resumes/:resumeId` - Delete resume

### Jobs
- `POST /api/jobs` - Save job posting
- `GET /api/jobs` - Get saved jobs

### Rewrite
- `POST /api/rewrite/responsibility` - Rewrite responsibility using AI

### Tokens
- `GET /api/tokens/usage` - Get token usage history
- `GET /api/tokens/stats` - Get usage statistics

### Admin
- `GET /api/admin/users` - Get all users (admin only)
- `GET /api/admin/stats` - Get system statistics

### Account
- `GET /api/account/profile` - Get user profile
- `PUT /api/account/profile` - Update profile
- `PUT /api/account/password` - Change password

## Environment Variables

Required environment variables:

```env
# Server
PORT=3200
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=resume_db
DB_USER=postgres
DB_PASSWORD=your_password

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_BUCKET=resumes

# JWT
JWT_SECRET=your_jwt_secret

# LLM Provider
LLM_PROVIDER=local # 'local' or 'cloud'
LLM_API_URL=http://localhost:1234/v1
LLM_MODEL_NAME=deepseek-r1-distill-qwen-32b
DEEPSEEK_API_KEY=your_deepseek_key # if using cloud

# Email
EMAIL_PROVIDER=smtp # 'sendgrid' or 'smtp'
SENDGRID_API_KEY=your_sendgrid_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASSWORD=your_password
EMAIL_FROM=noreply@example.com
ADMIN_EMAIL=admin@example.com
```

## Database

### Initialize Database

```bash
npm run migrate
```

### Reset Database

```bash
npm run reset-db
```

## LLM Configuration

### Option 1: Local LLM (LM Studio)

1. Install [LM Studio](https://lmstudio.ai/)
2. Download a model (e.g., deepseek-r1-distill-qwen-32b)
3. Start LM Studio server
4. Set environment variables:
```env
LLM_PROVIDER=local
LLM_API_URL=http://localhost:1234/v1
LLM_MODEL_NAME=deepseek-r1-distill-qwen-32b
```

### Option 2: DeepSeek Cloud API

1. Get API key from [DeepSeek](https://platform.deepseek.com/)
2. Set environment variables:
```env
LLM_PROVIDER=cloud
DEEPSEEK_API_KEY=your_api_key
```

## Email Configuration

### Option 1: SendGrid

```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_key
EMAIL_FROM=noreply@example.com
```

### Option 2: SMTP (Gmail)

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=your_email@gmail.com
```

## Rate Limiting

The API includes built-in rate limiting:
- File uploads: 10 requests per hour per user
- Resume parsing: 10 requests per hour per user
- Resume customization: 15 requests per hour per user
- General API: 100 requests per 15 minutes per IP

## Logging

Logs are stored in:
- `logs/app.log` - Application logs
- `logs/error.log` - Error logs
- `logs/pm2-*.log` - PM2 process logs

## Troubleshooting

### Worker Pool Issues

If you see "Falling back to synchronous text extraction" in logs:
1. Check for worker crashes in error logs
2. Ensure sufficient memory is available
3. Worker threads will auto-recover

### PM2 Issues

Check PM2 status:
```bash
npm run pm2:status
```

View logs:
```bash
npm run pm2:logs
```

Restart if needed:
```bash
npm run pm2:restart
```

### Database Connection

Check database connection in logs on startup. If failed:
1. Verify PostgreSQL is running
2. Check credentials in .env
3. Ensure database exists

### MinIO Connection

If MinIO connection fails:
1. Verify MinIO server is running
2. Check credentials in .env
3. Ensure bucket exists

## Production Deployment

1. Set environment to production:
```env
NODE_ENV=production
```

2. Start with PM2:
```bash
npm run pm2:start:prod
```

3. Enable auto-start:
```bash
pm2 startup
pm2 save
```

4. Set up log rotation (recommended)
5. Configure reverse proxy (nginx/Apache)
6. Enable SSL/TLS
7. Set up monitoring

## Performance Tuning

For optimal performance:
- Use PM2 clustering in production
- Adjust `max_memory_restart` in `ecosystem.config.js` based on your server
- Monitor worker pool stats in logs
- Configure PostgreSQL connection pooling
- Use MinIO with SSD storage

## Security

- All endpoints require authentication (except health check)
- JWT tokens expire after configured time
- Passwords are hashed with bcrypt
- Rate limiting prevents abuse
- File uploads are validated
- SQL injection protection via parameterized queries
- XSS protection via helmet middleware

## Support

For issues or questions:
1. Check logs for errors
2. Review [CONCURRENCY.md](./CONCURRENCY.md) for performance issues
3. Check environment variables configuration

## License

ISC
