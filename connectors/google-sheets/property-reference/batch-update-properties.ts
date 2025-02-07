import  {
  Border,
  CellData,
  DataValidationRule,
} from "./cell-properties"

import { EmbeddedChart, EmbeddedObjectBorder } from "./chart-properties"

import {
  SpreadsheetProperties,
  NamedRange,
  DataSource,
} from "./spreadsheets-properties";
import {
  SheetProperties,
  DimensionProperties,
  RowData,
  ProtectedRange,
  ConditionalFormatRule,
  BandedRange,
  DimensionGroup,
  FilterView,
  BasicFilter,
  Slicer,
  SlicerSpec,
} from "./sheets-properties";
import {
  GridRange,
  DataSourceColumnReference,
  GridCoordinate,
} from "./other-properties";
import { Dimension, DimensionRange } from "./base-types";
import { DeveloperMetadata } from "./spreadsheets-developer-metadata";
import { DataFilter } from "./other-types";

// Enums
export const PasteType = {
  type: "string",
  enum: [
    "PASTE_NORMAL",        // Paste values, formulas, formats, and merges
    "PASTE_VALUES",        // Paste the values ONLY without formats, formulas, or merges
    "PASTE_FORMAT",        // Paste the format and data validation only
    "PASTE_NO_BORDERS",    // Like PASTE_NORMAL but without borders
    "PASTE_FORMULA",       // Paste the formulas only
    "PASTE_DATA_VALIDATION", // Paste the data validation only
    "PASTE_CONDITIONAL_FORMATTING" // Paste the conditional formatting rules only
  ]
};

export const PasteOrientation = {
  type: "string",
  enum: [
    "NORMAL",     // Paste normally
    "TRANSPOSE"   // Paste transposed, where all rows become columns and vice versa
  ]
};

export const MergeType = {
  type: "string",
  enum: [
    "MERGE_ALL",     // Create a single merge from the range
    "MERGE_COLUMNS", // Create a merge for each column in the range
    "MERGE_ROWS"     // Create a merge for each row in the range
  ]
};

export const DelimiterType = {
  type: "string",
  enum: [
    "DELIMITER_TYPE_UNSPECIFIED", // Default value
    "COMMA",    // ","
    "SEMICOLON", // ";"
    "PERIOD",   // "."
    "SPACE",    // " "
    "CUSTOM",   // A custom value as defined in delimiter
    "AUTODETECT" // Automatically detect columns
  ]
};

// Basic update requests
export const UpdateSpreadsheetPropertiesRequest = {
  name: "UpdateSpreadsheetPropertiesRequest",
  type: "object",
  properties: {
    properties: SpreadsheetProperties,
    fields: { 
      type: "string",
      description: "The fields that should be updated. At least one field must be specified. The root 'properties' is implied and should not be specified."
    }
  },
  required: ["properties", "fields"]
};

export const UpdateSheetPropertiesRequest = {
  name: "UpdateSheetProperties",
  type: "object",
  properties: {
    properties: SheetProperties,
    fields: { 
      type: "string",
      description: "The fields that should be updated. At least one field must be specified."
    }
  },
  required: ["properties", "fields"]
};

export const DataSourceSheetDimensionRange = {
  name: "DataSourceSheetDimensionRange",
  type: "object",
  properties: {
    sheetId: { type: "integer" },
    columnReferences: {
      type: "array",
      items: DataSourceColumnReference
    }
  },
  required: ["sheetId", "columnReferences"]
};

export const UpdateDimensionPropertiesRequest = {
  name: "UpdateDimensionProperties",
  type: "object",
  properties: {
    properties: DimensionProperties,
    fields: { type: "string" },
    range: DimensionRange,
    dataSourceSheetRange: DataSourceSheetDimensionRange
  },
  oneOf: [
    { required: ["range"] },
    { required: ["dataSourceSheetRange"] }
  ],
  required: ["properties", "fields"]
};

