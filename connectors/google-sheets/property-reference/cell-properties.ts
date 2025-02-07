import {
  ColorStyle,
  TextFormat,
  ExtendedValue,
  BooleanCondition,
  DataExecutionStatus,
  DataSourceColumnReference,
  FilterSpec,
  SortSpec
} from "./other-properties";
import { PivotTable } from "./pivot-table-properties";

/* Google Sheets API Cell Property References */

// 1. Basic Enums (no dependencies)
export const NumberFormatType = {
  type: "string",
  enum: [
    "NUMBER_FORMAT_TYPE_UNSPECIFIED",
    "TEXT",
    "NUMBER",
    "PERCENT",
    "CURRENCY",
    "DATE",
    "TIME",
    "DATE_TIME",
    "SCIENTIFIC"
  ]
};

export const Style = {
  type: "string",
  enum: [
    "STYLE_UNSPECIFIED",
    "DOTTED",
    "DASHED",
    "SOLID",
    "SOLID_MEDIUM",
    "SOLID_THICK",
    "NONE",
    "DOUBLE"
  ]
};

export const VerticalAlign = {
  type: "string",
  enum: [
    "VERTICAL_ALIGN_UNSPECIFIED",
    "TOP",
    "MIDDLE",
    "BOTTOM"
  ]
};

export const WrapStrategy = {
  type: "string",
  enum: [
    "WRAP_STRATEGY_UNSPECIFIED",
    "OVERFLOW_CELL",
    "LEGACY_WRAP",
    "CLIP",
    "WRAP"
  ]
};

export const TextDirection = {
  type: "string",
  enum: [
    "TEXT_DIRECTION_UNSPECIFIED",
    "LEFT_TO_RIGHT",
    "RIGHT_TO_LEFT"
  ]
};

export const HyperlinkDisplayType = {
  type: "string",
  enum: [
    "HYPERLINK_DISPLAY_TYPE_UNSPECIFIED",
    "LINKED",
    "PLAIN_TEXT"
  ]
};

// 2. Simple Objects
export const NumberFormat = {
  type: "object",
  properties: {
    type: NumberFormatType,
    pattern: { type: "string" }
  },
  required: ["type"]
};

export const Border = {
  type: "object",
  properties: {
    style: Style,
    width: { type: "integer", deprecated: true },
    color: { type: "object", ref: "Color", deprecated: true },
    colorStyle: ColorStyle
  }
};

export const Borders = {
  type: "object",
  properties: {
    top: Border,
    bottom: Border,
    left: Border,
    right: Border
  }
};

export const Padding = {
  type: "object",
  properties: {
    top: { type: "integer" },
    right: { type: "integer" },
    bottom: { type: "integer" },
    left: { type: "integer" }
  }
};

export const TextRotation = {
  type: "object",
  oneOf: [
    {
      properties: {
        angle: { 
          type: "integer",
          minimum: -90,
          maximum: 90
        }
      }
    },
    {
      properties: {
        vertical: { type: "boolean" }
      }
    }
  ]
};

export const TextFormatRun = {
  type: "object",
  properties: {
    startIndex: { type: "integer" },
    format: TextFormat
  },
  required: ["startIndex", "format"]
};

export const DataValidationRule = {
  type: "object",
  properties: {
    condition: BooleanCondition,
    inputMessage: { type: "string" },
    strict: { type: "boolean" },
    showCustomUi: { type: "boolean" }
  },
  required: ["condition"]
};

// 3. Complex Objects
export const CellFormat = {
  type: "object",
  properties: {
    numberFormat: NumberFormat,
    backgroundColor: { type: "object", ref: "Color", deprecated: true },
    backgroundColorStyle: ColorStyle,
    borders: Borders,
    padding: Padding,
    horizontalAlignment: { type: "string" },
    verticalAlignment: VerticalAlign,
    wrapStrategy: WrapStrategy,
    textDirection: TextDirection,
    textFormat: TextFormat,
    hyperlinkDisplayType: HyperlinkDisplayType,
    textRotation: TextRotation
  }
};

// Add the missing enum
export const DataSourceTableColumnSelectionType = {
  type: "string",
  enum: [
    "DATA_SOURCE_TABLE_COLUMN_SELECTION_TYPE_UNSPECIFIED",
    "SELECTED",
    "SYNC_ALL"
  ]
};

// Add DataSourceTable schema
export const DataSourceTable = {
  type: "object",
  description: "A data source table, which allows the user to import a static table of data from the DataSource into Sheets",
  properties: {
    dataSourceId: { type: "string" },
    columnSelectionType: DataSourceTableColumnSelectionType,
    columns: {
      type: "array",
      items: DataSourceColumnReference
    },
    filterSpecs: {
      type: "array",
      items: FilterSpec
    },
    sortSpecs: {
      type: "array",
      items: SortSpec
    },
    rowLimit: { type: "integer" },
    dataExecutionStatus: DataExecutionStatus
  },
  required: ["dataSourceId"]
};

// Add DataSourceFormula schema
export const DataSourceFormula = {
  type: "object",
  description: "A data source formula",
  properties: {
    dataSourceId: { type: "string" },
    dataExecutionStatus: DataExecutionStatus
  },
  required: ["dataSourceId"]
};

// 4. Main Cell Object
export const CellData = {
  type: "object",
  description: "Data about a specific cell",
  properties: {
    userEnteredValue: ExtendedValue,
    effectiveValue: ExtendedValue,
    formattedValue: { type: "string" },
    userEnteredFormat: CellFormat,
    effectiveFormat: CellFormat,
    hyperlink: { type: "string" },
    note: { type: "string" },
    textFormatRuns: {
      type: "array",
      items: TextFormatRun
    },
    dataValidation: DataValidationRule,
    pivotTable: PivotTable,
    dataSourceTable: DataSourceTable,
    dataSourceFormula: DataSourceFormula
  }
};
