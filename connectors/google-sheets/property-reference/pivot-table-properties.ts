import {
  ExtendedValue,
  GridRange,
  DataSourceColumnReference,
  BooleanCondition,
  DataExecutionStatus
} from "./other-properties";

/* Google Sheets API Pivot Table Property References */

// 1. Basic Enums (no dependencies)
export const DateTimeRuleType = {
  type: "string",
  enum: [
    "DATE_TIME_RULE_TYPE_UNSPECIFIED",
    "SECOND",
    "MINUTE",
    "HOUR",
    "HOUR_MINUTE",
    "HOUR_MINUTE_AMPM",
    "DAY_OF_WEEK",
    "DAY_OF_YEAR",
    "DAY_OF_MONTH",
    "DAY_MONTH",
    "MONTH",
    "QUARTER",
    "YEAR",
    "YEAR_MONTH",
    "YEAR_QUARTER",
    "YEAR_MONTH_DAY"
  ]
};

export const PivotValueSummarizeFunction = {
  type: "string",
  enum: [
    "PIVOT_STANDARD_VALUE_FUNCTION_UNSPECIFIED",
    "SUM",
    "COUNTA",
    "COUNT",
    "COUNTUNIQUE",
    "AVERAGE",
    "MAX",
    "MIN",
    "MEDIAN",
    "PRODUCT",
    "STDEV",
    "STDEVP",
    "VAR",
    "VARP",
    "CUSTOM",
    "NONE"
  ]
};

export const PivotValueCalculatedDisplayType = {
  type: "string",
  enum: [
    "PIVOT_VALUE_CALCULATED_DISPLAY_TYPE_UNSPECIFIED",
    "PERCENT_OF_ROW_TOTAL",
    "PERCENT_OF_COLUMN_TOTAL",
    "PERCENT_OF_GRAND_TOTAL"
  ]
};

export const PivotValueLayout = {
  type: "string",
  enum: [
    "HORIZONTAL",
    "VERTICAL"
  ]
};

// 2. Simple Objects (depend on basic types or enums)
export const DateTimeRule = {
  type: "object",
  properties: {
    type: DateTimeRuleType
  },
  required: ["type"]
};

export const HistogramRule = {
  type: "object",
  properties: {
    interval: { type: "number" },
    start: { type: "number" },
    end: { type: "number" }
  },
  required: ["interval"]
};

export const ManualRuleGroup = {
  type: "object",
  properties: {
    groupName: ExtendedValue,
    items: {
      type: "array",
      items: ExtendedValue
    }
  },
  required: ["groupName", "items"]
};

export const ManualRule = {
  type: "object",
  properties: {
    groups: {
      type: "array",
      items: ManualRuleGroup
    }
  },
  required: ["groups"]
};

export const PivotGroupValueMetadata = {
  type: "object",
  properties: {
    value: ExtendedValue,
    collapsed: { type: "boolean" }
  }
};

export const PivotGroupSortValueBucket = {
  type: "object",
  properties: {
    valuesIndex: { type: "integer" },
    buckets: {
      type: "array",
      items: ExtendedValue
    }
  }
};

export const PivotGroupLimit = {
  type: "object",
  properties: {
    countLimit: { type: "integer" },
    applyOrder: { type: "integer" }
  }
};

// 3. Complex Objects (depend on simple objects)
export const PivotGroupRule = {
  type: "object",
  oneOf: [
    {
      properties: {
        manualRule: ManualRule
      },
      required: ["manualRule"]
    },
    {
      properties: {
        histogramRule: HistogramRule
      },
      required: ["histogramRule"]
    },
    {
      properties: {
        dateTimeRule: DateTimeRule
      },
      required: ["dateTimeRule"]
    }
  ]
};

export const PivotFilterCriteria = {
  type: "object",
  properties: {
    visibleValues: {
      type: "array",
      items: { type: "string" }
    },
    condition: BooleanCondition,
    visibleByDefault: { type: "boolean" }
  }
};

export const PivotValue = {
  type: "object",
  properties: {
    summarizeFunction: PivotValueSummarizeFunction,
    name: { type: "string" },
    calculatedDisplayType: PivotValueCalculatedDisplayType,
    sourceColumnOffset: { type: "integer" },
    formula: { type: "string" },
    dataSourceColumnReference: DataSourceColumnReference
  },
  oneOf: [
    { required: ["sourceColumnOffset"] },
    { required: ["formula"] },
    { required: ["dataSourceColumnReference"] }
  ]
};

export const PivotFilterSpec = {
  type: "object",
  properties: {
    filterCriteria: PivotFilterCriteria,
    columnOffsetIndex: { type: "integer" },
    dataSourceColumnReference: DataSourceColumnReference
  },
  oneOf: [
    { required: ["columnOffsetIndex"] },
    { required: ["dataSourceColumnReference"] }
  ]
};

export const PivotGroup = {
  type: "object",
  properties: {
    showTotals: { type: "boolean" },
    valueMetadata: {
      type: "array",
      items: PivotGroupValueMetadata
    },
    sortOrder: { type: "string" },
    valueBucket: PivotGroupSortValueBucket,
    repeatHeadings: { type: "boolean" },
    label: { type: "string" },
    groupRule: PivotGroupRule,
    groupLimit: PivotGroupLimit,
    sourceColumnOffset: { type: "integer" },
    dataSourceColumnReference: DataSourceColumnReference
  },
  oneOf: [
    { required: ["sourceColumnOffset"] },
    { required: ["dataSourceColumnReference"] }
  ]
};

// 4. Main PivotTable Object
export const PivotTable = {
  type: "object",
  properties: {
    rows: {
      type: "array",
      items: PivotGroup
    },
    columns: {
      type: "array",
      items: PivotGroup
    },
    criteria: {
      type: "object",
      additionalProperties: PivotFilterCriteria
    },
    filterSpecs: {
      type: "array",
      items: PivotFilterSpec
    },
    values: {
      type: "array",
      items: PivotValue
    },
    valueLayout: PivotValueLayout,
    dataExecutionStatus: DataExecutionStatus,
    source: GridRange,
    dataSourceId: { type: "string" }
  },
  oneOf: [
    { required: ["source"] },
    { required: ["dataSourceId"] }
  ]
};

