"use server";

import { google } from "googleapis";
import { sheets_v4 } from "googleapis/build/src/apis/sheets";
import { getCredentials } from "../../services/supabase/server";
import { UUID } from "crypto";
import {
  constructCredentials,
  createOAuth2Client,
  retrieveCredentials,
} from "../google/auth";

const CONNECTOR_NAME = "google-sheets";

// Define types for function arguments and results
type FunctionResult<T> = {
  success: boolean;
  result: T | null;
  error?: string;
};

type FunctionArgs = {
  spreadsheetId?: string;
  range?: string;
  values?: string[][];
};

export async function handleFunction(
  userId: UUID,
  functionName: string,
  args: FunctionArgs
): Promise<FunctionResult<unknown>> {
  try {
    const credentials = await retrieveCredentials(userId, CONNECTOR_NAME);
    if (!credentials.success || !credentials.credentials) {
      return { success: false, result: null, error: credentials.error || "No valid credentials" };
    }

    switch (functionName) {
      case 'readSheet': {
        if (!args.spreadsheetId || !args.range) {
          return { success: false, result: null, error: 'Spreadsheet ID and range are required' };
        }
        return await readValues(userId, args.spreadsheetId, args.range);
      }
      case 'updateSheet': {
        if (!args.spreadsheetId || !args.range || !args.values) {
          return { success: false, result: null, error: 'Spreadsheet ID, range, and values are required' };
        }
        return await updateValues(userId, args.spreadsheetId, args.range, args.values);
      }
      default:
        return { success: false, result: null, error: `Unknown function: ${functionName}` };
    }
  } catch (error) {
    console.error(`Error executing ${functionName}:`, error);
    return { success: false, result: null, error: String(error) };
  }
}

export async function readValues(
  userId: UUID,
  spreadsheetId: string,
  range: string
): Promise<FunctionResult<string[][]>> {
  try {
    const credentials = await retrieveCredentials(userId, CONNECTOR_NAME);
    if (!credentials.success || !credentials.credentials) {
      return { success: false, result: null, error: credentials.error || "No valid credentials" };
    }

    const oauth2Client = await createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: credentials.credentials.access_token,
      refresh_token: credentials.credentials.refresh_token,
    });

    const sheets = google.sheets({ version: "v4", auth: oauth2Client });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return { success: true, result: response.data.values || [] };
  } catch (error) {
    console.error("Error reading values:", error);
    return { success: false, result: null, error: String(error) };
  }
}

export async function updateValues(
  userId: UUID,
  spreadsheetId: string,
  range: string,
  values: string[][]
): Promise<FunctionResult<sheets_v4.Schema$UpdateValuesResponse>> {
  try {
    const accessCredentials = constructCredentials(
      userId,
      CONNECTOR_NAME,
      "access"
    );
    const {
      success,
      credentials: updatedAccessCredentials,
      error: accessError,
    } = await getCredentials(await accessCredentials);

    if (!success || !updatedAccessCredentials) {
      throw new Error(
        accessError || "No valid credentials. User must authorize first."
      );
    }

    const refreshCredentials = constructCredentials(
      userId,
      CONNECTOR_NAME,
      "refresh"
    );
    const {
      success: refreshSuccess,
      credentials: updatedRefreshCredentials,
      error: refreshError,
    } = await getCredentials(await refreshCredentials);

    if (!refreshSuccess || !updatedRefreshCredentials) {
      throw new Error(
        refreshError || "No valid credentials. User must authorize first."
      );
    }

    const oauth2Client = await createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: updatedAccessCredentials.token,
      refresh_token: updatedRefreshCredentials.token,
    });

    const sheets = google.sheets({ version: "v4", auth: oauth2Client });
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values },
    });

    return { success: true, result: response.data };
  } catch (error) {
    console.error("Error updating values:", error);
    return { success: false, result: null, error: String(error) };
  }
}
