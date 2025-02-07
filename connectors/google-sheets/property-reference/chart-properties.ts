import {
  Color,
  ColorStyle,
  EmbeddedObjectPosition,
  TextFormat,
  HorizontalAlign,
  DataSourceColumnReference,
  SortSpec,
  FilterSpec,
  DataExecutionStatus,
  GridRange,
} from "./other-properties";

/* Google Sheets API Chart Property References */

// Basic type definitions and enums
export const ChartNumberFormatSource = {
  type: "string",
  enum: ["CHART_NUMBER_FORMAT_SOURCE_UNDEFINED", "FROM_DATA", "CUSTOM"],
};

export const ChartCustomNumberFormatOptions = {
  type: "object",
  properties: {
    prefix: { type: "string" },
    suffix: { type: "string" },
  },
};

export const DataLabelPlacement = {
  type: "string",
  enum: [
    "DATA_LABEL_PLACEMENT_UNSPECIFIED",
    "CENTER",
    "LEFT",
    "RIGHT",
    "ABOVE",
    "BELOW",
    "INSIDE_END",
    "INSIDE_BASE",
    "OUTSIDE_END",
  ],
};

export const PointShape = {
  type: "string",
  enum: [
    "POINT_SHAPE_UNSPECIFIED",
    "CIRCLE",
    "DIAMOND",
    "HEXAGON",
    "PENTAGON",
    "SQUARE",
    "STAR",
    "TRIANGLE",
    "X_MARK",
  ],
};

export const LineDashType = {
  type: "string",
  enum: [
    "LINE_DASH_TYPE_UNSPECIFIED",
    "INVISIBLE",
    "CUSTOM",
    "SOLID",
    "DOTTED",
    "MEDIUM_DASHED",
    "MEDIUM_DASHED_DOTTED",
    "LONG_DASHED",
    "LONG_DASHED_DOTTED",
  ],
};

export const BasicChartType = {
  type: "string",
  enum: [
    "BASIC_CHART_TYPE_UNSPECIFIED",
    "BAR",
    "LINE",
    "AREA",
    "COLUMN",
    "SCATTER",
    "COMBO",
    "STEPPED_AREA",
  ],
};

export const BasicChartLegendPosition = {
  type: "string",
  enum: [
    "BASIC_CHART_LEGEND_POSITION_UNSPECIFIED",
    "BOTTOM_LEGEND",
    "LEFT_LEGEND",
    "RIGHT_LEGEND",
    "TOP_LEGEND",
    "NO_LEGEND",
  ],
};

export const BasicChartAxisPosition = {
  type: "string",
  enum: [
    "BASIC_CHART_AXIS_POSITION_UNSPECIFIED",
    "BOTTOM_AXIS",
    "LEFT_AXIS",
    "RIGHT_AXIS",
  ],
};

export const ViewWindowMode = {
  type: "string",
  enum: [
    "DEFAULT_VIEW_WINDOW_MODE",
    "VIEW_WINDOW_MODE_UNSUPPORTED",
    "EXPLICIT",
    "PRETTY",
  ],
};

export const ChartDateTimeRuleType = {
  type: "string",
  enum: [
    "CHART_DATE_TIME_RULE_TYPE_UNSPECIFIED",
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
    "YEAR_MONTH_DAY",
  ],
};

export const ChartAggregateType = {
  type: "string",
  enum: [
    "CHART_AGGREGATE_TYPE_UNSPECIFIED",
    "AVERAGE",
    "COUNT",
    "MAX",
    "MEDIAN",
    "MIN",
    "SUM",
  ],
};

export const BasicChartStackedType = {
  type: "string",
  enum: [
    "BASIC_CHART_STACKED_TYPE_UNSPECIFIED",
    "NOT_STACKED",
    "STACKED",
    "PERCENT_STACKED",
  ],
};

export const BasicChartCompareMode = {
  type: "string",
  enum: ["BASIC_CHART_COMPARE_MODE_UNSPECIFIED", "DATUM", "CATEGORY"],
};

export const ChartHiddenDimensionStrategy = {
  type: "string",
  enum: [
    "CHART_HIDDEN_DIMENSION_STRATEGY_UNSPECIFIED",
    "SKIP_HIDDEN_ROWS_AND_COLUMNS",
    "SKIP_HIDDEN_ROWS",
    "SKIP_HIDDEN_COLUMNS",
    "SHOW_ALL",
  ],
};

