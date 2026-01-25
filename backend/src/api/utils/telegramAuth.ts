import crypto from 'crypto';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export interface TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/**
 * Validate Telegram WebApp initData
 *
 * Telegram WebApp sends initData as URLSearchParams with HMAC signature
 * We need to verify the signature to ensure data authenticity
 *
 * Algorithm:
 * 1. Parse initData as URLSearchParams
 * 2. Extract hash parameter
 * 3. Create data-check-string from remaining params (sorted alphabetically)
 * 4. Generate secret key: HMAC-SHA256('WebAppData', BOT_TOKEN)
 * 5. Calculate hash: HMAC-SHA256(data-check-string, secret_key)
 * 6. Compare calculated hash with provided hash
 * 7. Check auth_date (not older than 24 hours)
 */
export function validateTelegramWebAppData(initData: string): TelegramUserData | null {
  try {
    // Parse initData as URLSearchParams
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');

    if (!hash) {
      logger.warn('Telegram auth: missing hash');
      return null;
    }

    // Remove hash from params
    params.delete('hash');

    // Create data-check-string (sorted alphabetically)
    const dataCheckArr: string[] = [];
    params.forEach((value, key) => {
      dataCheckArr.push(`${key}=${value}`);
    });
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');

    // Generate secret key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(config.bot.token)
      .digest();

    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Verify hash
    if (calculatedHash !== hash) {
      logger.warn('Telegram auth: invalid hash', {
        expected: calculatedHash.slice(0, 10),
        received: hash.slice(0, 10)
      });
      return null;
    }

    // Parse user data
    const userParam = params.get('user');
    if (!userParam) {
      logger.warn('Telegram auth: missing user parameter');
      return null;
    }

    const userData = JSON.parse(userParam);

    // Check auth_date (not older than 24 hours)
    const authDate = parseInt(params.get('auth_date') || '0');
    const now = Math.floor(Date.now() / 1000);

    if (now - authDate > 86400) {
      logger.warn('Telegram auth: auth_date too old', {
        authDate,
        now,
        diff: now - authDate
      });
      return null;
    }

    logger.debug('Telegram auth: validation successful', {
      userId: userData.id,
      username: userData.username
    });

    return {
      id: userData.id,
      first_name: userData.first_name,
      last_name: userData.last_name,
      username: userData.username,
      photo_url: userData.photo_url,
      auth_date: authDate,
      hash
    };
  } catch (error) {
    logger.error('Telegram auth validation error:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Extract user ID from Telegram initData without full validation
 * Useful for logging/debugging
 */
export function extractTelegramUserId(initData: string): number | null {
  try {
    const params = new URLSearchParams(initData);
    const userParam = params.get('user');

    if (!userParam) {
      return null;
    }

    const userData = JSON.parse(userParam);
    return userData.id || null;
  } catch {
    return null;
  }
}

/**
 * Check if initData is expired (> 24 hours old)
 */
export function isInitDataExpired(initData: string): boolean {
  try {
    const params = new URLSearchParams(initData);
    const authDate = parseInt(params.get('auth_date') || '0');
    const now = Math.floor(Date.now() / 1000);

    return now - authDate > 86400;
  } catch {
    return true;
  }
}
