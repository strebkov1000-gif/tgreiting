import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { AuthRequest } from './auth.js';
import { logger } from '../../utils/logger.js';

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP/user
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use IP address as key
  keyGenerator: (req: Request) => {
    return req.ip || 'unknown';
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
