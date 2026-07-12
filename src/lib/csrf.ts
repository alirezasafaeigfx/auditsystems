import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * CSRF Protection Utilities
 * 
 * This module provides CSRF protection for API endpoints using double-submit cookie pattern.
 * The CSRF token is generated and stored in a cookie, and must be submitted with each state-changing request.
 */

export interface CSRFProtectionOptions {
  /**
   * Secret key used to sign CSRF tokens
   * Defaults to CSRF_SECRET environment variable
   */
  secret?: string;
  
  /**
   * Token expiration time in seconds
   * Defaults to 1 hour
   */
  expiresIn?: number;
  
  /**
   * Header name to check for CSRF token
   * Defaults to 'x-csrf-token'
   */
  headerName?: string;
}

function getCsrfSecret(): string | null {
  const secret = process.env.CSRF_SECRET;
  if (!secret) return null;
  return secret;
}

const DEFAULT_CSRF_OPTIONS: Required<CSRFProtectionOptions> = {
  secret: "",
  expiresIn: 3600, // 1 hour
  headerName: "x-csrf-token"
};

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(options: CSRFProtectionOptions = {}): string {
  const secret = options.secret || getCsrfSecret();
  if (!secret) throw new Error("CSRF_SECRET is required to generate tokens");
  const opts = { ...DEFAULT_CSRF_OPTIONS, ...options, secret };
  const timestamp = Date.now();
  const randomString = randomBytes(32).toString("hex");
  
  // Create token: timestamp:randomString:signature
  const tokenData = `${timestamp}:${randomString}`;
  const signature = createHash("sha256")
    .update(tokenData + opts.secret)
    .digest("hex");
  
  return Buffer.from(`${tokenData}:${signature}`).toString("base64");
}

/**
 * Verify a CSRF token
 */
export function verifyCSRFToken(
  token: string,
  options: CSRFProtectionOptions = {}
): boolean {
  const secret = options.secret || getCsrfSecret();
  if (!secret) return false;
  const opts = { ...DEFAULT_CSRF_OPTIONS, ...options, secret };
  
  try {
    // Decode token
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    
    if (parts.length !== 3) {
      return false;
    }
    
    const [timestamp, randomString, signature] = parts;
    
    // Verify signature
    const expectedSignature = createHash("sha256")
      .update(`${timestamp}:${randomString}${opts.secret}`)
      .digest("hex");
    
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }
    if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
      return false;
    }
    
    // Check expiration
    const tokenTime = parseInt(timestamp, 10);
    const now = Date.now();
    const ageMs = now - tokenTime;
    const maxAgeMs = opts.expiresIn * 1000;
    
    if (isNaN(tokenTime) || ageMs < 0 || ageMs > maxAgeMs) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract CSRF token from request
 */
export function extractCSRFTokenFromRequest(
  request: Request,
  headerName: string = DEFAULT_CSRF_OPTIONS.headerName
): string | null {
  // Check header first
  const headerToken = request.headers.get(headerName);
  if (headerToken) {
    return headerToken;
  }
  
  // Check body if present
  try {
    const body = request.clone ? request.clone() : request;
    const contentType = body.headers.get("content-type");
    
    if (contentType?.includes("application/json")) {
      const json = body.json ? body.json() : Promise.resolve({});
      const jsonBody = typeof json === "object" ? json : {};
      
      if (jsonBody && typeof jsonBody === "object" && "csrfToken" in jsonBody) {
        return String(jsonBody.csrfToken);
      }
    }
  } catch {
    // If we can't parse the body, just return null
  }
  
  return null;
}

/**
 * Middleware to protect routes from CSRF attacks
 */
export async function csrfProtection(
  request: Request,
  options: CSRFProtectionOptions = {}
): Promise<{ valid: boolean; error?: string }> {
  const secret = options.secret || getCsrfSecret();
  
  // Skip CSRF check if no secret configured (CI/test environments)
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[SECURITY] CSRF_SECRET is not configured — rejecting request in production');
      return { valid: false, error: "CSRF protection misconfigured" };
    }
    console.warn('[SECURITY] CSRF_SECRET is not configured — CSRF protection disabled (non-production)');
    return { valid: true };
  }

  const opts = { ...DEFAULT_CSRF_OPTIONS, ...options, secret };
  
  // Skip CSRF check for GET, HEAD, OPTIONS, TRACE methods
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)) {
    return { valid: true };
  }
  
  // For state-changing methods, require CSRF token
  const token = extractCSRFTokenFromRequest(request, opts.headerName);
  
  if (!token) {
    return {
      valid: false,
      error: "CSRF token missing"
    };
  }
  
  if (!verifyCSRFToken(token, opts)) {
    return {
      valid: false,
      error: "CSRF token invalid or expired"
    };
  }
  
  return { valid: true };
}

/**
 * Generate CSRF token for use in forms
 */
export function getCSRFTokenForClient(options: CSRFProtectionOptions = {}): {
  token: string;
  headerName: string;
} {
  const opts = { ...DEFAULT_CSRF_OPTIONS, ...options };
  
  return {
    token: generateCSRFToken(opts),
    headerName: opts.headerName
  };
}