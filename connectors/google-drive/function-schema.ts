import { ToolDefinition } from "@/services/api/agent-service";

export const googleDriveToolDefinition: ToolDefinition = {
  connectorName: "google-drive",
  functions: [
    {
      name: "listFiles",
      description: "List files and folders in Google Drive with optional filtering and pagination. You can filter by mimeType, name, parent folder id, and more.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query to filter files which must have 3 parts: query_term, operator, value (e.g., 'name contains \"report\"' or 'mimeType=\"application/pdf\". You must not leave this blank.)",
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
      name: "listFilesByFolderId",
      description: "List files and folders within a specific folder using the folder ID with optional filtering and pagination.",
      parameters: {
        type: "object",
        properties: {
          folderId: {
            type: "string",
            description: "The ID of the folder to list files from"
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
        required: ["folderId"],
        additionalProperties: false
      },
      responseSchema: {
        type: "json_schema",
        json_schema: {
          name: "list_files_by_folder_id_response",
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
                    },
                    owners: {
                      type: "array",
                      items: { type: "string" }
                    },
                    fullFileExtension: { type: "string" }
                  },
                  required: ["id", "name", "mimeType", "createdTime", "modifiedTime", "size", "parents", "owners", "fullFileExtension"],
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
      description: "Read a file from Google Drive. Warning: Only files with binary content can be read.",
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