// Named Range Operations
export const UpdateNamedRangeRequest = {
  name: "UpdateNamedRange",
  type: "object",
  properties: {
    namedRange: NamedRange,
    fields: {
      type: "string",
      description: "The fields that should be updated. At least one field must be specified. The root namedRange is implied and should not be specified."
    }
  },
  required: ["namedRange", "fields"]
};

export const AddNamedRangeRequest = {
  name: "AddNamedRange",
  type: "object",
  properties: {
    namedRange: NamedRange
  },
  required: ["namedRange"]
};

export const DeleteNamedRangeRequest = {
  name: "DeleteNamedRange",
  type: "object",
  properties: {
    namedRangeId: { type: "string" }
  },
  required: ["namedRangeId"]
};

// Cell Operations
export const RepeatCellRequest = {
  name: "RepeatCell",
  type: "object",
  properties: {
    range: GridRange,
    cell: CellData,
    fields: {
      type: "string",
      description: "The fields that should be updated. At least one field must be specified. The root cell is implied and should not be specified."
    }
  },
  required: ["range", "cell", "fields"]
};

export const CutPasteRequest = {
  name: "CutPaste",
  type: "object",
  properties: {
    source: GridRange,
    destination: GridCoordinate,
    pasteType: PasteType
  },
  required: ["source", "destination"]
};

export const CopyPasteRequest = {
  name: "CopyPaste",
  type: "object",
  properties: {
    source: GridRange,
    destination: GridRange,
    pasteType: PasteType,
    pasteOrientation: PasteOrientation
  },
  required: ["source", "destination"]
};

export const MergeCellsRequest = {
  name: "MergeCells",
  type: "object",
  properties: {
    range: GridRange,
    mergeType: MergeType
  },
  required: ["range", "mergeType"]
};

export const UnmergeCellsRequest = {
  name: "UnmergeCells",
  type: "object",
  properties: {
    range: GridRange
  },
  required: ["range"]
};

export const UpdateBordersRequest = {
  name: "UpdateBorders",
  type: "object",
  properties: {
    range: GridRange,
    top: Border,
    bottom: Border,
    left: Border,
    right: Border,
    innerHorizontal: Border,
    innerVertical: Border
  },
  required: ["range"]
};

export const UpdateCellsRequest = {
  name: "UpdateCells",
  type: "object",
  properties: {
    rows: {
      type: "array",
      description: "The rows to update. At least one row must be specified.",
      items: RowData
    },
    fields: {
      type: "string",
      description: "The fields of CellData that should be updated. At least one field must be specified. The root is the CellData; 'row.values.' should not be specified. A single'*' can be used as short-hand for listing every field."
    },
    start: GridCoordinate,
    range: GridRange
  },
  oneOf: [
    { required: ["start"] },
    { required: ["range"] }
  ],
  required: ["rows", "fields"]
};

// Sheet Operations
export const AddSheetRequest = {
  name: "AddSheet",
  type: "object",
  properties: {
    properties: SheetProperties
  },
  required: ["properties"]
};

export const DeleteSheetRequest = {
  name: "DeleteSheet",
  type: "object",
  properties: {
    sheetId: { type: "integer" }
  },
  required: ["sheetId"]
};

export const SourceAndDestination = {
  name: "SourceAndDestination",
  type: "object",
  properties: {
    source: GridRange,
    dimension: Dimension,
    fillLength: { type: "integer" }
  },
  required: ["source", "dimension", "fillLength"]
};

export const AutoFillRequest = {
  name: "AutoFill",
  type: "object",
  properties: {
    useAlternateSeries: { type: "boolean" },
    range: GridRange,
    sourceAndDestination: SourceAndDestination
  },
  required: ["useAlternateSeries", "range"]
};

export const DuplicateSheetRequest = {
  name: "DuplicateSheet",
  type: "object",
  properties: {
    sourceSheetId: { 
      type: "integer",
      description: "The sheet ID of the sheet to duplicate."
    },
    insertSheetIndex: { 
      type: "integer",
      description: "The index of the sheet to insert the new sheet at."
    },
    newSheetId: { 
      type: "integer",
      description: "The ID of the new sheet."
    },
    newSheetName: { 
      type: "string",
      description: "The name of the new sheet."
    }
  },
  required: ["sourceSheetId"]
};

