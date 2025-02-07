import { type ToolDefinition } from "@/services/api/agent-service";
import {
  // UpdateSpreadsheetPropertiesRequest,
  // UpdateSheetPropertiesRequest,
  // UpdateDimensionPropertiesRequest,
  // UpdateNamedRangeRequest,
  // RepeatCellRequest,
  // AddNamedRangeRequest,
  // DeleteNamedRangeRequest,
  AddSheetRequest,
  DeleteSheetRequest,
  // AutoFillRequest,
  CutPasteRequest,
  CopyPasteRequest,
  // MergeCellsRequest,
  // UnmergeCellsRequest,
  // UpdateBordersRequest,
  // UpdateCellsRequest,
  // AddFilterViewRequest,
  // AppendCellsRequest,
  // ClearBasicFilterRequest,
  // DeleteDimensionRequest,
  // DeleteEmbeddedObjectRequest,
  // DeleteFilterViewRequest,
  // DuplicateFilterViewRequest,
  DuplicateSheetRequest,
  // FindReplaceRequest,
  // InsertDimensionRequest,
  // InsertRangeRequest,
  // MoveDimensionRequest,
  // UpdateEmbeddedObjectPositionRequest,
  PasteDataRequest,
  // TextToColumnsRequest,
  // UpdateFilterViewRequest,
  // DeleteRangeRequest,
  // AppendDimensionRequest,
  AddConditionalFormatRuleRequest,
  UpdateConditionalFormatRuleRequest,
  DeleteConditionalFormatRuleRequest,
  // SortRangeRequest,
  // SetDataValidationRequest,
  // SetBasicFilterRequest,
  // AddProtectedRangeRequest,
  // UpdateProtectedRangeRequest,
  // DeleteProtectedRangeRequest,
  // AutoResizeDimensionsRequest,
  // AddChartRequest,
  // UpdateChartSpecRequest,
  // UpdateBandingRequest,
  // AddBandingRequest,
  // DeleteBandingRequest,
  // CreateDeveloperMetadataRequest,
  // UpdateDeveloperMetadataRequest,
  // DeleteDeveloperMetadataRequest,
  // RandomizeRangeRequest,
  // AddDimensionGroupRequest,
  // DeleteDimensionGroupRequest,
  // UpdateDimensionGroupRequest,
  // TrimWhitespaceRequest,
  // DeleteDuplicatesRequest,
  // UpdateEmbeddedObjectRequest,
  // AddSlicerRequest,
  // UpdateSlicerSpecRequest,
  // AddDataSourceRequest,
  // UpdateDataSourceRequest,
  // DeleteDataSourceRequest,
  // RefreshDataSourceRequest,
  // CancelDataSourceRefreshRequest
} from "./property-reference/batch-update-properties";

// Batch Update Function Schema Factory
const BatchUpdateFunctionSchemaFactory = (
  name: string,
  description: string,
  batchUpdateRequests: unknown[],
  needResponseRanges: boolean = false
) => {
  return {
    name: name,
    description: description,
    parameters: {
      type: "object",
      properties: {
        spreadsheetId: {
          type: "string",
          description: "The ID of the spreadsheet to update",
        },
        ...(needResponseRanges ? {
          responseRanges: {
            type: "array",
            items: { type: "string" },
            description: "The ranges to return in the response, example format: 'Sheet1!A1:B10'",
          }
        } : {}),
        requests: {
          type: "array",
          description: "The requests to update the spreadsheet",
          items: {
            type: "object",
            description: "A single kind of update to apply to a spreadsheet",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            oneOf: batchUpdateRequests.map((request: any) => {
              return {
                type: "object",
                properties: {
                  [request.name.charAt(0).toLowerCase() + request.name.slice(1)]: request,
                },
              };
            }),
          },
        },
      },
      required: ["spreadsheetId", "responseRanges", "requests"],
    },
    responseSchema: {
      type: "json_schema",
      json_schema: {
        name: `${name.replace(/([A-Z])/g, "_$1").toLowerCase()}_response`,
        schema: {
          type: "object",
          properties: {
            responses: {
              type: "array",
              items: { type: "object" },
            },
          },
          required: ["responses"],
          additionalProperties: false,
        },
        strict: true,
      },
    },
  };
};

