"use server"

import { google } from 'googleapis';
import { drive_v3 } from 'googleapis/build/src/apis/drive';
import { UUID } from 'crypto';
import { createOAuth2Client, retrieveCredentials } from '../google/auth';

const CONNECTOR_NAME = 'google-drive';

// Define types for function arguments and results
type FunctionResult<T> = {
  success: boolean;
  result: T | null;
  error?: string;
};

type FunctionArgs = {
  query?: string;
  pageSize?: number;
  pageToken?: string;
  folderName?: string;
  parentFolderId?: string;
  fileName?: string;
  content?: string;
  mimeType?: string;
  fileId?: string;
};

// Main function handler that routes to specific functions
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
      case 'listFiles': {
        if (!args.query) {
          return {success: false, result: null, error: 'Query parameter is required'};
        }
        return await listFiles(userId, args.query, args.pageSize, args.pageToken);
      }
      case 'createFolder': {
        if (!args.folderName) {
          return {success: false, result: null, error: 'Folder name is required'};
        }
        return await createFolder(userId, args.folderName, args.parentFolderId);
      }
      case 'uploadFile': {
        if (!args.fileName || !args.content || !args.mimeType) {
          return {success: false, result: null, error: 'File name, content and mime type are required'};
        }
        return await uploadFile(userId, args.fileName, args.content, args.mimeType, args.parentFolderId);
      }
      case 'readFile': {
        if (!args.fileId) {
          return {success: false, result: null, error: 'File ID is required'};
        }
        return await readFile(userId, args.fileId);
      }
      case 'updateFile': {
        if (!args.fileId || !args.content || !args.mimeType) {
          return {success: false, result: null, error: 'File ID, content and mime type are required'};
        }
        return await updateFile(userId, args.fileId, args.content, args.mimeType);
      }
      case 'deleteFile': {
        if (!args.fileId) {
          return {success: false, result: null, error: 'File ID is required'};
        }
        return await deleteFile(userId, args.fileId);
      }
      default:
        return {success: false, result: null, error: `Unknown function: ${functionName}`};
    }
  } catch (error) {
    console.error(`Error executing ${functionName}:`, error);
    return {success: false, result: null, error: String(error)};
  }
}

// List files and folders
async function listFiles(
  userId: UUID,
  query: string,
  pageSize?: number,
  pageToken?: string
): Promise<FunctionResult<drive_v3.Schema$FileList>> {
  try {
    const credentials = await retrieveCredentials(userId, CONNECTOR_NAME);
    if (!credentials.success || !credentials.credentials) {
      return { success: false, result: null, error: credentials.error || "No valid credentials" };
    }

    const auth = await createOAuth2Client();
    auth.setCredentials({
      access_token: credentials.credentials.access_token,
      refresh_token: credentials.credentials.refresh_token
    });

    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      q: query,
      pageSize: pageSize || 10,
      pageToken: pageToken || undefined,
      fields: 'nextPageToken, files(id, name, mimeType, createdTime, modifiedTime)',
    });

    return { success: true, result: response.data };
  } catch (error) {
    console.error('Error listing files:', error);
    return { success: false, result: null, error: String(error) };
  }
}

// Create a new folder
async function createFolder(
  userId: UUID,
  folderName: string,
  parentFolderId?: string
): Promise<FunctionResult<drive_v3.Schema$File>> {
  try {
    const credentials = await retrieveCredentials(userId, CONNECTOR_NAME);
    if (!credentials.success || !credentials.credentials) {
      return { success: false, result: null, error: credentials.error || "No valid credentials" };
    }

    const auth = await createOAuth2Client();
    auth.setCredentials({
      access_token: credentials.credentials.access_token,
      refresh_token: credentials.credentials.refresh_token
    });

    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name, mimeType',
    });

    return { success: true, result: response.data };
  } catch (error) {
    console.error('Error creating folder:', error);
    return { success: false, result: null, error: String(error) };
  }
}

// Upload a file
async function uploadFile(
  userId: UUID,
  fileName: string,
  content: string,
  mimeType: string,
  parentFolderId?: string
): Promise<FunctionResult<drive_v3.Schema$File>> {
  try {
    const credentials = await retrieveCredentials(userId, CONNECTOR_NAME);
    if (!credentials.success || !credentials.credentials) {
      return { success: false, result: null, error: credentials.error || "No valid credentials" };
    }

    const auth = await createOAuth2Client();
    auth.setCredentials({
      access_token: credentials.credentials.access_token,
      refresh_token: credentials.credentials.refresh_token
    });

    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
      name: fileName,
      parents: parentFolderId ? [parentFolderId] : undefined,
    };

    const media = {
      mimeType: mimeType,
      body: content,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, mimeType',
    });

    return { success: true, result: response.data };
  } catch (error) {
    console.error('Error uploading file:', error);
    return { success: false, result: null, error: String(error) };
  }
}

// Read file content
async function readFile(
  userId: UUID,
  fileId: string
): Promise<FunctionResult<string>> {
  try {
    const credentials = await retrieveCredentials(userId, CONNECTOR_NAME);
    if (!credentials.success || !credentials.credentials) {
      return { success: false, result: null, error: credentials.error || "No valid credentials" };
    }

    const auth = await createOAuth2Client();
    auth.setCredentials({
      access_token: credentials.credentials.access_token,
      refresh_token: credentials.credentials.refresh_token
    });

    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media',
    });

    return { success: true, result: typeof response.data === 'string' ? response.data : JSON.stringify(response.data) };
  } catch (error) {
    console.error('Error reading file:', error);
    return { success: false, result: null, error: String(error) };
  }
}

// Update file content
async function updateFile(
  userId: UUID,
  fileId: string,
  content: string,
  mimeType: string
): Promise<FunctionResult<drive_v3.Schema$File>> {
  try {
    const credentials = await retrieveCredentials(userId, CONNECTOR_NAME);
    if (!credentials.success || !credentials.credentials) {
      return { success: false, result: null, error: credentials.error || "No valid credentials" };
    }

    const auth = await createOAuth2Client();
    auth.setCredentials({
      access_token: credentials.credentials.access_token,
      refresh_token: credentials.credentials.refresh_token
    });

    const drive = google.drive({ version: 'v3', auth });

    const media = {
      mimeType: mimeType,
      body: content,
    };

    const response = await drive.files.update({
      fileId: fileId,
      media: media,
      fields: 'id, name, mimeType',
    });

    return { success: true, result: response.data };
  } catch (error) {
    console.error('Error updating file:', error);
    return { success: false, result: null, error: String(error) };
  }
}

// Delete file or folder
async function deleteFile(
  userId: UUID,
  fileId: string
): Promise<FunctionResult<boolean>> {
  try {
    const credentials = await retrieveCredentials(userId, CONNECTOR_NAME);
    if (!credentials.success || !credentials.credentials) {
      return { success: false, result: null, error: credentials.error || "No valid credentials" };
    }

    const auth = await createOAuth2Client();
    auth.setCredentials({
      access_token: credentials.credentials.access_token,
      refresh_token: credentials.credentials.refresh_token
    });

    const drive = google.drive({ version: 'v3', auth });

    await drive.files.delete({
      fileId: fileId,
    });

    return { success: true, result: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, result: null, error: String(error) };
  }
}


