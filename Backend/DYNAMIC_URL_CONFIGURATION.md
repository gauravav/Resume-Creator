# Dynamic URL Configuration Guide

This guide explains how the Resume Creator automatically detects and uses the correct URLs for email verification links and other features.

---

## Overview

The application **automatically detects** whether you're running locally or on a server and generates the appropriate URLs for:
- Email verification links
- Password reset links
- Admin notifications
- API responses

**No manual configuration needed** in most cases!

---

## How It Works

### Priority Order (getFrontendUrl)

The system checks for URLs in this order:

1. **Environment Variable** (if explicitly set)
   ```env
   FRONTEND_URL=http://your-domain.com
   ```

2. **Request Origin Header** (most reliable)
   - Checks `Origin` header from the HTTP request
   - Checks `Referer` header as fallback
   - Extracts the protocol and hostname
   - Example: `http://192.168.1.100:3000`

3. **Request Host Header**
   - Uses the `Host` header from the request
   - Determines protocol (http/https)
   - Replaces backend port with frontend port (3000)
   - Example: Request to `192.168.1.100:3200` → Frontend `http://192.168.1.100:3000`

4. **Environment Detection**
   - Checks if running in development mode
   - Checks if services (DB, MinIO) are on localhost
   - If local: returns `http://localhost:3000`
   - If server: detects network IP address

5. **Network Interface Detection**
   - Scans network interfaces for IPv4 addresses
   - Finds first non-localhost IP
   - Example: `http://192.168.1.100:3000`

6. **Ultimate Fallback**
   - Returns `http://localhost:3000`

---

## Usage Examples

### Example 1: Local Development

**Scenario:** Running on your laptop

**Configuration:** No special configuration needed

**Backend runs at:** `http://localhost:3200`

**Detection Result:**
- Email verification links use: `http://localhost:3000/verify-email?token=...`
- All requests stay on localhost

**Why:** System detects `NODE_ENV=development` or localhost DB/MinIO

---

### Example 2: Local Network Server

**Scenario:** Backend running on a Raspberry Pi at `192.168.1.100`

**Configuration:**
```env
# Option 1: Let it auto-detect (recommended)
# Comment out or remove FRONTEND_URL

# Option 2: Set explicitly
FRONTEND_URL=http://192.168.1.100:3000
```

**Backend runs at:** `http://192.168.1.100:3200`

**Detection Result:**
- Email verification links use: `http://192.168.1.100:3000/verify-email?token=...`
- Users on the network can access the app

**Why:** System detects network IP from request or scans network interfaces

---

### Example 3: Production with Domain

**Scenario:** Deployed on a server with custom domain

**Configuration:**
```env
FRONTEND_URL=https://resume.example.com
BACKEND_URL=https://api.resume.example.com
```

**Detection Result:**
- Email verification links use: `https://resume.example.com/verify-email?token=...`
- Uses HTTPS with your domain

**Why:** Environment variables explicitly set, highest priority

---

## Testing Dynamic URL Detection

### Test 1: Check What URL is Being Used

Start the backend and watch the logs when sending a verification email:

```bash
cd Backend
npm run dev
```

Register a new user and look for:
```
[INFO] Verification email sent {
  service: 'mailjet',
  to: 'user@example.com',
  messageId: '...'
}
```

The email will contain the detected URL in the verification link.

---

### Test 2: Manual URL Detection Test

Create a test file `test-url.js`:

```javascript
const { getFrontendUrl } = require('./src/utils/urlUtils');

// Test without request
console.log('Without request:', getFrontendUrl());

// Test with mock request (localhost)
const mockReqLocal = {
  get: (header) => {
    if (header === 'host') return 'localhost:3200';
    return null;
  }
};
console.log('With localhost request:', getFrontendUrl(mockReqLocal));

// Test with mock request (network)
const mockReqNetwork = {
  get: (header) => {
    if (header === 'host') return '192.168.1.100:3200';
    if (header === 'origin') return 'http://192.168.1.100:3000';
    return null;
  }
};
console.log('With network request:', getFrontendUrl(mockReqNetwork));
```

Run it:
```bash
node test-url.js
```

Expected output:
```
Without request: http://localhost:3000
With localhost request: http://localhost:3000
With network request: http://192.168.1.100:3000
```

---

## Configuration Options

### Option 1: Automatic Detection (Recommended)

**Best for:** Most users, local development, simple network setups

**Configuration:**
```env
# Comment out or remove these lines:
# FRONTEND_URL=http://localhost:3000
# BACKEND_URL=http://localhost:3200
```

**Pros:**
- ✅ Zero configuration
- ✅ Works on localhost and network automatically
- ✅ Adapts to request context

**Cons:**
- ⚠️ Might not work with complex proxy setups
- ⚠️ Requires proper HTTP headers

---

### Option 2: Explicit Configuration

**Best for:** Production, custom domains, reverse proxies

**Configuration:**
```env
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com
```

**Pros:**
- ✅ Total control over URLs
- ✅ Works with any setup
- ✅ Predictable behavior

**Cons:**
- ⚠️ Requires manual configuration
- ⚠️ Needs update when changing environments

---

### Option 3: Hybrid Approach

