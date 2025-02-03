"use server";

import { google } from "googleapis";
import { UUID } from "crypto";
import { createOAuth2Client, retrieveCredentials } from '../google/auth';
import { FunctionResult } from "../../services/api/connector-service";

const CONNECTOR_NAME = 'google-docs';

// Define types for function arguments and results
type FunctionArgs = {
  documentId?: string;
  content?: string;
  title?: string;
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

    switch (functionName) {
      case 'readDocument': {
        if (!args.documentId) {
          return { success: false, result: null, error: 'Document ID is required' };
        }
        return await readDocument(userId, args.documentId);
      }
      case 'editDocument': {
        if (!args.documentId) {
          return { success: false, result: null, error: 'Document ID is required' };
        }
        return await editDocument(userId, args.documentId, args.title, args.content, args.parentFolderId);
      }
      case 'createDocument': {
        if (!args.content) {
          return { success: false, result: null, error: 'Content is required' };
        }
        return await createDocument(userId, args.content, args.title, args.parentFolderId);
      }
      default:
        return { success: false, result: null, error: `Unknown function: ${functionName}` };
    }
  } catch (error) {
    console.error(`Error executing ${functionName}:`, error);
    return { success: false, result: null, error: String(error) };
  }
}

async function readDocument(
  userId: UUID,
  documentId: string
): Promise<FunctionResult<{
  title: string;
  content: Array<{
    text: string;
    type: "paragraph" | "heading" | "list";
  }>;
}>> {
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

    const docs = google.docs({ version: 'v1', auth });
    const response = await docs.documents.get({
      documentId: documentId
    });

    // Transform the response into our simplified schema
    const transformedContent = response.data.body?.content?.map(item => {
      let text = '';
      let type: "paragraph" | "heading" | "list" = 'paragraph';

      if (item.paragraph) {
        text = item.paragraph.elements?.map(element => element.textRun?.content || '').join('') || '';
        if (item.paragraph.bullet) {
          type = 'list';
        } else if (item.paragraph.paragraphStyle?.namedStyleType?.includes('HEADING')) {
          type = 'heading';
        }
      } else if (item.sectionBreak) {
        return null; // Skip section breaks
      }

      return { text, type };
    }).filter((item): item is { text: string; type: "paragraph" | "heading" | "list" } => 
      item !== null && item.text.trim() !== ''
    ) || [];

    const result = {
      title: response.data.title || '',
      content: transformedContent
    };

    return { success: true, result };
  } catch (error) {
    console.error('Error reading document:', error);
    return { success: false, result: null, error: String(error) };
  }
}

async function editDocument(
  userId: UUID,
  documentId: string,
  title?: string,
  content?: string,
  parentFolderId?: string
): Promise<FunctionResult<{
  documentId: string;
  title: string;
  revisionId: string;
  parents?: string[];
}>> {
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

    const docs = google.docs({ version: 'v1', auth });
    let response = await docs.documents.get({
      documentId: documentId
    });

    const currentTitle = response.data.title || '';

    // Update title if provided and different
    if (title && title !== currentTitle) {
      const drive = google.drive({ version: 'v3', auth });
      await drive.files.update({
        fileId: documentId,
        requestBody: {
          name: title
        }
      });
    }

    // Update content if provided
    if (content) {
      // First clear the document
      const endIndex = response.data.body?.content?.reduce((max, item) => {
        const end = item.endIndex || 0;
        return end > max ? end : max;
      }, 1) || 1;

      if (endIndex > 1) {
        const clearRequests = [{
          deleteContentRange: {
            range: {
              startIndex: 1,
              endIndex: endIndex - 1  // Exclude the final newline character
            }
          }
        }];

        await docs.documents.batchUpdate({
          documentId: documentId,
          requestBody: {
            requests: clearRequests
          }
        });
      }

      // Then insert new content
      await docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: [{
            insertText: {
              location: {
                index: 1
              },
              text: content
            }
          }]
        }
      });
    }

    // Update location if provided
    let parents;
    if (parentFolderId) {
      const drive = google.drive({ version: 'v3', auth });
      const currentFile = await drive.files.get({
        fileId: documentId,
        fields: 'parents'
      });

      const moveResponse = await drive.files.update({
        fileId: documentId,
        addParents: parentFolderId,
        removeParents: currentFile.data.parents?.join(','),
        fields: 'parents'
      });
      
      parents = moveResponse.data.parents;
    }

    // Get the final state of the document
    response = await docs.documents.get({
      documentId: documentId
    });

    // Get current parents if not already fetched
    if (!parents) {
      const drive = google.drive({ version: 'v3', auth });
      const currentFile = await drive.files.get({
        fileId: documentId,
        fields: 'parents'
      });
      parents = currentFile.data.parents || [];
    }

    const result = {
      documentId: documentId,
      title: response.data.title || '',
      revisionId: response.data.revisionId || '',
      parents: parents
    };

    return { success: true, result };
  } catch (error) {
    console.error('Error editing document:', error);
    return { success: false, result: null, error: String(error) };
  }
}

async function createDocument(
  userId: UUID,
  content: string,
  title?: string,
  parentFolderId?: string
): Promise<FunctionResult<{
  documentId: string;
  title: string;
  revisionId: string;
  parents: string[];
}>> {
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

    // Create document using Docs API
    const docs = google.docs({ version: 'v1', auth });
    const response = await docs.documents.create({
      requestBody: {
        title: title || 'New Document'
      }
    });

    const documentId = response.data.documentId;
    if (!documentId) {
      throw new Error('Failed to create document: No document ID returned');
    }

    // If parent folder is specified, move the document using Drive API
    let parents: string[] = [];
    if (parentFolderId) {
      const drive = google.drive({ version: 'v3', auth });
      const moveResponse = await drive.files.update({
        fileId: documentId,
        addParents: parentFolderId,
        fields: 'id, parents'
      });
      parents = moveResponse.data.parents || [];
    }

    // Add content if provided
    if (content) {
      await docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: {
                  index: 1
                },
                text: content
              }
            }
          ]
        }
      });
    }

    // Transform the response to match our schema
    const result = {
      documentId: documentId,
      title: response.data.title || '',
      revisionId: response.data.revisionId || '',
      parents: parents
    };

    return { success: true, result };
  } catch (error) {
    console.error('Error creating document:', error);
    return { success: false, result: null, error: String(error) };
  }
} 