

/* Other Google Sheets API Property References */
export const Color = {
  type: "object",
  description: "Represents a color in the RGBA color space",
  properties: {
    red: {
      type: "number",
      description: "The amount of red in the color as a value in the interval [0, 1]"
    },
    green: {
      type: "number",
      description: "The amount of green in the color as a value in the interval [0, 1]"
    },
    blue: {
      type: "number",
      description: "The amount of blue in the color as a value in the interval [0, 1]"
    },
    alpha: {
      type: "number",
      description: "The fraction of this color that should be applied to the pixel. A value of 1.0 corresponds to a solid color, whereas 0.0 corresponds to a completely transparent color."
    }
  },
  required: ["red", "green", "blue"]
};

export const ThemeColorType = {
  type: "string",
  description: "Theme color types",
  enum: [
    "THEME_COLOR_TYPE_UNSPECIFIED",
    "TEXT",
    "BACKGROUND",
    "ACCENT1",
    "ACCENT2",
    "ACCENT3",
    "ACCENT4",
    "ACCENT5",
    "ACCENT6",
    "LINK"
  ]
};

export const ColorStyle = {
  type: "object",
  description: "A color value",
  properties: {
    rgbColor: Color,
    themeColor: ThemeColorType
  },
  oneOf: [
    { required: ["rgbColor"] },
    { required: ["themeColor"] }
  ]
};

export const HorizontalAlign = {
  type: "string",
  description: "The horizontal alignment of text in a cell",
  enum: [
    "HORIZONTAL_ALIGN_UNSPECIFIED",
    "LEFT",
    "CENTER",
    "RIGHT"
  ]
};

export const Link = {
  type: "object",
  description: "An external or local reference",
  properties: {
    uri: {
      type: "string",
      description: "The link identifier"
    }
  },
  required: ["uri"]
};

export const TextFormat = {
  type: "object",
  description: "The format of a run of text in a cell",
  properties: {
    foregroundColor: Color,
    foregroundColorStyle: ColorStyle,
    fontFamily: {
      type: "string",
      description: "The font family"
    },
    fontSize: {
      type: "integer",
      description: "The size of the font"
    },
    bold: {
      type: "boolean",
      description: "True if the text is bold"
    },
    italic: {
      type: "boolean",
      description: "True if the text is italicized"
    },
    strikethrough: {
      type: "boolean",
      description: "True if the text has a strikethrough"
    },
    underline: {
      type: "boolean",
      description: "True if the text is underlined"
    },
    link: Link
  }
};

export const DataSourceColumnReference = {
  type: "object",
  description: "An unique identifier that references a data source column",
  properties: {
    name: {
      type: "string",
      description: "The display name of the column. It should be unique within a data source"
    }
  },
  required: ["name"]
};

export const DataSourceColumn = {
  type: "object",
  description: "A column in a data source",
  properties: {
    reference: DataSourceColumnReference,
    formula: {
      type: "string",
      description: "The formula of the column"
    }
  },
};

export const DataExecutionState = {
  type: "string",
  description: "An enumeration of data execution states",
  enum: [
    "DATA_EXECUTION_STATE_UNSPECIFIED",
    "NOT_STARTED",
    "RUNNING",
    "CANCELLING",
    "SUCCEEDED",
    "FAILED"
  ]
};

export const DataExecutionErrorCode = {
  type: "string",
  description: "An enumeration of data execution error code",
  enum: [
    "DATA_EXECUTION_ERROR_CODE_UNSPECIFIED",
    "TIMED_OUT",
    "TOO_MANY_ROWS",
    "TOO_MANY_COLUMNS",
    "TOO_MANY_CELLS",
    "ENGINE",
    "PARAMETER_INVALID",
    "UNSUPPORTED_DATA_TYPE",
    "DUPLICATE_COLUMN_NAMES",
    "INTERRUPTED",
    "CONCURRENT_QUERY",
    "OTHER",
    "TOO_MANY_CHARS_PER_CELL",
    "DATA_NOT_FOUND",
    "PERMISSION_DENIED",
    "MISSING_COLUMN_ALIAS",
    "OBJECT_NOT_FOUND",
    "OBJECT_IN_ERROR_STATE",
    "OBJECT_SPEC_INVALID",
    "DATA_EXECUTION_CANCELLED"
  ]
};