// Filter Operations
export const AddFilterViewRequest = {
  name: "AddFilterView",
  type: "object",
  properties: {
    filter: FilterView
  },
  required: ["filter"]
};

export const UpdateFilterViewRequest = {
  name: "UpdateFilterView",
  type: "object",
  properties: {
    filter: FilterView,
    fields: {
      type: "string",
      description: "The fields that should be updated. At least one field must be specified. The root filter is implied and should not be specified."
    }
  },
  required: ["filter", "fields"]
};

export const DeleteFilterViewRequest = {
  name: "DeleteFilterView",
  type: "object",
  properties: {
    filterId: { type: "integer" }
  },
  required: ["filterId"]
};

export const ClearBasicFilterRequest = {
  name: "ClearBasicFilter",
  type: "object",
  properties: {
    sheetId: { type: "integer" }
  },
  required: ["sheetId"]
};

// Dimension Operations
export const AppendDimensionRequest = {
  name: "AppendDimension",
  type: "object",
  properties: {
    sheetId: { type: "integer" },
    dimension: { type: "string", enum: ["ROWS", "COLUMNS"] },
    length: { type: "integer" }
  },
  required: ["sheetId", "dimension", "length"]
};

export const DeleteDimensionRequest = {
  name: "DeleteDimension",
  type: "object",
  properties: {
    range: DimensionRange
  },
  required: ["range"]
};

// Auto Resize Request
export const AutoResizeDimensionsRequest = {
  name: "AutoResizeDimensions",
  type: "object",
  properties: {
    dimensions: DimensionRange,
    dataSourceSheetDimensions: DataSourceSheetDimensionRange
  },
  oneOf: [
    { required: ["dimensions"] },
    { required: ["dataSourceSheetDimensions"] }
  ]
};

// Chart Operations
export const AddChartRequest = {
  name: "AddChart",
  type: "object",
  properties: {
    chart: EmbeddedChart
  },
  required: ["chart"]
};

// Protected Range Operations
export const AddProtectedRangeRequest = {
  name: "AddProtectedRange",
  type: "object",
  properties: {
    protectedRange: ProtectedRange
  },
  required: ["protectedRange"]
};

export const UpdateProtectedRangeRequest = {
  name: "UpdateProtectedRange",
  type: "object",
  properties: {
    protectedRange: ProtectedRange,
    fields: {
      type: "string",
      description: "The fields that should be updated. At least one field must be specified. The root protectedRange is implied and should not be specified."
    }
  },
  required: ["protectedRange", "fields"]
};

export const DeleteProtectedRangeRequest = {
  name: "DeleteProtectedRange",
  type: "object",
  properties: {
    protectedRangeId: { type: "integer" }
  },
  required: ["protectedRangeId"]
};

// Data Manipulation Requests
export const TextToColumnsRequest = {
  name: "TextToColumns",
  type: "object",
  properties: {
    source: GridRange,
    delimiter: { type: "string" },
    delimiterType: { 
      type: "string", 
      enum: [
        "DELIMITER_TYPE_UNSPECIFIED",
        "COMMA",
        "SEMICOLON",
        "PERIOD",
        "SPACE",
        "CUSTOM",
        "AUTODETECT"
      ]
    }
  },
  required: ["source", "delimiterType"]
};

export const DeleteRangeRequest = {
  name: "DeleteRange",
  type: "object",
  properties: {
    range: GridRange,
    shiftDimension: Dimension
  },
  required: ["range", "shiftDimension"]
};

export const InsertRangeRequest = {
  name: "InsertRange",
  type: "object",
  properties: {
    range: GridRange,
    shiftDimension: Dimension
  },
  required: ["range", "shiftDimension"]
};

export const MoveDimensionRequest = {
  name: "MoveDimension",
  type: "object",
  properties: {
    source: DimensionRange,
    destinationIndex: { type: "integer" }
  },
  required: ["source", "destinationIndex"]
};

