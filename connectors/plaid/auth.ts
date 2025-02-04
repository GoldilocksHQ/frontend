import { tokenExists } from '@/services/supabase/server';
import { updateCredentials } from '@/services/supabase/server';
import { storeCredentials } from '@/services/supabase/server';
import { UUID } from 'crypto';
import { Configuration, PlaidEnvironments, PlaidApi, LinkTokenCreateRequest, Products, CountryCode, LinkTokenCreateResponse } from 'plaid';
import { constructCredentials } from '../utils';

const PLAID_CONFIG = {
  clientId: process.env.PLAID_CLIENT_ID!,
  secret: process.env.PLAID_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/connectors/callback`,
}

export async function getAuthUrl(userId: UUID) {
  const plaidClient = await createPlaidClient();
  const linkToken = await createLinkToken(userId, plaidClient);
  return linkToken.link_token;
}

// Set up the Plaid client
async function createPlaidClient(): Promise<PlaidApi> {
  const plaidConfig = new Configuration({
    basePath: PlaidEnvironments['sandbox'],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": PLAID_CONFIG.clientId,
        "PLAID-SECRET": PLAID_CONFIG.secret,
        "Plaid-Version": "2020-09-14",
      },
    },
  });
  const plaidClient = new PlaidApi(plaidConfig);
  return plaidClient;
}

async function createLinkToken(userId: string, plaidClient: PlaidApi): Promise<LinkTokenCreateResponse> {
  const linkTokenConfig: LinkTokenCreateRequest = {
    user: { client_user_id: userId },
    client_name: "Plaid Tutorial",
    language: "en",
    products: [Products.Auth],
    country_codes: [CountryCode.Gb],
    webhook: "https://www.example.com/webhook",
  };
  const tokenResponse = await plaidClient.linkTokenCreate(linkTokenConfig as LinkTokenCreateRequest);
  const tokenData = tokenResponse.data;
  return tokenData;
}

export async function exchangeToken(userId: UUID, connectorName: string, publicToken: string): Promise<{success: boolean, error: string}> {
  const plaidClient = await createPlaidClient();
  const tokenResponse = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
  const tokenData = tokenResponse.data;

  if (tokenData != null && tokenData.access_token != null) {
    const accessToken = tokenData.access_token
    // Set expiry date to 5 year from now
    const expiryDate = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString();
    const accessCredentials = await constructCredentials(
      userId, connectorName, 'access', accessToken, new Date().toISOString(), expiryDate);

    // Store tokens. If they don't exist in database, create secret token
    const {success: accessSuccess, error: accessError} = 
      await tokenExists(accessCredentials) ? 
      await updateCredentials(accessCredentials) : 
      await storeCredentials(accessCredentials);

    if (!accessSuccess) throw new Error(String(accessError));
    return {success: true, error: ""};
  }
  return {success: false, error: "Failed to exchange token"};
}