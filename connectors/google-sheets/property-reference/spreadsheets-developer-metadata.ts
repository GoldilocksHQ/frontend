import { DimensionRange } from "./base-types"

export const DeveloperMetadataLocationType = {
  type: "string",
  enum: ["DEVELOPER_METADATA_LOCATION_TYPE_UNSPECIFIED", "ROW", "COLUMN", "SHEET", "SPREADSHEET"]
}

export const DeveloperMetadataVisibility = {
  type: "string",
  enum: ["DEVELOPER_METADATA_VISIBILITY_UNSPECIFIED", "DOCUMENT", "PROJECT"]
}

export const DeveloperMetadataLocation = {
  type: "object",
  properties: {
    locationType: { type: "string", enum: DeveloperMetadataLocationType },
    spreadsheet: { type: "boolean" },
    sheetId: { type: "integer" },
    dimensionRange: { type: "object", properties: DimensionRange }
  }
}

export const DeveloperMetadata = {
  type: "object",
  properties: {
    metadataId: { type: "integer" },
    metadataKey: { type: "string" },
    metadataValue: { type: "string" },
    location: { type: "object", properties: DeveloperMetadataLocation },
    visibility: { type: "string", enum: DeveloperMetadataVisibility }
  }
}

export const DeveloperMetadataLocationMatchingStrategy = {
  type: "string",
  enum: ["DEVELOPER_METADATA_LOCATION_MATCHING_STRATEGY_UNSPECIFIED", "EXACT_LOCATION", "INTERSECTING_LOCATION"]
}

export const DeveloperMetadataLookup = {
  type: "object",
  properties: {
    locationType: { type: "string", enum: DeveloperMetadataLocationType },
    metadataLocation: { type: "object", properties: DeveloperMetadataLocation },
    locationMatchingStrategy: { type: "string", enum: DeveloperMetadataLocationMatchingStrategy },
    metadataId: { type: "integer" },
    metadataKey: { type: "string" },
    metadataValue: { type: "string" },
    visibility: { type: "string", enum: DeveloperMetadataVisibility }
  }
}