**Best for:** Development teams, multiple environments

**Configuration:**

**Development `.env`:**
```env
# Auto-detect for local development
# FRONTEND_URL commented out
```

**Production `.env`:**
```env
FRONTEND_URL=https://resume.example.com
BACKEND_URL=https://api.resume.example.com
```

---

## Common Scenarios

### Scenario: Email Links Go to Localhost but Should Use Network IP

**Problem:** Running on `192.168.1.100` but emails link to `localhost:3000`

**Solution 1:** Comment out `FRONTEND_URL` in `.env`:
```env
# FRONTEND_URL=http://localhost:3000  # Comment this out
```

**Solution 2:** Set it explicitly:
```env
FRONTEND_URL=http://192.168.1.100:3000
```

---

### Scenario: Email Links Go to Network IP but Should Use Localhost

**Problem:** Running locally but emails use `192.168.x.x`

**Solution:** Set explicitly in `.env`:
```env
FRONTEND_URL=http://localhost:3000
```

---

### Scenario: Using Reverse Proxy (nginx, Apache)

**Problem:** Backend is behind a proxy, URLs are incorrect

**Solution 1:** Set `X-Forwarded-Proto` and `X-Forwarded-Host` headers in your proxy:

**nginx config:**
```nginx
location /api {
    proxy_pass http://localhost:3200;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header Host $host;
}
```

**Solution 2:** Set URLs explicitly in `.env`:
```env
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://your-domain.com/api
```

---

### Scenario: Docker Containers

**Problem:** Backend in Docker, URLs don't match host machine

**Solution:** Pass environment variables to container:

**docker-compose.yml:**
```yaml
services:
  backend:
    environment:
      - FRONTEND_URL=http://192.168.1.100:3000
      - BACKEND_URL=http://192.168.1.100:3200
```

**Or** use host network mode:
```yaml
services:
  backend:
    network_mode: "host"
```

---

## Environment Variables Reference

| Variable | Purpose | Default | Required |
|----------|---------|---------|----------|
| `FRONTEND_URL` | Frontend application URL | Auto-detected | No |
| `BACKEND_URL` | Backend API URL | Auto-detected | No |
| `PORT` | Backend server port | 3200 | No |

---

## Code Reference

**Main File:** `Backend/src/utils/urlUtils.js`

**Key Functions:**
- `getFrontendUrl(req)` - Detects frontend URL
- `getBackendUrl(req)` - Detects backend URL

**Used In:**
- Email verification links (`sendVerificationEmail`)
- Password reset links
- Admin notifications
- Approval/rejection emails

---

## Troubleshooting

### Issue: Email Links are Wrong

**Debug Steps:**

1. **Check environment variables:**
   ```bash
   grep FRONTEND_URL Backend/.env
   ```

2. **Check server logs:**
   ```bash
   cd Backend
   npm run dev | grep -i "frontend\|url"
   ```

3. **Test URL detection:**
   ```javascript
   const { getFrontendUrl } = require('./src/utils/urlUtils');
   console.log(getFrontendUrl());
   ```

4. **Check request headers:**
   ```javascript
   // In authController.js, add logging:
   console.log('Request headers:', {
     host: req.get('host'),
     origin: req.get('origin'),
     referer: req.get('referer')
   });
   ```

---

### Issue: Works on Localhost, Fails on Network

**Possible Causes:**
- `FRONTEND_URL` is hardcoded to `localhost` in `.env`
- Firewall blocking port 3000
- Frontend not running on network interface

**Solutions:**
1. Comment out `FRONTEND_URL` in `.env`
2. Or set it to network IP: `FRONTEND_URL=http://192.168.1.100:3000`
3. Check firewall: `sudo ufw status`
4. Check if frontend is accessible: `curl http://192.168.1.100:3000`

---

### Issue: HTTPS Not Working

**Problem:** Links use `http` instead of `https`

**Solution 1:** Set protocol explicitly:
```env
FRONTEND_URL=https://your-domain.com
```

**Solution 2:** Ensure proxy passes correct headers:
```nginx
proxy_set_header X-Forwarded-Proto https;
```

---

## Best Practices

1. **Development:**
   - ✅ Comment out `FRONTEND_URL` and `BACKEND_URL`
   - ✅ Let auto-detection work
   - ✅ Use `http://localhost:3000`

2. **Testing on Network:**
   - ✅ Comment out `FRONTEND_URL`
   - ✅ Or set to network IP explicitly
   - ✅ Ensure frontend is accessible on network

3. **Production:**
   - ✅ Always set `FRONTEND_URL` and `BACKEND_URL` explicitly
   - ✅ Use HTTPS
   - ✅ Use custom domain names
   - ✅ Test email links before going live

4. **Docker/Containers:**
   - ✅ Pass URLs as environment variables
   - ✅ Use host network mode for local development
   - ✅ Use bridge mode with explicit URLs for production

---

## Summary

✅ **Automatic detection** works for most cases
✅ **Request headers** are the most reliable source
✅ **Environment variables** override everything
✅ **Network IP detection** works as fallback
✅ **Explicit configuration** recommended for production

Your email verification links now work automatically on both localhost and network! 🎉
