import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { AuthRequest } from './auth.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';
import { config } from '../../config/index.js';

/**
 * Securely validate and extract Telegram user ID from init data
 * Only returns user ID if HMAC signature is valid
 */
function getValidatedTelegramUserId(authHeader: string): string | null {
  if (!authHeader?.startsWith('tma ')) return null;

  try {
    const initData = authHeader.slice(4);
    const params = new URLSearchParams(initData);

    // Verify HMAC signature first
    const hash = params.get('hash');
    if (!hash) return null;

    // Build data check string (sorted params without hash)
    const checkParams = new URLSearchParams(params);
    checkParams.delete('hash');
    const sortedParams = Array.from(checkParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Validate signature
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(config.bot.token)
      .digest();

    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(sortedParams)
      .digest('hex');

    if (hash !== expectedHash) return null;

    // Check auth_date (not older than 5 minutes for rate limiting)
    const authDate = parseInt(params.get('auth_date') || '0');
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 300) return null; // 5 minutes

    // Extract user ID
    const userStr = params.get('user');
    if (userStr) {
      const user = JSON.parse(decodeURIComponent(userStr));
      if (user.id) return String(user.id);
    }
  } catch {
    // Invalid data
  }
  return null;
}

/**
 * General API rate limiter
 * 200 requests per 15 minutes per IP + validated telegramId
 * SECURITY: Only uses telegramId after HMAC validation to prevent spoofing
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use validated telegramId + IP combo for better rate limiting
  keyGenerator: (req: Request) => {
    const ip = req.ip || 'unknown';
    const authHeader = req.headers.authorization;

    // Only use Telegram ID if signature is valid (prevents spoofing)
    const validatedUserId = authHeader ? getValidatedTelegramUserId(authHeader) : null;

    if (validatedUserId) {
      // Combine IP and user ID for better tracking
      return `${ip}:tg:${validatedUserId}`;
    }
    return ip;
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

/**
 * Leaderboard-specific rate limiter (more permissive for read-only operations)
 * 300 requests per 15 minutes - leaderboard is read-only and heavily accessed
 * SECURITY: Uses validated telegramId to prevent rate limit bypass
 */
export const leaderboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: {
    error: 'Too Many Requests',
    message: 'Too many leaderboard requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const ip = req.ip || 'unknown';
    const authHeader = req.headers.authorization;
    const validatedUserId = authHeader ? getValidatedTelegramUserId(authHeader) : null;

    if (validatedUserId) {
      return `${ip}:tg:${validatedUserId}`;
    }
    return ip;
  },
  handler: (req, res) => {
    logger.warn('Leaderboard rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Leaderboard rate limit exceeded. Please try again later.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

/**
 * NFT scan rate limiter
 * 10 scans per hour per user
 * This is more restrictive because NFT scanning is expensive
 */
export const nftScanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'Rate Limit Exceeded',
    message: 'NFT scan limit exceeded. You can scan up to 10 times per hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use user ID if authenticated, otherwise IP
  keyGenerator: (req: AuthRequest) => {
    return req.user?.userId || req.ip || 'unknown';
  },
  handler: (req, res) => {
    logger.warn('NFT scan rate limit exceeded', {
      userId: (req as AuthRequest).user?.userId,
      ip: req.ip
    });

    res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'NFT scan limit exceeded. You can scan up to 10 times per hour.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  },
  skip: (req) => {
    // Skip rate limit for OPTIONS requests (CORS preflight)
    return req.method === 'OPTIONS';
  }
});

/**
 * Authentication rate limiter
 * Prevents brute force attacks
 * 20 attempts per 5 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.ip || 'unknown';
  },
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many authentication attempts. Please try again later.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

/**
 * Strict rate limiter for sensitive operations
 * 5 requests per 10 minutes per user
 */
export const strictLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: {
    error: 'Rate Limit Exceeded',
    message: 'Too many requests. Please wait before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: AuthRequest) => {
    return req.user?.userId || req.ip || 'unknown';
  },
  handler: (req, res) => {
    logger.warn('Strict rate limit exceeded', {
      userId: (req as AuthRequest).user?.userId,
      ip: req.ip,
      path: req.path
    });

    res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests. Please wait 10 minutes before trying again.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});
