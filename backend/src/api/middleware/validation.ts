import { z, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

/**
 * Validation middleware factory
 * Creates middleware that validates request params/query/body against Zod schema
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Validation error:', {
          path: req.path,
          errors: error.errors
        });

        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request parameters',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        logger.error('Unexpected validation error:', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Validation failed'
        });
      }
    }
  };
}

/**
 * Common validation schemas
 */
export const schemas = {
  /**
   * Pagination schema
   * Query params: limit (1-100, default 20), offset (0+, default 0)
   */
  pagination: z.object({
    query: z.object({
      limit: z.coerce.number().int().min(1).max(100).default(20),
      offset: z.coerce.number().int().min(0).default(0)
    })
  }),

  /**
   * Telegram ID param schema
   * Params: telegramId (bigint string)
   */
  telegramId: z.object({
    params: z.object({
      telegramId: z.string().regex(/^\d+$/, 'Invalid Telegram ID format')
    })
  }),

  /**
   * User ID param schema
   * Params: userId (UUID string)
   */
  userId: z.object({
    params: z.object({
      userId: z.string().uuid('Invalid user ID format')
    })
  }),

  /**
   * Referral code param schema
   * Params: code (string, 10-50 chars)
   */
  referralCode: z.object({
    params: z.object({
      code: z.string().min(10).max(50)
    })
  }),

  /**
   * Search query schema
   * Query: query (string, 1-100 chars), limit (optional, default 10)
   */
  search: z.object({
    query: z.object({
      query: z.string().min(1).max(100),
      limit: z.coerce.number().int().min(1).max(50).default(10)
    })
  }),

  /**
   * TON wallet proof schema
   * Body: proof object with address, proof.timestamp, proof.domain, proof.signature, proof.payload
   */
  tonProof: z.object({
    body: z.object({
      proof: z.object({
        address: z.string().min(1),
        proof: z.object({
          timestamp: z.number().int(),
          domain: z.object({
            lengthBytes: z.number().int(),
            value: z.string()
          }),
          signature: z.string(),
          payload: z.string(),
          stateInit: z.string().optional()
        })
      })
    })
  }),

  /**
   * NFT collection ID schema
   */
  nftCollectionId: z.object({
    params: z.object({
      collectionId: z.string().uuid()
    })
  })
};