// Formatting Requests
export const AddConditionalFormatRuleRequest = {
  name: "AddConditionalFormatRule",
  type: "object",
  properties: {
    rule: ConditionalFormatRule,
    index: { 
      type: "integer",
      description: "The index of the rule to add."
    }
  },
  required: ["rule", "index"]
};

export const UpdateConditionalFormatRuleRequest = {
  name: "UpdateConditionalFormatRule",
  type: "object",
  properties: {
    sheetId: { 
      type: "integer",
      description: "The sheet ID of the rule to update."
    },
    index: { 
      type: "integer",
      description: "The index of the rule to update."
    },
    rule: ConditionalFormatRule,
    newIndex: { 
      type: "integer",
      description: "The index of the rule to update."
    }
  },
  required: ["index", "sheetId"],
  oneOf: [
    { required: ["rule"] },
    { required: ["newIndex"] }
  ]
};

export const DeleteConditionalFormatRuleRequest = {
  name: "DeleteConditionalFormatRule",
  type: "object",
  properties: {
    sheetId: { 
      type: "integer",
      description: "The sheet ID of the rule to delete."
    },
    index: { 
      type: "integer",
      description: "The index of the rule to delete."
    }
  },
  required: ["sheetId", "index"]
};

// Data Validation and Sorting
export const SetDataValidationRequest = {
  name: "SetDataValidation",
  type: "object",
  properties: {
    range: GridRange,
    rule: DataValidationRule
  },
  required: ["range"]
};

export const SetBasicFilterRequest = {
  name: "SetBasicFilter",
  type: "object",
  properties: {
    filter: BasicFilter
  },
  required: ["filter"]
};

export const SortRangeRequest = {
  name: "SortRange",
  type: "object",
  properties: {
    range: GridRange,
    sortSpecs: {
      type: "array",
      items: { type: "object", ref: "SortSpec" }
    }
  },
  required: ["range", "sortSpecs"]
};

// Banding Requests
export const AddBandingRequest = {
  name: "AddBanding",
  type: "object",
  properties: {
    bandedRange: BandedRange
  },
  required: ["bandedRange"]
};

export const UpdateBandingRequest = {
  name: "UpdateBanding",
  type: "object",
  properties: {
    bandedRange: BandedRange,
    fields: { type: "string" }
  },
  required: ["bandedRange", "fields"]
};

export const DeleteBandingRequest = {
  name: "DeleteBanding",
  type: "object",
  properties: {
    bandedRangeId: { type: "integer" }
  },
  required: ["bandedRangeId"]
};

// Developer Metadata Operations
export const CreateDeveloperMetadataRequest = {
  name: "CreateDeveloperMetadata",
  type: "object",
  properties: {
    developerMetadata: DeveloperMetadata
  },
  required: ["developerMetadata"]
};

export const UpdateDeveloperMetadataRequest = {
  name: "UpdateDeveloperMetadata",
  type: "object",
  properties: {
    dataFilters: {
      type: "array",
      items: DataFilter
    },
    developerMetadata: DeveloperMetadata,
    fields: {
      type: "string",
      description: "The fields that should be updated. At least one field must be specified."
    }
  },
  required: ["dataFilters", "developerMetadata", "fields"]
};

export const DeleteDeveloperMetadataRequest = {
  name: "DeleteDeveloperMetadata",
  type: "object",
  properties: {
    dataFilter: DataFilter
  },
  required: ["dataFilter"]
};

// Dimension Group Operations
export const AddDimensionGroupRequest = {
  name: "AddDimensionGroup",
  type: "object",
  properties: {
    range: DimensionRange
  },
  required: ["range"]
};

export const DeleteDimensionGroupRequest = {
  name: "DeleteDimensionGroup",
  type: "object",
  properties: {
    range: DimensionRange
  },
  required: ["range"]
};

export const UpdateDimensionGroupRequest = {
  name: "UpdateDimensionGroup",
  type: "object",
  properties: {
    dimensionGroup: DimensionGroup,
    fields: {
      type: "string",
      description: "The fields that should be updated. At least one field must be specified."
    }
  },
  required: ["dimensionGroup", "fields"]
};

