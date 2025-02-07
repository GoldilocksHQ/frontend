import { CellData, CellFormat } from "./cell-properties";
import {
  ColorStyle,
  GridRange,
  TextFormat,
  HorizontalAlign,
  EmbeddedObjectPosition,
  FilterCriteria,
  DataSourceColumnReference,
  DataSourceColumn,
  DataExecutionStatus,
  Color,
  BooleanCondition
} from "./other-properties";


// 1. Basic Enums
export const SheetType = {
  type: "string",
  enum: [
    "SHEET_TYPE_UNSPECIFIED",
    "GRID",
    "OBJECT",
    "DATA_SOURCE"
  ]
};

// 2. Basic Objects
export const GridProperties = {
  type: "object",
  properties: {
    rowCount: { type: "integer" },
    columnCount: { type: "integer" },
    frozenRowCount: { type: "integer" },
    frozenColumnCount: { type: "integer" },
    hideGridlines: { type: "boolean" },
    rowGroupControlAfter: { type: "boolean" },
    columnGroupControlAfter: { type: "boolean" }
  }
};

export const DataSourceSheetProperties = {
  type: "object",
  properties: {
    dataSourceId: { type: "string" },
    columns: {
      type: "array",
      items: DataSourceColumn
    },
    dataExecutionStatus: DataExecutionStatus
  }
};

// 3. Sheet Properties
export const SheetProperties = {
  type: "object",
  description: "Properties of a sheet",
  properties: {
    sheetId: { type: "integer" },
    title: { type: "string" },
    index: { type: "integer" },
    sheetType: SheetType,
    gridProperties: GridProperties,
    hidden: { type: "boolean" },
    tabColor: Color,
    tabColorStyle: ColorStyle,
    rightToLeft: { type: "boolean" },
    dataSourceSheetProperties: DataSourceSheetProperties
  },
  required: ["sheetId"]
};

// 4. Cell and Row Data
export const RowData = {
  type: "object",
  properties: {
    values: {
      type: "array",
      items: { 
        type: "object",  
        properties: {
          CellData
        }
      }
    }
  }
};

export const DimensionProperties = {
  type: "object",
  properties: {
    hiddenByFilter: { type: "boolean" },
    hiddenByUser: { type: "boolean" },
    pixelSize: { type: "integer" },
    developerMetadata: {
      type: "array",
      items: { type: "object", ref: "DeveloperMetadata" }
    },
    dataSourceColumnReference: DataSourceColumnReference
  }
};

export const GridData = {
  type: "object",
  properties: {
    startRow: { type: "integer" },
    startColumn: { type: "integer" },
    rowData: {
      type: "array",
      items: RowData
    },
    rowMetadata: {
      type: "array",
      items: DimensionProperties
    },
    columnMetadata: {
      type: "array",
      items: DimensionProperties
    }
  }
};

// 5. Formatting Rules
export const BooleanRule = {
  type: "object",
  properties: {
    condition: BooleanCondition,
    format: CellFormat
  },
  required: ["condition", "format"]
};

export const InterpolationPoint = {
  type: "object",
  properties: {
    colorStyle: ColorStyle,
    type: {
      type: "string",
      description: "The type of the interpolation point.",
      enum: [
        "INTERPOLATION_POINT_TYPE_UNSPECIFIED",
        "MIN",
        "MAX",
        "NUMBER",
        "PERCENT",
        "PERCENTILE"
      ]
    },
    value: { 
      type: "string",
      description: "The value of the interpolation point."
    }
  }
};

export const GradientRule = {
  type: "object",
  properties: {
    minpoint: InterpolationPoint,
    midpoint: InterpolationPoint,
    maxpoint: InterpolationPoint
  }
};

export const ConditionalFormatRule = {
  type: "object",
  properties: {
    ranges: {
      type: "array",
      description: "The ranges to apply the rule to. At least one range must be specified.",
      items: GridRange
    },
    booleanRule: BooleanRule,
    gradientRule: GradientRule
  },
  oneOf: [
    { required: ["booleanRule"] },
    { required: ["gradientRule"] }
  ]
};

