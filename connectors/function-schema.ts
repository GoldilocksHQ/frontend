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
            description: "Search query to filter files (e.g., 'name contains \"report\"' or 'mimeType=\"application/pdf\"')",
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
        required: [],
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
      name: "uploadFile",
      description: "Upload a new file to Google Drive",
      parameters: {
        type: "object",
        properties: {
          fileName: {
            type: "string",
            description: "Name of the file to create"
          },
          content: {
            type: "string",
            description: "Content of the file to upload"
          },
          mimeType: {
            type: "string",
            description: "MIME type of the file (e.g., 'text/plain', 'application/pdf')"
          },
          parentFolderId: {
            type: "string",
            description: "ID of the parent folder where to upload the file"
          }
        },
        required: ["fileName", "content", "mimeType"]
      },
      responseSchema: {
        type: "json_schema",
        json_schema: {
          name: "upload_file_response",
          schema: {
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
            required: ["id", "name", "mimeType"],
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
      name: "updateFile",
      description: "Update the content of an existing file in Google Drive",
      parameters: {
        type: "object",
        properties: {
          fileId: {
            type: "string",
            description: "ID of the file to update"
          },
          content: {
            type: "string",
            description: "New content for the file"
          },
          mimeType: {
            type: "string",
            description: "MIME type of the file content"
          }
        },
        required: ["fileId", "content", "mimeType"]
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
            required: ["id", "name", "mimeType"],
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