export const DataExecutionStatus = {
  type: "object",
  description: "The data execution status",
  properties: {
    state: DataExecutionState,
    errorCode: DataExecutionErrorCode,
    errorMessage: {
      type: "string",
      description: "The error message, which may be empty"
    },
    lastRefreshTime: {
      type: "string",
      format: "date-time",
      description: "Gets the time the data last successfully refreshed"
    }
  },
  required: ["state"]
};

export const ErrorType = {
  type: "string",
  description: "The type of error",
  enum: [
    "ERROR_TYPE_UNSPECIFIED",
    "ERROR",
    "NULL_VALUE",
    "DIVIDE_BY_ZERO",
    "VALUE",
    "REF",
    "NAME",
    "NUM",
    "N_A",
    "LOADING"
  ]
};

export const ErrorValue = {
  type: "object",
  description: "An error in a cell",
  properties: {
    type: ErrorType,
    message: {
      type: "string",
      description: "A message with more information about the error"
    }
  },
  required: ["type"]
};

export const ExtendedValue = {
  type: "object",
  description: "The kinds of value that a cell in a spreadsheet can have",
  properties: {
    numberValue: {
      type: "number",
      description: "Represents a double value. Note: Dates, Times and DateTimes are represented as doubles in SERIAL_NUMBER format"
    },
    stringValue: {
      type: "string",
      description: "Represents a string value"
    },
    boolValue: {
      type: "boolean",
      description: "Represents a boolean value"
    },
    formulaValue: {
      type: "string",
      description: "Represents a formula"
    },
    errorValue: ErrorValue
  },
  oneOf: [
    { required: ["numberValue"] },
    { required: ["stringValue"] },
    { required: ["boolValue"] },
    { required: ["formulaValue"] },
    { required: ["errorValue"] }
  ]
};

export const RelativeDate = {
  type: "string",
  description: "Controls how a date condition is evaluated",
  enum: [
    "RELATIVE_DATE_UNSPECIFIED",
    "PAST_YEAR",
    "PAST_MONTH",
    "PAST_WEEK",
    "YESTERDAY",
    "TODAY",
    "TOMORROW"
  ]
};

export const GridRange = {
  type: "object",
  description: "A range on a sheet. All indexes are zero-based",
  properties: {
    sheetId: { type: "integer" },
    startRowIndex: { type: "integer" },
    endRowIndex: { type: "integer" },
    startColumnIndex: { type: "integer" },
    endColumnIndex: { type: "integer" }
  }
};

export const ConditionValue = {
  type: "object",
  description: "The value of the condition",
  properties: {
    relativeDate: RelativeDate,
    userEnteredValue: {
      type: "string",
      description: "A value the condition is based on. The value is parsed as if the user typed into a cell"
    }
  },
  oneOf: [
    { required: ["relativeDate"] },
    { required: ["userEnteredValue"] }
  ]
};