// 6. Protected Range
export const Editors = {
  type: "object",
  properties: {
    users: {
      type: "array",
      items: { type: "string" }
    },
    groups: {
      type: "array",
      items: { type: "string" }
    },
    domainUsersCanEdit: { type: "boolean" }
  }
};

export const ProtectedRange = {
  type: "object",
  properties: {
    protectedRangeId: { type: "integer" },
    range: GridRange,
    namedRangeId: { type: "string" },
    description: { type: "string" },
    warningOnly: { type: "boolean" },
    requestingUserCanEdit: { type: "boolean" },
    unprotectedRanges: {
      type: "array",
      items: GridRange
    },
    editors: Editors
  }
};

// 7. Banded Range
export const BandingProperties = {
  type: "object",
  properties: {
    headerColorStyle: ColorStyle,
    firstBandColorStyle: ColorStyle,
    secondBandColorStyle: ColorStyle,
    footerColorStyle: ColorStyle
  }
};

export const BandedRange = {
  type: "object",
  properties: {
    bandedRangeId: { type: "integer" },
    range: GridRange,
    rowProperties: BandingProperties,
    columnProperties: BandingProperties
  }
};

// 8. Dimension Group
export const DimensionGroup = {
  type: "object",
  properties: {
    range: { type: "object", ref: "DimensionRange" },
    depth: { type: "integer" },
    collapsed: { type: "boolean" }
  }
};

// 9. Slicer
export const SlicerSpec = {
  type: "object",
  properties: {
    dataRange: GridRange,
    filterCriteria: FilterCriteria,
    columnIndex: { type: "integer" },
    applyToPivotTables: { type: "boolean" },
    title: { type: "string" },
    textFormat: TextFormat,
    backgroundColorStyle: ColorStyle,
    horizontalAlignment: HorizontalAlign
  }
};

export const Slicer = {
  type: "object",
  properties: {
    slicerId: { type: "integer" },
    spec: SlicerSpec,
    position: EmbeddedObjectPosition
  }
};

// 10. Main Sheet Object
export const Sheet = {
  type: "object",
  description: "A sheet in a spreadsheet",
  properties: {
    properties: SheetProperties,
    data: {
      type: "array",
      items: GridData
    },
    merges: {
      type: "array",
      items: GridRange
    },
    conditionalFormats: {
      type: "array",
      items: ConditionalFormatRule
    },
    filterViews: {
      type: "array",
      items: { type: "object", ref: "FilterView" }
    },
    protectedRanges: {
      type: "array",
      items: ProtectedRange
    },
    basicFilter: { type: "object", ref: "BasicFilter" },
    charts: {
      type: "array",
      items: { type: "object", ref: "EmbeddedChart" }
    },
    bandedRanges: {
      type: "array",
      items: BandedRange
    },
    developerMetadata: {
      type: "array",
      items: { type: "object", ref: "DeveloperMetadata" }
    },
    rowGroups: {
      type: "array",
      items: DimensionGroup
    },
    columnGroups: {
      type: "array",
      items: DimensionGroup
    },
    slicers: {
      type: "array",
      items: Slicer
    }
  }
};

// Filter-related schemas
export const SortSpec = {
  type: "object",
  properties: {
    dimensionIndex: { type: "integer" },
    sortOrder: {
      type: "string",
      enum: ["SORT_ORDER_UNSPECIFIED", "ASCENDING", "DESCENDING"]
    },
    backgroundColor: ColorStyle,
    foregroundColor: ColorStyle,
    dataSourceColumnReference: DataSourceColumnReference
  },
  required: ["dimensionIndex"]
};

export const FilterView = {
  type: "object",
  properties: {
    filterViewId: { type: "integer" },
    title: { type: "string" },
    range: GridRange,
    namedRangeId: { type: "string" },
    sortSpecs: {
      type: "array",
      items: SortSpec
    },
    criteria: {
      type: "object",
      additionalProperties: FilterCriteria
    }
  },
  required: ["filterViewId"]
};

export const BasicFilter = {
  type: "object",
  properties: {
    range: GridRange,
    sortSpecs: {
      type: "array",
      items: SortSpec
    },
    criteria: {
      type: "object",
      additionalProperties: FilterCriteria
    }
  },
  required: ["range"]
};