// Data Source Object Reference schema
export const DataSourceObjectReference = {
  type: "object",
  description: "Reference to a data source object",
  properties: {
    sheetId: { 
      type: "string",
      description: "References to a DATA_SOURCE sheet."
    },
    chartId: { 
      type: "integer",
      description: "References to a data source chart."
    },
    dataSourceTableAnchorCell: {
      type: "object",
      description: "References to a DataSourceTable anchored at the cell.",
      ref: "GridCoordinate"
    },
    dataSourcePivotTableAnchorCell: {
      type: "object",
      description: "References to a data source PivotTable anchored at the cell.",
      ref: "GridCoordinate"
    },
    dataSourceFormulaCell: {
      type: "object",
      description: "References to a cell containing DataSourceFormula.",
      ref: "GridCoordinate"
    }
  },
  oneOf: [
    { required: ["sheetId"] },
    { required: ["chartId"] },
    { required: ["dataSourceTableAnchorCell"] },
    { required: ["dataSourcePivotTableAnchorCell"] },
    { required: ["dataSourceFormulaCell"] }
  ]
};

// Data Source References schema
export const DataSourceObjectReferences = {
  type: "object",
  description: "A list of references to data source objects",
  properties: {
    references: {
      type: "array",
      description: "The references.",
      items: DataSourceObjectReference
    }
  },
  required: ["references"]
};

export const AddDataSourceRequest = {
  name: "AddDataSource",
  type: "object",
  properties: {
    dataSource: DataSource
  },
  required: ["dataSource"]
};

export const UpdateDataSourceRequest = {
  name: "UpdateDataSource",
  type: "object",
  properties: {
    dataSource: DataSource,
    fields: {
      type: "string",
      description: "The fields that should be updated. At least one field must be specified."
    }
  },
  required: ["dataSource", "fields"]
};

export const DeleteDataSourceRequest = {
  name: "DeleteDataSource",
  type: "object",
  properties: {
    dataSourceId: { type: "string" }
  },
  required: ["dataSourceId"]
};

export const RefreshDataSourceRequest = {
  name: "RefreshDataSource",
  type: "object",
  properties: {
    force: { type: "boolean" },
    references: DataSourceObjectReferences,
    dataSourceId: { type: "string" },
    isAll: { type: "boolean" }
  },
  oneOf: [
    { required: ["references"] },
    { required: ["dataSourceId"] },
    { required: ["isAll"] }
  ]
};

export const CancelDataSourceRefreshRequest = {
  name: "CancelDataSourceRefresh",
  type: "object",
  properties: {
    references: DataSourceObjectReferences,
    dataSourceId: { type: "string" },
    isAll: { type: "boolean" }
  },
  oneOf: [
    { required: ["references"] },
    { required: ["dataSourceId"] },
    { required: ["isAll"] }
  ]
};

// Miscellaneous Operations
export const TrimWhitespaceRequest = {
  name: "TrimWhitespace",
  type: "object",
  properties: {
    range: GridRange
  },
  required: ["range"]
};

export const DeleteDuplicatesRequest = {
  name: "DeleteDuplicates",
  type: "object",
  properties: {
    range: GridRange,
    comparisonColumns: {
      type: "array",
      items: DimensionRange
    }
  },
  required: ["range"]
};

export const UpdateEmbeddedObjectBorderRequest = {
  name: "UpdateEmbeddedObjectBorder",
  type: "object",
  properties: {
    objectId: { type: "integer" },
    border: EmbeddedObjectBorder,
    fields: {
      type: "string",
      description: "The fields that should be updated. At least one field must be specified."
    }
  },
  required: ["objectId", "border", "fields"]
};

export const AddSlicerRequest = {
  name: "AddSlicer",
  type: "object",
  properties: {
    slicer: Slicer
  },
  required: ["slicer"]
};

