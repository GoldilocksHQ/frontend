export const Dimension = {
  type: "string",
  enum: [
    "DIMENSION_UNSPECIFIED",
    "ROWS",
    "COLUMNS"
  ]
}

export const DimensionRange = {
  type: "object",
  properties: {
    sheetId: { type: "integer" },
    dimension: { type: "string", enum: Dimension },
    startIndex: { type: "integer" },
    endIndex: { type: "integer" }
  }
}