export const DataLabelType = {
  type: "string",
  enum: ["DATA_LABEL_TYPE_UNSPECIFIED", "NONE", "DATA", "CUSTOM"],
};

// Basic composite types
export const TextPosition = {
  type: "object",
  properties: {
    horizontalAlignment: HorizontalAlign,
  },
};

export const DataSourceChartProperties = {
  type: "object",
  properties: {
    dataSourceId: { type: "string" },
    dataExecutionStatus: DataExecutionStatus,
  },
  required: ["dataSourceId"],
};

export const ChartHistogramRule = {
  type: "object",
  properties: {
    minValue: { type: "number" },
    maxValue: { type: "number" },
    intervalSize: { type: "number" },
  },
};

export const ChartDateTimeRule = {
  type: "object",
  properties: {
    type: ChartDateTimeRuleType,
  },
};

export const ChartGroupRule = {
  type: "object",
  oneOf: [{ required: ["dateTimeRule"] }, { required: ["histogramRule"] }],
  properties: {
    dateTimeRule: ChartDateTimeRule,
    histogramRule: ChartHistogramRule,
  },
};

export const ChartSourceRange = {
  type: "object",
  properties: {
    sources: { type: "array", items: GridRange },
  },
};

export const ChartData = {
  type: "object",
  properties: {
    groupRule: ChartGroupRule,
    aggregateType: ChartAggregateType,
    sourceRange: ChartSourceRange,
    columnReference: DataSourceColumnReference,
  },
  oneOf: [{ required: ["sourceRange"] }, { required: ["columnReference"] }],
};

export const LineStyle = {
  type: "object",
  properties: {
    width: { type: "integer" },
    type: LineDashType,
  },
};

export const PointStyle = {
  type: "object",
  properties: {
    size: { type: "number" },
    shape: PointShape,
  },
};

export const DataLabel = {
  type: "object",
  properties: {
    type: DataLabelType,
    textFormat: TextFormat,
    placement: DataLabelPlacement,
    customLabelData: ChartData,
  },
};

export const BasicSeriesDataPointStyleOverride = {
  type: "object",
  properties: {
    index: { type: "integer" },
    color: Color,
    colorStyle: ColorStyle,
    pointStyle: PointStyle,
  },
};

export const EmbeddedObjectBorder = {
  type: "object",
  properties: {
    color: Color,
    colorStyle: ColorStyle,
  },
};

// Chart axis and domain types
export const ChartAxisViewWindowOptions = {
  type: "object",
  properties: {
    viewWindowMin: { type: "number" },
    viewWindowMax: { type: "number" },
    viewWindowMode: ViewWindowMode,
  },
};

export const BasicChartAxis = {
  type: "object",
  properties: {
    position: BasicChartAxisPosition,
    title: { type: "string" },
    format: TextFormat,
    titleTextPosition: TextPosition,
    viewWindowOptions: ChartAxisViewWindowOptions,
  },
};

export const BasicChartDomain = {
  type: "object",
  properties: {
    domain: ChartData,
    reversed: { type: "boolean" },
  },
};

export const BasicChartSeries = {
  type: "object",
  properties: {
    series: ChartData,
    targetAxis: BasicChartAxisPosition,
    type: BasicChartType,
    lineStyle: LineStyle,
    dataLabel: DataLabel,
    color: Color,
    colorStyle: ColorStyle,
    pointStyle: PointStyle,
    styleOverrides: { type: "array", items: BasicSeriesDataPointStyleOverride },
  },
};

// Chart specifications
export const BasicChartSpec = {
  type: "object",
  properties: {
    chartType: BasicChartType,
    legendPosition: BasicChartLegendPosition,
    axis: { type: "array", items: BasicChartAxis },
    domains: { type: "array", items: BasicChartDomain },
    series: { type: "array", items: BasicChartSeries },
    headerCount: { type: "integer" },
    threeDimensional: { type: "boolean" },
    interpolateNulls: { type: "boolean" },
    stackedType: BasicChartStackedType,
    lineSmoothing: { type: "boolean" },
    compareMode: BasicChartCompareMode,
    totalDataLabel: DataLabel,
  },
  required: ["chartType"],
};

export const PieChartLegendPosition = {
  type: "string",
  enum: [
    "PIE_CHART_LEGEND_POSITION_UNSPECIFIED",
    "BOTTOM_LEGEND",
    "LEFT_LEGEND",
    "RIGHT_LEGEND",
    "TOP_LEGEND",
    "NO_LEGEND",
    "LABELED_LEGEND",
  ],
};

