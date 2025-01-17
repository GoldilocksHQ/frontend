import { type Credentials as GoogleCredentials, OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { sheets_v4 } from 'googleapis/build/src/apis/sheets';
import { storeCredentials, getCredentials, type Credentials as SupabaseCredentials, tokenExists, updateCredentials } from '@/services/supabase/server';
import { UUID } from 'crypto';

export function constructCredentials(userId: UUID, tokenType: string, token?: string, createdAt?: string, expiresAt?: string): SupabaseCredentials {
  return {
    userId: userId,
    tokenName: 'google-sheets',
    tokenType: tokenType,
    token: token || "",
    createdAt: createdAt || new Date().toISOString(),
    expiresAt: expiresAt ? new Date().toISOString() : undefined
  };
}

const GOOGLE_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/connectors/callback`,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
  ]
};

export function createOAuth2Client(): OAuth2Client {
  return new OAuth2Client(
    GOOGLE_CONFIG.clientId,
    GOOGLE_CONFIG.clientSecret,
    GOOGLE_CONFIG.redirectUri
  );
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleCredentials> {
  const oauth2Client = createOAuth2Client();
  const { tokens: googleTokens } = await oauth2Client.getToken(code);
  return googleTokens;
}

export async function storeGoogleTokens(tokens: GoogleCredentials, state: string): Promise<{success: boolean, error: string}> {
  try { 
    // Store tokens
    const accessToken = tokens.access_token!;
    const refreshToken = tokens.refresh_token!;
    const expiryDate = new Date(tokens.expiry_date!).toISOString();

    const decodedState = decodeURIComponent(state);
    const {userId} = JSON.parse(decodedState) as { userId: UUID };

    const accessCredentials = constructCredentials(
      userId, 'access', accessToken, new Date().toISOString(), expiryDate);
    const refreshCredentials = constructCredentials(
      userId, 'refresh', refreshToken, new Date().toISOString());


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


export function getAuthUrl(userId: UUID): string {
  const oauth2Client = createOAuth2Client();
  const state = encodeURIComponent(JSON.stringify({ userId }));
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_CONFIG.scopes,
    prompt: 'consent',
    state: state,
    include_granted_scopes: true,
  });
}

export async function readValues(
  userId: UUID, 
  spreadsheetId: string, 
  range: string
): Promise<{success: boolean, result: string[][] | null, error?: string}> {
  try {
    const accessCredentials = constructCredentials(userId, 'access');
    const { success, credentials: updatedAccessCredentials, error: accessError } = await getCredentials(accessCredentials);

    if (!success || !updatedAccessCredentials) {
      throw new Error(accessError || "No valid credentials. User must authorize first.");
    }

    const refreshCredentials = constructCredentials(userId, 'refresh');
    const { success: refreshSuccess, credentials: updatedRefreshCredentials, error: refreshError } = await getCredentials(refreshCredentials);

    if (!refreshSuccess || !updatedRefreshCredentials) {
      throw new Error(refreshError || "No valid credentials. User must authorize first.");
    }

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: updatedAccessCredentials.token,
      refresh_token: updatedRefreshCredentials.token
    });

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return {success: true, result: response.data.values || [], error: ""};
  } catch (error) {
    console.error('Error reading values:', error);
    return {success: false, result: null, error: String(error)};
  }
}

export async function updateValues(
  userId: UUID, 
  spreadsheetId: string, 
  range: string, 
  values: string[][]
): Promise<{success: boolean, result: sheets_v4.Schema$UpdateValuesResponse | null, error?: string}> {
  try {
    const accessCredentials = constructCredentials(userId, 'access');
    const { success, credentials: updatedAccessCredentials, error: accessError } = await getCredentials(accessCredentials);

    if (!success || !updatedAccessCredentials) {
      throw new Error(accessError || "No valid credentials. User must authorize first.");
    }

    const refreshCredentials = constructCredentials(userId, 'refresh');
    const { success: refreshSuccess, credentials: updatedRefreshCredentials, error: refreshError } = await getCredentials(refreshCredentials);

    if (!refreshSuccess || !updatedRefreshCredentials) {
      throw new Error(refreshError || "No valid credentials. User must authorize first.");
    }

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: updatedAccessCredentials.token,
      refresh_token: updatedRefreshCredentials.token
    });

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values }
    });

    return {success: true, result: response.data || [], error: ""};
  } catch (error) {
    console.error('Error reading values:', error);
    return {success: false, result: null, error: String(error)};
  }
}