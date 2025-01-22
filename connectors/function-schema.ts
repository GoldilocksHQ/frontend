import { type ToolDefinition } from "@/services/api/agent-service";

export const googleSheetsToolDefinition: ToolDefinition = {
  connectorName: "google-sheets",
  functions: [
    {
      name: "readSheet",
      description: "Read values from a Google Sheet",
      parameters: {
        type: "object",
        properties: {
          spreadsheetId: {
            type: "string",
            description: "The ID of the spreadsheet to read from",
          },
          range: {
            type: "string",
            description:
              "The A1 notation of the range to read (e.g., 'Sheet1!A1:B10')",
          },
        },
        required: ["spreadsheetId", "range"],
      },
      responseSchema: {
        type: "json_schema",
        json_schema: {
          name: "read_sheet_response",
          schema: {
            type: "object",
            properties: {
              values: {
                type: "array",
                items: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
                description: "The values read from the sheet as a 2D array",
              },
              metadata: {
                type: "object",
                properties: {
                  range: { type: "string" },
                  totalRows: { type: "number" },
                  totalColumns: { type: "number" },
                },
                required: ["range", "totalRows", "totalColumns"],
                additionalProperties: false,
              },
            },
            required: ["values", "metadata"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    },
    {
      name: "updateSheet",
      description: "Update values in a Google Sheet",
      parameters: {
        type: "object",
        properties: {
          spreadsheetId: {
            type: "string",
            description: "The ID of the spreadsheet to update",
          },
          range: {
            type: "string",
            description:
              "The A1 notation of the range to update (e.g., 'Sheet1!A1:B2')",
          },
          values: {
            type: "array",
            items: {
              type: "array",
              items: {
                type: "string",
              },
            },
            description: "The values to write as a 2D array",
          },
        },
        required: ["spreadsheetId", "range", "values"],
      },
      responseSchema: {
        type: "json_schema",
        json_schema: {
          name: "update_sheet_response",
          schema: {
            type: "object",
            properties: {
              updatedRange: { type: "string" },
              updatedRows: { type: "number" },
              updatedColumns: { type: "number" },
              updatedCells: { type: "number" },
              status: {
                type: "string",
                enum: ["success", "partial_success"],
              },
            },
            required: [
              "updatedRange",
              "updatedRows",
              "updatedColumns",
              "updatedCells",
              "status",
            ],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    },
  ],
};

export const googleDriveToolDefinition: ToolDefinition = {
  connectorName: "google-drive",
  functions: [
    {
      name: "listFiles",
      description: "List files and folders in Google Drive with optional filtering and pagination",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query to filter files which must have 3 parts: query_term, operator, value (e.g., 'name contains \"report\"' or 'mimeType=\"application/pdf\"')",
          },
          pageSize: {
            type: "number",
            description: "Maximum number of files to return",
            default: 10
          },
          pageToken: {
            type: "string",
            description: "Token for getting the next page of results",
          }
        },
        required: ['query'],
        additionalProperties: false
      },
      responseSchema: {
        type: "json_schema",
        json_schema: {
          name: "list_files_response",
          schema: {
            type: "object",
            properties: {
              files: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    mimeType: { type: "string" },
                    createdTime: { type: "string" },
                    modifiedTime: { type: "string" },
                    size: { type: "string" },
                    parents: { 
                      type: "array",
                      items: { type: "string" }
                    }
                  },
                  required: [
                    "id", 
                    "name", 
                    "mimeType", 
                    "createdTime", 
                    "modifiedTime", 
                    "size", 
                    "parents"
                  ],
                  additionalProperties: false
                }
              },
              nextPageToken: { type: "string" }
            },
            required: ["files", "nextPageToken"],
            additionalProperties: false
          },
          strict: true
        }
      }
    },
    {
      name: "createFolder",
      description: "Create a new folder in Google Drive",
      parameters: {
        type: "object",
        properties: {
          folderName: {
            type: "string",
            description: "Name of the folder to create"
          },
          parentFolderId: {
            type: "string",
            description: "ID of the parent folder where to create the new folder"
          }
        },
        required: ["folderName"]
      },
      responseSchema: {
        type: "json_schema",
        json_schema: {
          name: "create_folder_response",
          schema: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              mimeType: { type: "string" },
              createdTime: { type: "string" },
              modifiedTime: { type: "string" },
              parents: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["id", "name", "mimeType", "createdTime", "modifiedTime", "parents"],
            additionalProperties: false
          },
          strict: true
        }
      }
    },
    {
      name: "updateFile",
      description: "Update a file or folder in Google Drive (name, content, and/or location)",
      parameters: {
        type: "object",
        properties: {
          fileId: {
            type: "string",
            description: "ID of the file or folder to update"
          },
          fileName: {
            type: "string",
            description: "New name for the file or folder"
          },
          content: {
            type: "string",
            description: "New content for the file (ignored for folders)"
          },
          mimeType: {
            type: "string",
            description: "MIME type of the file content (e.g., 'text/plain', 'application/pdf', 'application/vnd.google-apps.folder')"
          },
          parentFolderId: {
            type: "string",
            description: "ID of the new parent folder to move the file/folder to"
          }
        },
        required: ["fileId", "fileName", "mimeType"]
      },
      responseSchema: {
        type: "json_schema",
        json_schema: {
          name: "update_file_response",
          schema: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              mimeType: { type: "string" },
              modifiedTime: { type: "string" },
              size: { type: "string" },
              parents: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["id", "name", "mimeType", "modifiedTime", "size", "parents"],
            additionalProperties: false
          },
          strict: true
        }
      }
    },
    {
      name: "readFile",
      description: "Read the content of a file from Google Drive",
      parameters: {
        type: "object",
        properties: {
          fileId: {
            type: "string",
            description: "ID of the file to read"
          }
        },
        required: ["fileId"]
      },
      responseSchema: {
        type: "json_schema",
        json_schema: {
          name: "read_file_response",
          schema: {
            type: "object",
            properties: {
              content: { type: "string" },
              mimeType: { type: "string" }
            },
            required: ["content", "mimeType"],
            additionalProperties: false
          },
          strict: true
        }
      }
    },
    {
      name: "deleteFile",
      description: "Delete a file or folder from Google Drive",
      parameters: {
        type: "object",
        properties: {
          fileId: {
            type: "string",
            description: "ID of the file or folder to delete"
          }
        },
        required: ["fileId"]
      },
      responseSchema: {
        type: "json_schema",
        json_schema: {
          name: "delete_file_response",
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean" }
            },
            required: ["success"],
            additionalProperties: false
          },
          strict: true
        }
      }
    }
  ]
};