export const PieChartSpec = {
  type: "object",
  properties: {
    legendPosition: PieChartLegendPosition,
    domain: ChartData,
    series: ChartData,
    threeDimensional: { type: "boolean" },
    pieHole: { type: "number" },
  },
};

export const BubbleChartLegendPosition = {
  type: "string",
  enum: [
    "BUBBLE_CHART_LEGEND_POSITION_UNSPECIFIED",
    "BOTTOM_LEGEND",
    "LEFT_LEGEND",
    "RIGHT_LEGEND",
    "TOP_LEGEND",
    "NO_LEGEND",
    "INSIDE_LEGEND",
  ],
};

export const BubbleChartSpec = {
  type: "object",
  properties: {
    legendPosition: BubbleChartLegendPosition,
    bubbleLabels: ChartData,
    domain: ChartData,
    series: ChartData,
    groupIds: ChartData,
    bubbleSizes: ChartData,
    bubbleOpacity: { type: "number" },
    bubbleBorderColor: Color,
    bubbleBorderColorStyle: ColorStyle,
    bubbleMaxRadiusSize: { type: "integer" },
    bubbleMinRadiusSize: { type: "integer" },
    bubbleTextStyle: TextFormat,
  },
};

export const CandlestickSeries = {
  type: "object",
  properties: {
    data: ChartData,
  },
};

export const CandlestickData = {
  type: "object",
  properties: {
    lowSeries: CandlestickSeries,
    openSeries: CandlestickSeries,
    closeSeries: CandlestickSeries,
    highSeries: CandlestickSeries,
  },
};

export const CandlestickDomain = {
  type: "object",
  properties: {
    data: ChartData,
    reversed: { type: "boolean" },
  },
};

export const CandlestickChartSpec = {
  type: "object",
  properties: {
    domain: CandlestickDomain,
    data: { type: "array", items: CandlestickData },
  },
};

export const OrgChartNodeSize = {
  type: "string",
  enum: ["ORG_CHART_LABEL_SIZE_UNSPECIFIED", "SMALL", "MEDIUM", "LARGE"],
};

export const OrgChartSpec = {
  type: "object",
  properties: {
    nodeSize: OrgChartNodeSize,
    nodeColor: Color,
    nodeColorStyle: ColorStyle,
    selectedNodeColor: Color,
    selectedNodeColorStyle: ColorStyle,
    labels: ChartData,
    parentLabels: ChartData,
    tooltips: ChartData,
  },
};

export const HistogramSeries = {
  type: "object",
  properties: {
    barColor: Color,
    barColorStyle: ColorStyle,
    data: ChartData,
  },
};

export const HistogramChartLegendPosition = {
  type: "string",
  enum: [
    "HISTOGRAM_CHART_LEGEND_POSITION_UNSPECIFIED",
    "BOTTOM_LEGEND",
    "LEFT_LEGEND",
    "RIGHT_LEGEND",
    "TOP_LEGEND",
    "NO_LEGEND",
    "INSIDE_LEGEND",
  ],
};

export const HistogramChartSpec = {
  type: "object",
  properties: {
    series: { type: "array", items: HistogramSeries },
    legendPosition: HistogramChartLegendPosition,
    showItemDividers: { type: "boolean" },
    bucketSize: { type: "number" },
    outlierPercentile: { type: "number" },
  },
};

export const WaterfallChartDomain = {
  type: "object",
  properties: {
    data: ChartData,
    reversed: { type: "boolean" },
  },
};

export const WaterfallChartColumnStyle = {
  type: "object",
  properties: {
    label: { type: "string" },
    color: Color,
    colorStyle: ColorStyle,
  },
};

export const WaterfallChartCustomSubtotal = {
  type: "object",
  properties: {
    subtotalIndex: { type: "integer" },
    label: { type: "string" },
    dataIsSubtotal: { type: "boolean" },
  },
};

export const WaterfallChartStackedType = {
  type: "string",
  enum: ["WATERFALL_STACKED_TYPE_UNSPECIFIED", "STACKED", "SEQUENTIAL"],
};

export const WaterfallChartSeries = {
  type: "object",
  properties: {
    data: ChartData,
    positiveColumnsStyle: WaterfallChartColumnStyle,
    negativeColumnsStyle: WaterfallChartColumnStyle,
    subtotalColumnsStyle: WaterfallChartColumnStyle,
    hideTrailingSubtotal: { type: "boolean" },
    customSubtotals: { type: "array", items: WaterfallChartCustomSubtotal },
    dataLabel: DataLabel,
  },
};

