import { GridRange } from "./other-properties";
import { DeveloperMetadataLookup } from "./spreadsheets-developer-metadata";

export const DataFilter = {
  type: "object",
  properties: {
    developerMetadataLookup: { type: "object", properties: DeveloperMetadataLookup },
    a1Range: { type: "string" },
    gridRange: { type: "object", properties: GridRange }
  },
  oneOf: [
    { required: ["developerMetadataLookup"] },
    { required: ["a1Range"] },
    { required: ["gridRange"] }
  ]
}

