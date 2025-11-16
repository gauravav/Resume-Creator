# Backend Credential Decryption Helper

## Important: You need to implement this on your backend!

The frontend now sends encoded credentials. Here's how to decode them on your backend.

## Node.js/Express Backend Implementation

### 1. Install required package (if using complex encryption)
```bash
npm install crypto
```

### 2. Create a crypto helper file (e.g., `backend/utils/crypto.js`)

```javascript
/**
 * Decode credentials sent from frontend
 * @param {string} encoded - Base64 encoded credentials
 * @returns {Object} - { username, password, timestamp }
 */
function decodeCredentials(encoded) {
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error('Invalid credentials format');
  }
}

/**
 * Validate timestamp to prevent replay attacks
 * @param {number} timestamp - Timestamp from client
 * @param {number} maxAge - Maximum age in milliseconds (default: 5 minutes)
 * @returns {boolean}
 */
function validateTimestamp(timestamp, maxAge = 5 * 60 * 1000) {
  const now = Date.now();
  const age = now - timestamp;
  return age >= 0 && age <= maxAge;
}

module.exports = {
  decodeCredentials,
  validateTimestamp,
};
```

### 3. Update your login route (e.g., `backend/routes/auth.js`)

```javascript
const { decodeCredentials, validateTimestamp } = require('../utils/crypto');

router.post('/login', async (req, res) => {
  try {
    const { credentials, timestamp, encoded } = req.body;

    let email, password;

    if (encoded) {
      // Decode credentials if they're encoded
      const decoded = decodeCredentials(credentials);

      // Validate timestamp to prevent replay attacks
      if (!validateTimestamp(decoded.timestamp || timestamp)) {
        return res.status(400).json({
          success: false,
          message: 'Request expired. Please try again.',
        });
      }

      email = decoded.username;
      password = decoded.password;
    } else {
      // Fallback for old clients
      email = req.body.email;
      password = req.body.password;
    }

    // Continue with your normal authentication logic
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Verify password (using bcrypt or your chosen method)
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate token and send response
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});
```

### 4. Update your register route similarly

```javascript
router.post('/register', async (req, res) => {
  try {
    const { credentials, name, timestamp, encoded } = req.body;

    let email, password;

    if (encoded) {
      const decoded = decodeCredentials(credentials);

      if (!validateTimestamp(decoded.timestamp || timestamp)) {
        return res.status(400).json({
          success: false,
          message: 'Request expired. Please try again.',
        });
      }

      email = decoded.username;
      password = decoded.password;
    } else {
      email = req.body.email;
      password = req.body.password;
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name: name,
      email: email,
      password: hashedPassword,
    });

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});
```

## Python/Flask Backend Implementation

```python
import base64
import json
import time

def decode_credentials(encoded: str) -> dict:
    """Decode credentials sent from frontend"""
    try:
        decoded = base64.b64decode(encoded).decode('utf-8')
        return json.loads(decoded)
    except Exception as e:
        raise ValueError('Invalid credentials format')

def validate_timestamp(timestamp: int, max_age: int = 300000) -> bool:
    """Validate timestamp to prevent replay attacks (max_age in milliseconds)"""
    now = int(time.time() * 1000)
    age = now - timestamp
    return 0 <= age <= max_age

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()

    if data.get('encoded'):
        # Decode credentials
        decoded = decode_credentials(data['credentials'])

        # Validate timestamp
        if not validate_timestamp(decoded.get('timestamp') or data.get('timestamp')):
            return jsonify({'success': False, 'message': 'Request expired'}), 400

        email = decoded['username']
        password = decoded['password']
    else:
        email = data.get('email')
        password = data.get('password')

    # Continue with authentication logic...
```

## Security Best Practices

### 1. **Always Use HTTPS in Production**
   - This is the MOST important security measure
   - Add to your production environment:
   ```javascript
   // In your Express app
   if (process.env.NODE_ENV === 'production') {
     app.use((req, res, next) => {
       if (req.header('x-forwarded-proto') !== 'https') {
         res.redirect(`https://${req.header('host')}${req.url}`);
       } else {
         next();
       }
     });
   }
   ```

### 2. **Add Security Headers**
   ```bash
   npm install helmet
   ```

   ```javascript
   const helmet = require('helmet');
   app.use(helmet());
   ```

### 3. **Rate Limiting**
   ```bash
   npm install express-rate-limit
   ```

   ```javascript
   const rateLimit = require('express-rate-limit');

   const loginLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 5, // Limit each IP to 5 login requests per windowMs
     message: 'Too many login attempts, please try again later',
   });

   app.post('/api/auth/login', loginLimiter, async (req, res) => {
     // ... login logic
   });
   ```

### 4. **Password Storage**
   Always use bcrypt or argon2 for password hashing:
   ```javascript
   const bcrypt = require('bcrypt');
   const hashedPassword = await bcrypt.hash(password, 10);
   ```

### 5. **Environment Variables**
   Store sensitive data in `.env`:
   ```
   JWT_SECRET=your-secret-key-here
   NODE_ENV=production
   ```

## Testing

Test that credentials are no longer visible in plain text:
1. Open browser DevTools → Network tab
2. Login with credentials
3. Look at the request payload - you should see base64 encoded data instead of plain text

## Additional Security Considerations

1. **CORS Configuration**: Restrict which domains can access your API
2. **CSP Headers**: Implement Content Security Policy
3. **Input Validation**: Always validate and sanitize input on the backend
4. **SQL Injection Prevention**: Use parameterized queries or ORMs
5. **XSS Prevention**: Sanitize user input and use proper output encoding

## Need More Security?

If you need even stronger encryption (e.g., for highly sensitive applications):
1. Implement RSA public/private key encryption
2. Use TLS client certificates
3. Implement OAuth 2.0 or OpenID Connect
4. Consider using a service like Auth0 or Firebase Authentication
