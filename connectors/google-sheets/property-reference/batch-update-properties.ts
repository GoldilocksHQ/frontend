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
  type: "object",
  properties: {
    namedRange: NamedRange
  },
  required: ["namedRange"]
};

export const DeleteNamedRangeRequest = {
  type: "object",
  properties: {
    namedRangeId: { type: "string" }
  },
  required: ["namedRangeId"]
};

// Cell Operations
export const RepeatCellRequest = {
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
  type: "object",
  properties: {
    source: GridRange,
    destination: GridCoordinate,
    pasteType: PasteType
  },
  required: ["source", "destination"]
};

export const CopyPasteRequest = {
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
  type: "object",
  properties: {
    range: GridRange,
    mergeType: MergeType
  },
  required: ["range", "mergeType"]
};

export const UnmergeCellsRequest = {
  type: "object",
  properties: {
    range: GridRange
  },
  required: ["range"]
};

export const UpdateBordersRequest = {
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
  type: "object",
  properties: {
    rows: {
      type: "array",
      description: "The rows to update. At least one row must be specified.",
      items: RowData
    },
    fields: {
      type: "string",
      description: "The fields of CellData that should be updated. At least one field must be specified."
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
  type: "object",
  properties: {
    properties: SheetProperties
  },
  required: ["properties"]
};

export const DeleteSheetRequest = {
  type: "object",
  properties: {
    sheetId: { type: "integer" }
  },
  required: ["sheetId"]
};

export const SourceAndDestination = {
  type: "object",
  properties: {
    source: GridRange,
    dimension: Dimension,
    fillLength: { type: "integer" }
  },
  required: ["source", "dimension", "fillLength"]
};

export const AutoFillRequest = {
  type: "object",
  properties: {
    useAlternateSeries: { type: "boolean" },
    range: GridRange,
    sourceAndDestination: SourceAndDestination
  },
  required: ["useAlternateSeries", "range"]
};

export const DuplicateSheetRequest = {
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
  type: "object",
  properties: {
    filter: FilterView
  },
  required: ["filter"]
};

export const UpdateFilterViewRequest = {
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
  type: "object",
  properties: {
    filterId: { type: "integer" }
  },
  required: ["filterId"]
};

export const ClearBasicFilterRequest = {
  type: "object",
  properties: {
    sheetId: { type: "integer" }
  },
  required: ["sheetId"]
};

// Dimension Operations
export const AppendDimensionRequest = {
  type: "object",
  properties: {
    sheetId: { type: "integer" },
    dimension: { type: "string", enum: ["ROWS", "COLUMNS"] },
    length: { type: "integer" }
  },
  required: ["sheetId", "dimension", "length"]
};

export const DeleteDimensionRequest = {
  type: "object",
  properties: {
    range: DimensionRange
  },
  required: ["range"]
};

// Auto Resize Request
export const AutoResizeDimensionsRequest = {
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
  type: "object",
  properties: {
    chart: EmbeddedChart
  },
  required: ["chart"]
};

// Protected Range Operations
export const AddProtectedRangeRequest = {
  type: "object",
  properties: {
    protectedRange: ProtectedRange
  },
  required: ["protectedRange"]
};

export const UpdateProtectedRangeRequest = {
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
  type: "object",
  properties: {
    protectedRangeId: { type: "integer" }
  },
  required: ["protectedRangeId"]
};

// Data Manipulation Requests
export const TextToColumnsRequest = {
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
  type: "object",
  properties: {
    range: GridRange,
    shiftDimension: Dimension
  },
  required: ["range", "shiftDimension"]
};

export const InsertRangeRequest = {
  type: "object",
  properties: {
    range: GridRange,
    shiftDimension: Dimension
  },
  required: ["range", "shiftDimension"]
};

export const MoveDimensionRequest = {
  type: "object",
  properties: {
    source: DimensionRange,
    destinationIndex: { type: "integer" }
  },
  required: ["source", "destinationIndex"]
};

// Formatting Requests
export const AddConditionalFormatRuleRequest = {
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
  type: "object",
  properties: {
    range: GridRange,
    rule: DataValidationRule
  },
  required: ["range"]
};

export const SetBasicFilterRequest = {
  type: "object",
  properties: {
    filter: BasicFilter
  },
  required: ["filter"]
};

export const SortRangeRequest = {
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
  type: "object",
  properties: {
    bandedRange: BandedRange
  },
  required: ["bandedRange"]
};

export const UpdateBandingRequest = {
  type: "object",
  properties: {
    bandedRange: BandedRange,
    fields: { type: "string" }
  },
  required: ["bandedRange", "fields"]
};

export const DeleteBandingRequest = {
  type: "object",
  properties: {
    bandedRangeId: { type: "integer" }
  },
  required: ["bandedRangeId"]
};

// Developer Metadata Operations
export const CreateDeveloperMetadataRequest = {
  type: "object",
  properties: {
    developerMetadata: DeveloperMetadata
  },
  required: ["developerMetadata"]
};

export const UpdateDeveloperMetadataRequest = {
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
  type: "object",
  properties: {
    dataFilter: DataFilter
  },
  required: ["dataFilter"]
};

// Dimension Group Operations
export const AddDimensionGroupRequest = {
  type: "object",
  properties: {
    range: DimensionRange
  },
  required: ["range"]
};

export const DeleteDimensionGroupRequest = {
  type: "object",
  properties: {
    range: DimensionRange
  },
  required: ["range"]
};

export const UpdateDimensionGroupRequest = {
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

// Data Source Operations



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
  type: "object",
  properties: {
    dataSource: DataSource
  },
  required: ["dataSource"]
};

export const UpdateDataSourceRequest = {
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
  type: "object",
  properties: {
    dataSourceId: { type: "string" }
  },
  required: ["dataSourceId"]
};

export const RefreshDataSourceRequest = {
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
  type: "object",
  properties: {
    range: GridRange
  },
  required: ["range"]
};

export const DeleteDuplicatesRequest = {
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
  type: "object",
  properties: {
    slicer: Slicer
  },
  required: ["slicer"]
};

export const UpdateSlicerSpecRequest = {
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
  type: "object",
  properties: {
    objectId: { type: "integer" }
  },
  required: ["objectId"]
};

export const DuplicateFilterViewRequest = {
  type: "object",
  properties: {
    filterId: { type: "integer" }
  },
  required: ["filterId"]
};

export const FindReplaceRequest = {
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
  type: "object",
  properties: {
    range: DimensionRange,
    inheritFromBefore: { type: "boolean" }
  },
  required: ["range"]
};

export const UpdateEmbeddedObjectPositionRequest = {
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
  type: "object",
  properties: {
    range: GridRange
  },
  required: ["range"]
};

export const TrimSheetRequest = {
  type: "object",
  properties: {
    range: GridRange
  },
  required: ["range"]
};

export const UpdateChartSpecRequest = {
  type: "object",
  properties: {
    chartId: { type: "integer" },
    spec: { type: "object", ref: "ChartSpec" }
  },
  required: ["chartId", "spec"]
};

export const UpdateEmbeddedObjectRequest = {
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
