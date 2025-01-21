"use server"

import { google } from 'googleapis';
import { sheets_v4 } from 'googleapis/build/src/apis/sheets';
import { getCredentials } from '../../services/supabase/server';
import { UUID } from 'crypto';
import { constructCredentials, createOAuth2Client, retrieveCredentials } from '../google/auth';

const CONNECTOR_NAME = 'google-sheets';

export async function readValues(
  userId: UUID, 
  spreadsheetId: string, 
  range: string
): Promise<{success: boolean, result: string[][] | null, error?: string}> {
  try {
    const {success, credentials, error} = await retrieveCredentials(userId, CONNECTOR_NAME);
    if (!success || !credentials) {
      throw new Error(error || "No valid credentials. User must authorize first.");
    }

    const oauth2Client = await createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token
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
    const accessCredentials = constructCredentials(userId, CONNECTOR_NAME, 'access');
    const { success, credentials: updatedAccessCredentials, error: accessError } = await getCredentials(await accessCredentials);

    if (!success || !updatedAccessCredentials) {
      throw new Error(accessError || "No valid credentials. User must authorize first.");
    }

    const refreshCredentials = constructCredentials(userId, CONNECTOR_NAME, 'refresh');
    const { success: refreshSuccess, credentials: updatedRefreshCredentials, error: refreshError } = await getCredentials(await refreshCredentials);

    if (!refreshSuccess || !updatedRefreshCredentials) {
      throw new Error(refreshError || "No valid credentials. User must authorize first.");
    }

    const oauth2Client = await createOAuth2Client();
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