const os = require('os');

/**
 * Get the dynamic frontend URL based on the server environment
 * @param {Object} req - Express request object (optional)
 * @returns {string} The appropriate frontend URL
 */
function getFrontendUrl(req = null) {
  // If FRONTEND_URL is explicitly set in environment, use it
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }

  // Try to get origin from request headers (most reliable)
  if (req) {
    const origin = req.get('origin') || req.get('referer');
    if (origin) {
      // Extract base URL from origin/referer
      try {
        const url = new URL(origin);
        return `${url.protocol}//${url.hostname}:3000`;
      } catch (e) {
        // If URL parsing fails, continue to next method
      }
    }

    // Try to get host from request
    const host = req.get('host');
    if (host) {
      const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';

      // If request is from localhost, use localhost for frontend
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return 'http://localhost:3000';
      }

      // If request has a specific IP/domain, use it with frontend port
      const backendPort = process.env.PORT || 3200;
      const frontendPort = 3000;
      const baseHost = host.split(':')[0]; // Get hostname without port

      return `${protocol}://${baseHost}:${frontendPort}`;
    }
  }

  // Fallback: detect if we're running locally or on a server
  const networkInterfaces = os.networkInterfaces();
  const hasLocalhost = process.env.DB_HOST === 'localhost' ||
                      process.env.MINIO_ENDPOINT === 'localhost' ||
                      process.env.NODE_ENV === 'development';

  if (hasLocalhost) {
    return 'http://localhost:3000';
  }

  // Get the first non-localhost IPv4 address
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return `http://${net.address}:3000`;
      }
    }
  }

  // Ultimate fallback
  return 'http://localhost:3000';
}

/**
 * Get the dynamic backend URL based on the server environment
 * @param {Object} req - Express request object (optional)
 * @returns {string} The appropriate backend URL
 */
function getBackendUrl(req = null) {
  // If BACKEND_URL is explicitly set in environment, use it
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }

  // Try to get host from request if available
  if (req && req.get('host')) {
    const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const host = req.get('host');
    return `${protocol}://${host}`;
  }

  const port = process.env.PORT || 3200;

  // Fallback: detect if we're running locally or on a server
  const hasLocalhost = process.env.DB_HOST === 'localhost' || 
                      process.env.MINIO_ENDPOINT === 'localhost' ||
                      process.env.NODE_ENV === 'development';

  if (hasLocalhost) {
    return `http://localhost:${port}`;
  }

  // Get the first non-localhost IPv4 address
  const networkInterfaces = os.networkInterfaces();
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return `http://${net.address}:${port}`;
      }
    }
  }

  // Ultimate fallback
  return `http://localhost:${port}`;
}

module.exports = {
  getFrontendUrl,
  getBackendUrl
};