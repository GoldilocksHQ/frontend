import { type ToolDefinition } from "@/services/api/agent-service"
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
  // CutPasteRequest,
  CopyPasteRequest,
  // MergeCellsRequest,
  // UnmergeCellsRequest,
  // UpdateBordersRequest,
  UpdateCellsRequest,
  // AddFilterViewRequest,
  // AppendCellsRequest,
  // ClearBasicFilterRequest,
  // DeleteDimensionRequest,
  // DeleteEmbeddedObjectRequest,
  // DeleteFilterViewRequest,
  // DuplicateFilterViewRequest,
  DuplicateSheetRequest,
  FindReplaceRequest,
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
  // TrimSheetRequest,
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
    {
      name: "createSheet",
      description: "Create a new Google Sheet",
      parameters: {
        type: "object",
        properties: {
          sheetName: {
            type: "string",
            description: "The name of the sheet to create",
          },
          parentFolderId: {
            type: "string",
            description: "The ID of the parent folder where to create the new sheet",
          }
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
        }
      }
    },
    {
      name: "batchUpdate",
      description: "Batch update a Google Sheet with multiple sequential requests",
      parameters: {
        type: "object",
        properties: {
          spreadsheetId: { 
            type: "string",
            description: "The ID of the spreadsheet to update",
          },
          requests: { 
            type: "array", 
            description: "The requests to update the spreadsheet",
            items: { 
              type: "object",
              description: "A single kind of update to apply to a spreadsheet",
              oneOf: [
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
                {
                  type: "object",
                  properties: {
                    addSheet: AddSheetRequest
                  }
                },
                {
                  type: "object",
                  properties: {
                    deleteSheet: DeleteSheetRequest
                  }
                },
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
                {
                  type: "object",
                  properties: {
                    copyPaste: CopyPasteRequest
                  }
                },
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
                {
                  type: "object",
                  properties: {
                    updateCells: UpdateCellsRequest
                  }
                },
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
                {
                  type: "object",
                  properties: {
                    duplicateSheet: DuplicateSheetRequest
                  }
                },
                {
                  type: "object",
                  properties: {
                    findReplace: FindReplaceRequest
                  }
                },
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
                {
                  type: "object",
                  properties: {
                    pasteData: PasteDataRequest
                  }
                },
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
                {
                  type: "object",
                  properties: {
                    addConditionalFormatRule: AddConditionalFormatRuleRequest
                  }
                },
                {
                  type: "object",
                  properties: {
                    updateConditionalFormatRule: UpdateConditionalFormatRuleRequest
                  }
                },
                {
                  type: "object",
                  properties: {
                    deleteConditionalFormatRule: DeleteConditionalFormatRuleRequest
                  }
                },
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
              ]
            }
          },
          responseRanges: { 
            type: "array",
            items: { type: "string" },
            description: "The ranges to return in the response"
          }
        },
        required: ["spreadsheetId", "requests", "responseRanges"]
      },
      responseSchema: {
        type: "json_schema",
        json_schema: {
          name: "batch_update_response",
          schema: {
                  type: "object",
                  properties: {
              responses: { 
                type: "array",
                items: { type: "object" }
              }
            },
            required: ["responses"],
            additionalProperties: false
          },
          strict: true
        }
      }
    }
  ]
};

// {
    //   name: "batchUpdate",
    //   description: "Batch update a Google Sheet with multiple sequential requests",
    //   parameters: {
    //     type: "object",
    //     properties: {
    //       spreadsheetId: { 
    //         type: "string",
    //         description: "The ID of the spreadsheet to update",
    //       },
    //       requests: { 
    //         type: "array", 
    //         description: "The requests to update the spreadsheet",
    //         items: { 
    //           type: "object",
    //           description: "A single kind of update to apply to a spreadsheet",
    //           oneOf: [
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
    //             {
    //               type: "object",
    //               properties: {
    //                 addSheet: AddSheetRequest
    //               }
    //             },
    //             {
    //               type: "object",
    //               properties: {
    //                 deleteSheet: DeleteSheetRequest
    //               }
    //             },
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
    //             {
    //               type: "object",
    //               properties: {
    //                 copyPaste: CopyPasteRequest
    //               }
    //             },
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
    //             {
    //               type: "object",
    //               properties: {
    //                 updateCells: UpdateCellsRequest
    //               }
    //             },
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
    //             {
    //               type: "object",
    //               properties: {
    //                 duplicateSheet: DuplicateSheetRequest
    //               }
    //             },
    //             {
    //               type: "object",
    //               properties: {
    //                 findReplace: FindReplaceRequest
    //               }
    //             },
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
    //             {
    //               type: "object",
    //               properties: {
    //                 pasteData: PasteDataRequest
    //               }
    //             },
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
    //             {
    //               type: "object",
    //               properties: {
    //                 addConditionalFormatRule: AddConditionalFormatRuleRequest
    //               }
    //             },
    //             {
    //               type: "object",
    //               properties: {
    //                 updateConditionalFormatRule: UpdateConditionalFormatRuleRequest
    //               }
    //             },
    //             {
    //               type: "object",
    //               properties: {
    //                 deleteConditionalFormatRule: DeleteConditionalFormatRuleRequest
    //               }
    //             },
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
    //           ]
    //         }
    //       },
    //       responseRanges: { 
    //         type: "array",
    //         items: { type: "string" },
    //         description: "The ranges to return in the response"
    //       }
    //     },
    //     required: ["spreadsheetId", "requests", "responseRanges"]
    //   },
    //   responseSchema: {
    //     type: "json_schema",
    //     json_schema: {
    //       name: "batch_update_response",
    //       schema: {
    //               type: "object",
    //               properties: {
    //           responses: { 
    //             type: "array",
    //             items: { type: "object" }
    //           }
    //         },
    //         required: ["responses"],
    //         additionalProperties: false
    //       },
    //       strict: true
    //     }
    //   }
    // }