export const googleDocsToolDefinition: ToolDefinition = {
  connectorName: "google-docs",
  functions: [
    {
      name: "readDocument",
      description: "Read the content of a Google Doc",
      parameters: {
        type: "object",
        properties: {
          documentId: {
            type: "string",
            description: "The ID of the document to read",
          }
        },
        required: ["documentId"],
      },
      responseSchema: {
        type: "json_schema",
        json_schema: {
          name: "read_document_response",
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              content: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    type: { 
                      type: "string",
                      enum: ["paragraph", "heading", "list"] 
                    }
                  },
                  required: ["text", "type"],
                  additionalProperties: false
                }
              }
            },
            required: ["title", "content"],
            additionalProperties: false
          },
          strict: true
        }
      },
    },
    {
      name: "editDocument",
      description: "Edit a Google Doc's name, content, or location",
      parameters: {
        type: "object",
        properties: {
          documentId: {
            type: "string",
            description: "The ID of the document to edit"
          },
          title: {
            type: "string",
            description: "New title for the document"
          },
          content: {
            type: "string",
            description: "New content to replace the entire document with"
          },
          parentFolderId: {
            type: "string",
            description: "ID of the new parent folder to move the document to"
          }
        },
        required: ["documentId"]
      },
      responseSchema: {
        type: "json_schema",
        json_schema: {
          name: "edit_document_response",
          schema: {
            type: "object",
            properties: {
              documentId: { type: "string" },
              title: { type: "string" },
              revisionId: { type: "string" },
              parents: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["documentId", "title", "revisionId", "parents"],
            additionalProperties: false
          },
          strict: true
        }
      }
    },
    {
      name: "createDocument",
      description: "Create a new Google Doc with initial content",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The title of the document to create",
            default: "New Document"
          },
          content: {
            type: "string",
            description: "The initial content to add to the document",
            default: "This is a new document"
          },
          parentFolderId: {
            type: "string",
            description: "ID of the parent folder where to create the new document"
          }
        },
        required: [],
      },
      responseSchema: {
        type: "json_schema",
        json_schema: {
          name: "create_document_response",
          schema: {
            type: "object",
            properties: {
              documentId: { type: "string" },
              title: { type: "string" },
              revisionId: { type: "string" }
            },
            required: ["documentId", "title", "revisionId"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    },
  ],
};