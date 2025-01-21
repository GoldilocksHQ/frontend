
import { type Credentials as GoogleCredentials, OAuth2Client } from 'google-auth-library';
import { storeCredentials, getCredentials, type Credentials as SupabaseCredentials, tokenExists, updateCredentials } from '../../services/supabase/server';
import { isTokenExpired } from '@/lib/utils';
import { UUID } from 'crypto';


const GOOGLE_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/connectors/callback`,
};

const SCOPES = {
  'google-sheets': ['https://www.googleapis.com/auth/spreadsheets'],
  "google-drive": ['https://www.googleapis.com/auth/drive'],
}

export async function constructCredentials(userId: UUID, tokenName: string, tokenType: string, token?: string, createdAt?: string, expiresAt?: string): Promise<SupabaseCredentials> {
  return {
    userId: userId,
    tokenName: tokenName,
    tokenType: tokenType,
    token: token || "",
    createdAt: createdAt || new Date().toISOString(),
    expiresAt: expiresAt ? new Date().toISOString() : undefined
  };
}

export async function createOAuth2Client(): Promise<OAuth2Client> {
  return new OAuth2Client(
    GOOGLE_CONFIG.clientId,
    GOOGLE_CONFIG.clientSecret,
    GOOGLE_CONFIG.redirectUri
  );
}

export async function getAuthUrl(userId: UUID, connectorName: string): Promise<string> {
  const oauth2Client = await createOAuth2Client();
  const state = encodeURIComponent(JSON.stringify({ userId, connectorName }));
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES[connectorName as keyof typeof SCOPES],
    prompt: 'consent',
    state: state,
    include_granted_scopes: true,
  });
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleCredentials> {
  const oauth2Client = await createOAuth2Client();
  const { tokens: googleTokens } = await oauth2Client.getToken(code);
  return googleTokens;
}

// Implement a function to refresh the tokens
export async function refreshTokens(refreshToken: string): Promise<{success: boolean, credentials: GoogleCredentials | null, error: string}> {
  const oauth2Client = await createOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });
  const { credentials: newTokens } = await oauth2Client.refreshAccessToken();
  return {success: true, credentials: newTokens, error: ""};
}

export async function storeGoogleTokens(tokens: GoogleCredentials, userId: UUID, connectorName: string): Promise<{success: boolean, error: string}> {
  try { 
    // Store tokens
    const accessToken = tokens.access_token!;
    const refreshToken = tokens.refresh_token!;
    const expiryDate = new Date(tokens.expiry_date!).toISOString();    

    const accessCredentials = await constructCredentials(
      userId, connectorName, 'access', accessToken, new Date().toISOString(), expiryDate);
    const refreshCredentials = await constructCredentials(
      userId, connectorName, 'refresh', refreshToken, new Date().toISOString());

    const {success: accessSuccess, error: accessError} = 
      await tokenExists(accessCredentials) ? 
      await updateCredentials(accessCredentials) : 
      await storeCredentials(accessCredentials);

    if (!accessSuccess) throw new Error(String(accessError));
      
    const {success: refreshSuccess, error: refreshError} = 
      await tokenExists(refreshCredentials) ? 
      await updateCredentials(refreshCredentials) : 
      await storeCredentials(refreshCredentials);

    if (!refreshSuccess) throw new Error(String(refreshError));

    return {success: true, error: ""};

  } catch (error) {
    console.error('Error storing tokens:', error);
    return {success: false, error: String(error)};
  }
}

export async function retrieveCredentials(userId: UUID, tokenName: string): Promise<{success: boolean, credentials: GoogleCredentials | null, error?: string}> {
  const accessCredentials = constructCredentials(userId, tokenName, 'access');
  const { success: accessSuccess, credentials: updatedAccessCredentials, error: accessError } = await getCredentials(await accessCredentials);
  if (!accessSuccess || !updatedAccessCredentials) {
    return {success: false, credentials: null, error: accessError || "No valid credentials. User must authorize first."};
  }
  // return {success: true, credentials: updatedAccessCredentials, error: ""};

  const refreshCredentials = constructCredentials(userId, tokenName, 'refresh');
  const { success: refreshSuccess, credentials: updatedRefreshCredentials, error: refreshError } = await getCredentials(await refreshCredentials);

  if (!refreshSuccess || !updatedRefreshCredentials) {
    throw new Error(refreshError || "No valid credentials. User must authorize first.");
  }

  if (isTokenExpired(updatedAccessCredentials.expiresAt)) {
    const {success: refreshSuccess, credentials: newTokens, error: refreshError} = await refreshTokens(updatedRefreshCredentials.token);
    if (refreshSuccess) storeGoogleTokens(newTokens!, userId, tokenName);
    return {success: refreshSuccess, credentials: newTokens, error: refreshError};
  }

  return {success: true, credentials: {access_token: updatedAccessCredentials.token, refresh_token: updatedRefreshCredentials.token}, error: ""};
}