export const UpdateSlicerSpecRequest = {
  name: "UpdateSlicerSpec",
  type: "object",
  properties: {
    slicerId: { type: "integer" },
    spec: SlicerSpec,
    fields: {
      type: "string",
      description: "The fields that should be updated. At least one field must be specified."
    }
  },
  required: ["slicerId", "spec", "fields"]
};

// Missing request types from function-schema.ts

export const AppendCellsRequest = {
  name: "AppendCells",
  type: "object",
  properties: {
    sheetId: { type: "integer" },
    rows: {
      type: "array",
      items: RowData
    },
    fields: {
      type: "string",
      description: "The fields of CellData that should be updated. At least one field must be specified."
    }
  },
  required: ["sheetId", "rows", "fields"]
};

export const DeleteEmbeddedObjectRequest = {
  name: "DeleteEmbeddedObject",
  type: "object",
  properties: {
    objectId: { type: "integer" }
  },
  required: ["objectId"]
};

export const DuplicateFilterViewRequest = {
  name: "DuplicateFilterView",
  type: "object",
  properties: {
    filterId: { type: "integer" }
  },
  required: ["filterId"]
};

export const FindReplaceRequest = {
  name: "FindReplace",
  type: "object",
  properties: {
    find: { 
      type: "string",
      description: "The text to find."
    },
    replacement: { 
      type: "string",
      description: "The text to replace the found text with."
    },
    matchCase: { 
      type: "boolean",
      description: "Whether to match the case of the text."
    },
    matchEntireCell: { 
      type: "boolean",
      description: "Whether to match the entire cell."
    },
    searchByRegex: { 
      type: "boolean",
      description: "Whether to search by regex."
    },
    includeFormulas: { 
      type: "boolean",
      description: "Whether to include formulas."
    },
    range: GridRange,
    sheetId: { 
      type: "integer",
      description: "The sheet ID of the sheet to search."
    },
    allSheets: { 
      type: "boolean",
      description: "Whether to search all sheets."
    }
  },
  oneOf: [
    { required: ["range"] },
    { required: ["sheetId"] },
    { required: ["allSheets"] }
  ]
};

export const InsertDimensionRequest = {
  name: "InsertDimension",
  type: "object",
  properties: {
    range: DimensionRange,
    inheritFromBefore: { type: "boolean" }
  },
  required: ["range"]
};

export const UpdateEmbeddedObjectPositionRequest = {
  name: "UpdateEmbeddedObjectPosition",
  type: "object",
  properties: {
    objectId: { type: "integer" },
    newPosition: { type: "object", ref: "EmbeddedObjectPosition" },
    fields: {
      type: "string",
      description: "The fields of OverlayPosition that should be updated when setting a new position."
    }
  },
  required: ["objectId", "newPosition", "fields"]
};

export const PasteDataRequest = {
  name: "PasteData",
  type: "object",
  properties: {
    coordinate: GridCoordinate,
    data: { 
      type: "string", 
      description: "The data to paste. At least one data must be specified." 
    },
    type: { 
      type: "string", 
      ref: "PasteType",
      description: "The type of paste to perform."
    },
    delimiter: { 
      type: "string",
      description: "The delimiter to use for the paste."
    },
    html: { 
      type: "boolean",
      description: "Whether to paste the data as HTML."
    }
  },
  required: ["coordinate", "data", "type"],
  oneOf: [
    { required: ["delimiter"] },
    { required: ["html"] }
  ]
};

export const RandomizeRangeRequest = {
  name: "RandomizeRange",
  type: "object",
  properties: {
    range: GridRange
  },
  required: ["range"]
};

export const UpdateChartSpecRequest = {
  name: "UpdateChartSpec",
  type: "object",
  properties: {
    chartId: { type: "integer" },
    spec: { type: "object", ref: "ChartSpec" }
  },
  required: ["chartId", "spec"]
};

export const UpdateEmbeddedObjectRequest = {
  name: "UpdateEmbeddedObject",
  type: "object",
  properties: {
    objectId: { type: "integer" },
    fields: {
      type: "string",
      description: "The fields that should be updated. At least one field must be specified."
    }
  },
  required: ["objectId", "fields"]
};
