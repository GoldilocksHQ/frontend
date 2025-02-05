"use server";

import { google } from "googleapis";
import { sheets_v4 } from "googleapis/build/src/apis/sheets";
import { UUID } from "crypto";
import {
  createOAuth2Client,
  retrieveCredentials,
} from "../google/auth";
import { FunctionResult } from "../../services/api/connector-service";
import { OAuth2Client } from "google-auth-library";

const CONNECTOR_NAME = "google-sheets";

// Define types for function arguments and results

type FunctionArgs = {
  spreadsheetId?: string;
  range?: string;
  values?: string[][];
  sheetName?: string;
  parentFolderId?: string;
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

    const oauth2Client = await createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: credentials.credentials.access_token,
      refresh_token: credentials.credentials.refresh_token,
    });

    switch (functionName) {
      case 'readSheet': {
        if (!args.spreadsheetId || !args.range) {
          return { success: false, result: null, error: 'Spreadsheet ID and range are required' };
        }
        return await readValues(oauth2Client, args.spreadsheetId, args.range);
      }
      case 'updateSheet': {
        if (!args.spreadsheetId || !args.range || !args.values) {
          return { success: false, result: null, error: 'Spreadsheet ID, range, and values are required' };
        }
        return await updateValues(oauth2Client, args.spreadsheetId, args.range, args.values);
      }
      case 'createSheet': {
        if (!args.sheetName) {
          return { success: false, result: null, error: 'Sheet name is required' };
        }
        return await createSheet(oauth2Client, args.sheetName);
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
  oauth2Client: OAuth2Client,
  spreadsheetId: string,
  range: string
): Promise<FunctionResult<string[][] | null>> {
  try {
    const sheets = google.sheets({ version: "v4", auth: oauth2Client });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return { success: true, result: response.data.values || [], error: undefined };
  } catch (error) {
    console.error("Error reading values:", error);
    return { success: false, result: null, error: String(error) };
  }
}

export async function updateValues(
  oauth2Client: OAuth2Client,
  spreadsheetId: string,
  range: string,
  values: string[][]
): Promise<FunctionResult<sheets_v4.Schema$UpdateValuesResponse | null>> {
  try {
    const sheets = google.sheets({ version: "v4", auth: oauth2Client });
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values },
    });

    return { success: true, result: response.data, error: undefined };
  } catch (error) {
    console.error("Error updating values:", error);
    return { success: false, result: null, error: String(error) };
  }
}

export async function createSheet(
  oauth2Client: OAuth2Client,
  sheetName: string,
  parentFolderId?: string
): Promise<FunctionResult<sheets_v4.Schema$Spreadsheet>> {
  try {
    const sheets = google.sheets({ version: "v4", auth: oauth2Client });
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: sheetName },
        ...(parentFolderId ? { parents: [parentFolderId] } : {}),
      },
    });

    return { success: true, result: response.data };
  } catch (error) {
    console.error("Error creating sheet:", error);
    return { success: false, result: null, error: String(error) };
  }
}