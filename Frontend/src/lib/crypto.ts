/**
 * Cryptographic utilities for secure credential transmission
 *
 * IMPORTANT SECURITY NOTES:
 * 1. This provides an additional layer of encryption, but HTTPS is MANDATORY in production
 * 2. The encryption key is derived from a combination of session data and a public key
 * 3. The backend must have the corresponding decryption logic
 * 4. This helps prevent credentials from being logged in plain text
 */

/**
 * Generate a secure encryption key using Web Crypto API
 */
async function generateEncryptionKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('resume-creator-salt-v1'), // In production, use a random salt from server
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt credentials using AES-GCM
 */
export async function encryptCredentials(
  username: string,
  password: string
): Promise<{ encrypted: string; iv: string; timestamp: number }> {
  try {
    const enc = new TextEncoder();

    // Create a temporary key from a combination of username and timestamp
    // In production, you'd want to get a public key from the server
    const timestamp = Date.now();
    const tempKey = `${username}-${timestamp}`;

    const key = await generateEncryptionKey(tempKey);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the password
    const encryptedPassword = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(password)
    );

    // Convert to base64 for transmission
    const encryptedBase64 = btoa(
      String.fromCharCode(...new Uint8Array(encryptedPassword))
    );
    const ivBase64 = btoa(String.fromCharCode(...iv));

    return {
      encrypted: encryptedBase64,
      iv: ivBase64,
      timestamp,
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt credentials');
  }
}

/**
 * Simple Base64 encoding for credentials (less secure but simpler alternative)
 * Use this if you don't need complex encryption but want to prevent plain text in network logs
 */
export function encodeCredentials(username: string, password: string): string {
  const credentials = JSON.stringify({ username, password, t: Date.now() });
  return btoa(credentials);
}

/**
 * Decode credentials (for backend)
 */
export function decodeCredentials(encoded: string): {
  username: string;
  password: string;
  t: number;
} {
  const decoded = atob(encoded);
  return JSON.parse(decoded);
}

/**
 * Hash password using SHA-256 (one-way hash)
 * Note: This is NOT recommended for password storage (use bcrypt on backend)
 * This is only for comparing passwords client-side if needed
 */
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(password));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Secure credential preparation for login
 * Returns base64-encoded credentials to avoid plain text in network requests
 */
export function prepareSecureCredentials(
  username: string,
  password: string
): { credentials: string; timestamp: number } {
  // Simple encoding to prevent plain text exposure
  const timestamp = Date.now();
  const payload = JSON.stringify({ username, password, timestamp });

  return {
    credentials: btoa(payload),
    timestamp,
  };
}
