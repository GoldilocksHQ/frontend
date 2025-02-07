import {
  GridRange,
  ColorStyle,
  DataSourceColumn
} from "./other-properties";

import { Sheet } from "./sheets-properties";
import { CellFormat } from "./cell-properties";
// Basic Enums
export const RecalculationInterval = {
  type: "string",
  enum: [
    "RECALCULATION_INTERVAL_UNSPECIFIED",
    "ON_CHANGE",
    "MINUTE",
    "HOUR"
  ]
};

export const DataSourceRefreshScope = {
  type: "string",
  enum: [
    "DATA_SOURCE_REFRESH_SCOPE_UNSPECIFIED",
    "ALL_DATA_SOURCES"
  ]
};

export const DayOfWeek = {
  type: "string",
  enum: [
    "DAY_OF_WEEK_UNSPECIFIED",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY"
  ]
};

// Add TimeOfDay schema
export const TimeOfDay = {
  type: "object",
  description: "Represents a time of day. The date and time zone are either not significant or are specified elsewhere.",
  properties: {
    hours: { 
      type: "integer",
      minimum: 0,
      maximum: 24,
      description: "Hours of day in 24 hour format. Should be from 0 to 23. An API may choose to allow the value '24:00:00' for scenarios like business closing time."
    },
    minutes: { 
      type: "integer",
      minimum: 0,
      maximum: 59,
      description: "Minutes of hour of day. Must be from 0 to 59."
    },
    seconds: { 
      type: "integer",
      minimum: 0,
      maximum: 60,
      description: "Seconds of minutes of the time. Must normally be from 0 to 59. An API may allow the value 60 if it allows leap-seconds."
    },
    nanos: { 
      type: "integer",
      minimum: 0,
      maximum: 999999999,
      description: "Fractions of seconds in nanoseconds. Must be from 0 to 999,999,999."
    }
  }
};

// Theme-related schemas
export const ThemeColorPair = {
  type: "object",
  properties: {
    colorType: { type: "string", ref: "ThemeColorType" },
    color: ColorStyle
  }
};

export const SpreadsheetTheme = {
  type: "object",
  properties: {
    primaryFontFamily: { type: "string" },
    themeColors: {
      type: "array",
      items: ThemeColorPair
    }
  }
};

// Calculation settings
export const IterativeCalculationSettings = {
  type: "object",
  properties: {
    maxIterations: { type: "integer" },
    convergenceThreshold: { type: "number" }
  }
};

// Data source related schemas
export const BigQueryTableSpec = {
  type: "object",
  properties: {
    tableProjectId: { type: "string" },
    tableId: { type: "string" },
    datasetId: { type: "string" }
  }
};

export const BigQueryQuerySpec = {
  type: "object",
  properties: {
    rawQuery: { type: "string" }
  }
};

export const BigQueryDataSourceSpec = {
  type: "object",
  properties: {
    projectId: { type: "string" },
    querySpec: BigQueryQuerySpec,
    tableSpec: BigQueryTableSpec
  },
  oneOf: [
    { required: ["querySpec"] },
    { required: ["tableSpec"] }
  ]
};

export const LookerDataSourceSpec = {
  type: "object",
  properties: {
    instanceUri: { type: "string" },
    model: { type: "string" },
    explore: { type: "string" }
  }
};

export const DataSourceSpec = {
  type: "object",
  properties: {
    parameters: {
      type: "array",
      items: { type: "object", ref: "DataSourceParameter" }
    },
    bigQuery: BigQueryDataSourceSpec,
    looker: LookerDataSourceSpec
  },
  oneOf: [
    { required: ["bigQuery"] },
    { required: ["looker"] }
  ]
};

// Refresh schedule schemas
export const Interval = {
  type: "object",
  properties: {
    startTime: { type: "string", format: "timestamp" },
    endTime: { type: "string", format: "timestamp" }
  }
};

export const DataSourceRefreshDailySchedule = {
  type: "object",
  properties: {
    startTime: TimeOfDay
  }
};

export const DataSourceRefreshWeeklySchedule = {
  type: "object",
  properties: {
    startTime: TimeOfDay,
    daysOfWeek: {
      type: "array",
      items: DayOfWeek
    }
  }
};

export const DataSourceRefreshMonthlySchedule = {
  type: "object",
  properties: {
    startTime: TimeOfDay,
    daysOfMonth: {
      type: "array",
      items: { type: "integer", minimum: 1, maximum: 28 }
    }
  }
};

export const DataSourceRefreshSchedule = {
  type: "object",
  properties: {
    enabled: { type: "boolean" },
    refreshScope: DataSourceRefreshScope,
    nextRun: Interval,
    dailySchedule: DataSourceRefreshDailySchedule,
    weeklySchedule: DataSourceRefreshWeeklySchedule,
    monthlySchedule: DataSourceRefreshMonthlySchedule
  },
  oneOf: [
    { required: ["dailySchedule"] },
    { required: ["weeklySchedule"] },
    { required: ["monthlySchedule"] }
  ]
};

// Named Range
export const NamedRange = {
  type: "object",
  properties: {
    namedRangeId: { type: "string" },
    name: { type: "string" },
    range: GridRange
  }
};

// Main Spreadsheet Properties
export const SpreadsheetProperties = {
  type: "object",
  description: "Properties of a spreadsheet",
  properties: {
    title: { type: "string" },
    locale: { type: "string" },
    autoRecalc: RecalculationInterval,
    timeZone: { type: "string" },
    defaultFormat: CellFormat,
    iterativeCalculationSettings: IterativeCalculationSettings,
    spreadsheetTheme: SpreadsheetTheme,
    importFunctionsExternalUrlAccessAllowed: { type: "boolean" }
  }
};

// Main Spreadsheet Schema
export const Spreadsheet = {
  type: "object",
  description: "Resource that represents a spreadsheet",
  properties: {
    spreadsheetId: { type: "string" },
    properties: SpreadsheetProperties,
    sheets: {
      type: "array",
      items: Sheet
    },
    namedRanges: {
      type: "array",
      items: NamedRange
    },
    spreadsheetUrl: { type: "string" },
    developerMetadata: {
      type: "array",
      items: { type: "object", ref: "DeveloperMetadata" }
    },
    dataSources: {
      type: "array",
      items: { type: "object", ref: "DataSource" }
    },
    dataSourceSchedules: {
      type: "array",
      items: DataSourceRefreshSchedule
    }
  },
  required: ["spreadsheetId"]
};

// Data Source related schemas
export const DataSource = {
  type: "object",
  description: "Information about an external data source in the spreadsheet",
  properties: {
    dataSourceId: {
      type: "string",
      description: "The spreadsheet-scoped unique ID that identifies the data source. Example: 1080547365."
    },
    spec: {
      type: "object",
      description: "The DataSourceSpec for the data source connected with this spreadsheet.",
      ref: "DataSourceSpec"
    },
    calculatedColumns: {
      type: "array",
      description: "All calculated columns in the data source.",
      items: DataSourceColumn
    },
    sheetId: {
      type: "integer",
      description: "The ID of the Sheet connected with the data source. The field cannot be changed once set."
    }
  },
  required: ["dataSourceId", "spec"]
};