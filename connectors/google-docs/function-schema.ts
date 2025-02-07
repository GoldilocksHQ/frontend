import { ToolDefinition } from "@/services/api/agent-service";

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