export const WaterfallChartSpec = {
  type: "object",
  properties: {
    domain: WaterfallChartDomain,
    series: { type: "array", items: WaterfallChartSeries },
    stackedType: WaterfallChartStackedType,
    firstValueIsTotal: { type: "boolean" },
    hideConnectorLines: { type: "boolean" },
    connectorLineStyle: LineStyle,
    totalDataLabel: DataLabel,
  },
};

export const TreemapChartColorScale = {
  type: "object",
  properties: {
    minValueColor: Color,
    minValueColorStyle: ColorStyle,
    midValueColor: Color,
    midValueColorStyle: ColorStyle,
    maxValueColor: Color,
    maxValueColorStyle: ColorStyle,
    noDataColor: Color,
    noDataColorStyle: ColorStyle,
  },
};

export const TreemapChartSpec = {
  type: "object",
  properties: {
    labels: ChartData,
    parentLabels: ChartData,
    sizeData: ChartData,
    colorData: ChartData,
    textFormat: TextFormat,
    levels: { type: "integer" },
    hintedLevels: { type: "integer" },
    minValue: { type: "number" },
    maxValue: { type: "number" },
    headerColor: Color,
    headerColorStyle: ColorStyle,
    colorScale: TreemapChartColorScale,
    hideTooltips: { type: "boolean" },
  },
};

export const KeyValueFormat = {
  type: "object",
  properties: {
    textFormat: TextFormat,
    position: TextPosition,
  },
};

export const ComparisonType = {
  type: "string",
  enum: [
    "COMPARISON_TYPE_UNDEFINED",
    "ABSOLUTE_DIFFERENCE",
    "PERCENTAGE_DIFFERENCE",
  ],
};

export const BaselineValueFormat = {
  type: "object",
  properties: {
    comparisonType: ComparisonType,
    textFormat: TextFormat,
    position: TextPosition,
    description: { type: "string" },
    positiveColor: Color,
    positiveColorStyle: ColorStyle,
    negativeColor: Color,
    negativeColorStyle: ColorStyle,
  },
};

export const ScorecardChartSpec = {
  type: "object",
  properties: {
    keyValueData: ChartData,
    baselineValueData: ChartData,
    aggregateType: ChartAggregateType,
    keyValueFormat: KeyValueFormat,
    baselineValueFormat: BaselineValueFormat,
    scaleFactor: { type: "number" },
    numberFormatSource: ChartNumberFormatSource,
    customFormatOptions: ChartCustomNumberFormatOptions,
  },
};

// Main chart specifications
export const ChartSpec = {
  type: "object",
  properties: {
    title: { type: "string" },
    altText: { type: "string" },
    titleTextFormat: TextFormat,
    titleTextPosition: TextPosition,
    subtitle: { type: "string" },
    subtitleTextFormat: TextFormat,
    subtitleTextPosition: TextPosition,
    fontName: { type: "string" },
    maximized: { type: "boolean" },
    backgroundColor: Color,
    backgroundColorStyle: ColorStyle,
    dataSourceChartProperties: DataSourceChartProperties,
    filterSpecs: { type: "array", items: FilterSpec },
    sortSpecs: { type: "array", items: SortSpec },
    hiddenDimensionStrategy: ChartHiddenDimensionStrategy,
    basicChart: BasicChartSpec,
    pieChart: PieChartSpec,
    bubbleChart: BubbleChartSpec,
    candlestickChart: CandlestickChartSpec,
    orgChart: OrgChartSpec,
    histogramChart: HistogramChartSpec,
    waterfallChart: WaterfallChartSpec,
    treemapChart: TreemapChartSpec,
    scorecardChart: ScorecardChartSpec,
  },
  oneOf: [
    { required: ["basicChart"] },
    { required: ["pieChart"] },
    { required: ["bubbleChart"] },
    { required: ["candlestickChart"] },
    { required: ["orgChart"] },
    { required: ["histogramChart"] },
    { required: ["waterfallChart"] },
    { required: ["treemapChart"] },
    { required: ["scorecardChart"] },
  ],
};

export const EmbeddedChart = {
  type: "object",
  description: "A chart embedded in a sheet",
  properties: {
    chartId: { type: "integer" },
    spec: ChartSpec,
    position: EmbeddedObjectPosition,
    border: EmbeddedObjectBorder,
  },
  required: ["chartId", "spec", "position"],
};