export const ConditionType = {
  type: "string",
  description: "The type of condition",
  enum: [
    "CONDITION_TYPE_UNSPECIFIED",
    "NUMBER_GREATER",
    "NUMBER_GREATER_THAN_EQ",
    "NUMBER_LESS",
    "NUMBER_LESS_THAN_EQ",
    "NUMBER_EQ",
    "NUMBER_NOT_EQ",
    "NUMBER_BETWEEN",
    "NUMBER_NOT_BETWEEN",
    "TEXT_CONTAINS",
    "TEXT_NOT_CONTAINS",
    "TEXT_STARTS_WITH",
    "TEXT_ENDS_WITH",
    "TEXT_EQ",
    "TEXT_IS_EMAIL",
    "TEXT_IS_URL",
    "DATE_EQ",
    "DATE_BEFORE",
    "DATE_AFTER",
    "DATE_ON_OR_BEFORE",
    "DATE_ON_OR_AFTER",
    "DATE_BETWEEN",
    "DATE_NOT_BETWEEN",
    "DATE_IS_VALID",
    "ONE_OF_RANGE",
    "ONE_OF_LIST",
    "BLANK",
    "NOT_BLANK",
    "CUSTOM_FORMULA",
    "BOOLEAN",
    "TEXT_NOT_EQ",
    "DATE_NOT_EQ",
    "FILTER_EXPRESSION"
  ]
};

export const BooleanCondition = {
  type: "object",
  description: "A condition that can evaluate to true or false",
  properties: {
    type: ConditionType,
    values: {
      type: "array",
      items: ConditionValue,
      description: "The values of the condition. The number of supported values depends on the condition type"
    }
  },
  required: ["type"]
};

export const SortOrder = {
  type: "string",
  description: "A sort order",
  enum: [
    "SORT_ORDER_UNSPECIFIED",
    "ASCENDING",
    "DESCENDING"
  ]
};

export const FilterCriteria = {
  type: "object",
  description: "Criteria for showing/hiding rows in a filter or filter view",
  properties: {
    hiddenValues: {
      type: "array",
      items: { type: "string" },
      description: "Values that should be hidden"
    },
    condition: BooleanCondition,
    visibleBackgroundColor: Color,
    visibleBackgroundColorStyle: ColorStyle,
    visibleForegroundColor: Color,
    visibleForegroundColorStyle: ColorStyle
  }
};

export const FilterSpec = {
  type: "object",
  description: "The filter criteria associated with a specific column",
  properties: {
    filterCriteria: FilterCriteria,
    columnIndex: {
      type: "integer",
      description: "The zero-based column index"
    },
    dataSourceColumnReference: DataSourceColumnReference
  },
  oneOf: [
    { required: ["columnIndex"] },
    { required: ["dataSourceColumnReference"] }
  ]
};

export const SortSpec = {
  type: "object",
  description: "A sort order associated with a specific column or row",
  properties: {
    sortOrder: SortOrder,
    foregroundColor: Color,
    foregroundColorStyle: ColorStyle,
    backgroundColor: Color,
    backgroundColorStyle: ColorStyle,
    dimensionIndex: {
      type: "integer",
      description: "The dimension the sort should be applied to"
    },
    dataSourceColumnReference: DataSourceColumnReference
  },
  oneOf: [
    { required: ["dimensionIndex"] },
    { required: ["dataSourceColumnReference"] }
  ]
};

export const GridCoordinate = {
  type: "object",
  description: "A coordinate in a sheet. All indexes are zero-based",
  properties: {
    sheetId: { type: "integer" },
    rowIndex: { type: "integer" },
    columnIndex: { type: "integer" }
  }
}

export const OverlayPosition = {
  type: "object",
  description: "The location an object is overlaid on top of a grid",
  properties: {
    anchorCell: GridCoordinate,
    offsetXPixels: {
      type: "integer",
      description: "The horizontal offset, in pixels, that the object is offset from the anchor cell"
    },
    offsetYPixels: {
      type: "integer",
      description: "The vertical offset, in pixels, that the object is offset from the anchor cell"
    },
    widthPixels: {
      type: "integer",
      description: "The width of the object, in pixels. Defaults to 600"
    },
    heightPixels: {
      type: "integer",
      description: "The height of the object, in pixels. Defaults to 371"
    }
  },
  required: ["anchorCell"]
};

export const EmbeddedObjectPosition = {
  type: "object",
  description: "The position of an embedded object such as a chart",
  properties: {
    sheetId: { type: "integer" },
    overlayPosition: OverlayPosition,
    newSheet: { type: "boolean" }
  }
}

