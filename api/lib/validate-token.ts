/**
 * CDP access token validation for server-side authentication
 * Validates user sessions from CDP Embedded Wallets
 */

import { CdpClient } from "@coinbase/cdp-sdk";

if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET) {
  throw new Error('CDP_API_KEY_ID and CDP_API_KEY_SECRET must be set');
}

const cdpClient = new CdpClient({
  apiKeyId: process.env.CDP_API_KEY_ID,
  apiKeySecret: process.env.CDP_API_KEY_SECRET,
});

/**
 * Validates a CDP access token from the client
 * @param accessToken - Access token from useGetAccessToken() hook
 * @returns Validation result with user info or error
 */
export async function validateAccessToken(accessToken: string | undefined) {
  if (!accessToken) {
    return {
      isValid: false,
      error: 'No access token provided',
      endUser: null
    };
  }

  try {
    const endUser = await cdpClient.endUser.validateAccessToken({
      accessToken,
    });

    return {
      isValid: true,
      endUser,
      error: null
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid token',
      endUser: null
    };
  }
}