export const googleSheetsToolDefinition: ToolDefinition = {
  connectorName: "google-sheets",
  functions: [
    {
      name: "getSpreadsheet",
      description: "Get information of a Google Sheet including the sheets and their properties. Recommended to use this function before any other functions. Required: spreadsheetId",
      parameters: {
        type: "object",
        properties: {
          spreadsheetId: { 
            type: "string",
            description: "The ID of the spreadsheet to get information from"
          },
        },
        required: ["spreadsheetId"],
      },
      responseSchema: {
        type: "json_schema",
        json_schema: {
          name: "get_spreadsheet_response",
          schema: {
            type: "object",
            properties: {
              spreadsheet: { type: "object" },
            },
            required: ["spreadsheet"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    },
    {
      name: "readValues",
      description: "Read values from a Google Sheet. Required: spreadsheetId, range",
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
              "The range to read (example format: 'Sheet1!A1:B10')",
          },
        },
        required: ["spreadsheetId", "range"],
      },
      responseSchema: {
        type: "json_schema",
        json_schema: {
          name: "read_values_response",
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
      name: "updateValues",
      description: "Update values in a Google Sheet. Required: spreadsheetId, range, values",
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
              "The range to update (example format: 'Sheet1!A1:B2')",
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
          name: "update_values_response",
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
    {
      name: "createSheet",
      description: "Create a new Google Sheet. Required: sheetName",
      parameters: {
        type: "object",
        properties: {
          sheetName: {
            type: "string",
            description: "The name of the sheet to create",
          },
          parentFolderId: {
            type: "string",
            description:
              "The ID of the parent folder where to create the new sheet",
          },
        },
        required: ["sheetName"],
      },
      responseSchema: {
        type: "json_schema",
        json_schema: {
          name: "create_sheet_response",
          schema: {
            type: "object",
            properties: {
              spreadsheetId: { type: "string" },
              spreadsheetName: { type: "string" },
              spreadsheetUrl: { type: "string" },
            },
            required: ["spreadsheetId", "spreadsheetName", "spreadsheetUrl"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    },
    // Manage Conditional Formatting using the BatchUpdate API
    BatchUpdateFunctionSchemaFactory(
      "manageConditionalFormatting",
      "Add, update or delete conditional formatting rules in a Google Sheet. Required: spreadsheetId, requests",
      [
        AddConditionalFormatRuleRequest,
        UpdateConditionalFormatRuleRequest,
        DeleteConditionalFormatRuleRequest,
      ],
      true
    ),
    BatchUpdateFunctionSchemaFactory(
      "manageSheet",
      "Add, remove or duplicate sheets in a Google Sheet. Required: spreadsheetId, requests",
      [
        AddSheetRequest,
        DeleteSheetRequest,
        DuplicateSheetRequest,
      ],
      false
    ),
    BatchUpdateFunctionSchemaFactory(
      "cutCopyPasteValues",
      "Cut, copy or paste values in a Google Sheet. Required: spreadsheetId, requests",
      [
        CutPasteRequest,
        CopyPasteRequest,
        PasteDataRequest,
      ],
      true
    ),
  ],
};

//             {
//               type: "object",
//               properties: {
//                 updateSpreadsheetProperties: UpdateSpreadsheetPropertiesRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 updateSheetProperties: UpdateSheetPropertiesRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 updateDimensionProperties: UpdateDimensionPropertiesRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 updateNamedRange: UpdateNamedRangeRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 repeatCell: RepeatCellRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 addNamedRange: AddNamedRangeRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 deleteNamedRange: DeleteNamedRangeRequest
//               }
//             },
// {
//   type: "object",
//   properties: {
//     addSheet: AddSheetRequest
//   }
// },
// {
//   type: "object",
//   properties: {
//     deleteSheet: DeleteSheetRequest
//   }
// },
//             {
//               type: "object",
//               properties: {
//                 autoFill: AutoFillRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 cutPaste: CutPasteRequest
//               }
//             },
// {
//   type: "object",
//   properties: {
//     copyPaste: CopyPasteRequest
//   }
// },
//             {
//               type: "object",
//               properties: {
//                 mergeCells: MergeCellsRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 unmergeCells: UnmergeCellsRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 updateBorders: UpdateBordersRequest
//               }
//             },
// {
//   type: "object",
//   properties: {
//     updateCells: UpdateCellsRequest
//   }
// },
//             {
//               type: "object",
//               properties: {
//                 addFilterView: AddFilterViewRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 appendCells: AppendCellsRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 clearBasicFilter: ClearBasicFilterRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 deleteDimension: DeleteDimensionRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 deleteEmbeddedObject: DeleteEmbeddedObjectRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 deleteFilterView: DeleteFilterViewRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 duplicateFilterView: DuplicateFilterViewRequest
//               }
//             },
// {
//   type: "object",
//   properties: {
//     duplicateSheet: DuplicateSheetRequest
//   }
// },
// {
//   type: "object",
//   properties: {
//     findReplace: FindReplaceRequest
//   }
// },
//             {
//               type: "object",
//               properties: {
//                 insertDimension: InsertDimensionRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 insertRange: InsertRangeRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 moveDimension: MoveDimensionRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 updateEmbeddedObjectPosition: UpdateEmbeddedObjectPositionRequest
//               }
//             },
// {
//   type: "object",
//   properties: {
//     pasteData: PasteDataRequest
//   }
// },
//             {
//               type: "object",
//               properties: {
//                 textToColumns: TextToColumnsRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 updateFilterView: UpdateFilterViewRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 deleteRange: DeleteRangeRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 appendDimension: AppendDimensionRequest
//               }
//             },
// {
//   type: "object",
//   properties: {
//     addConditionalFormatRule: AddConditionalFormatRuleRequest
//   }
// },
// {
//   type: "object",
//   properties: {
//     updateConditionalFormatRule: UpdateConditionalFormatRuleRequest
//   }
// },
// {
//   type: "object",
//   properties: {
//     deleteConditionalFormatRule: DeleteConditionalFormatRuleRequest
//   }
// },
//             {
//               type: "object",
//               properties: {
//                 addProtectedRange: AddProtectedRangeRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 updateProtectedRange: UpdateProtectedRangeRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 deleteProtectedRange: DeleteProtectedRangeRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 autoResizeDimensions: AutoResizeDimensionsRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 addChart: AddChartRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 updateChartSpec: UpdateChartSpecRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 updateBanding: UpdateBandingRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 addBanding: AddBandingRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 deleteBanding: DeleteBandingRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 createDeveloperMetadata: CreateDeveloperMetadataRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 updateDeveloperMetadata: UpdateDeveloperMetadataRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 deleteDeveloperMetadata: DeleteDeveloperMetadataRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 randomizeRange: RandomizeRangeRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 addDimensionGroup: AddDimensionGroupRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 deleteDimensionGroup: DeleteDimensionGroupRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 updateDimensionGroup: UpdateDimensionGroupRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 addDataSource: AddDataSourceRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 updateDataSource: UpdateDataSourceRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 deleteDataSource: DeleteDataSourceRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 sortRange: SortRangeRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 setDataValidation: SetDataValidationRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 setBasicFilter: SetBasicFilterRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 trimSheet: TrimSheetRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 deleteDuplicates: DeleteDuplicatesRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 updateEmbeddedObject: UpdateEmbeddedObjectRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 addSlicer: AddSlicerRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 updateSlicerSpec: UpdateSlicerSpecRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 refreshDataSource: RefreshDataSourceRequest
//               }
//             },
//             {
//               type: "object",
//               properties: {
//                 cancelDataSourceRefresh: CancelDataSourceRefreshRequest
//               }
//             }
