// ============================================================================
// ① 매장 시너지 분석 V2 (synergy-store-correlation-v2)
// ============================================================================
export interface SynergyStoreCorrelationV2Response {
  success: boolean;
  meta: {
    engine: string;
    holidaySource: string;
    period: { startDate: string; endDate: string };
    totalResortSales: number;
    totalResortSalesFormatted: string;
    totalRoomSales: number;
    totalRoomsSold: number;
  };
  stores: Array<{
    storeName: string;
    categoryCode: string;
    totalSales: number;
    revenueFormatted: string;
    totalQuantity: number;
    quantityFormatted: string;
    visitorCount: number;
    visitorCountFormatted: string;
    salesSharePercent: number;
    correlationCoefficient: number;
    interactionGrade: string;
    revPasSlope: number;
    spilloverRate: number;
    reverseSpillover: number;
    liftValue: number;
    elasticity?: number;
    elasticityPercent?: number;
    swingMultiplier?: number;
    synergyScore?: number;
    synergyQuadrant?: 'CORE_ANCHOR' | 'HIDDEN_GEM' | 'INDEPENDENT_CASHCOW' | 'STANDALONE';
    dailyTrends: Array<{
      date: string;
      roomsSold: number;
      storeSales: number;
      storeSalesFormatted: string;
      isOffDay: number;
      isPublicHoliday: number;
      holidayName: string;
    }>;
  }>;
  byCategory: {
    fnb: any[];
    ticket: any[];
    golf: any[];
    moto: any[];
  };
}

// ============================================================================
// ② 법인/단체 객실 실적 V2 (corporate-group-sales-v2)
// ============================================================================
export interface CorporateGroupSalesV2Response {
  success: boolean;
  meta: {
    engine: string;
    period: { startDate: string; endDate: string };
    summary: {
      totalRevenue: number;
      totalRevenueFormatted: string;
      totalRoomsSold: number;
      totalRoomsSoldFormatted: string;
      totalGuests: number;
      totalGuestsFormatted: string;
      adr: number;
      adrFormatted: string;
    };
  };
  segments: Array<{
    ticketGroup: string;
    venueName: string;
    roomsSold: number;
    roomsSoldFormatted: string;
    revenue: number;
    revenueFormatted: string;
    revenueSharePct: number;
    guestCount: number;
    guestCountFormatted: string;
    adr: number;
    adrFormatted: string;
  }>;
  dailyTrends: Array<{
    date_id: string;
    sales_date: string;
    daily_revenue: number;
    daily_revenue_formatted: string;
    daily_rooms: number;
    daily_rooms_formatted: string;
  }>;
}

// ============================================================================
// ③ 골프 채널 및 티타임 분석 V2 (golf-channel-teetime-analysis-v2)
export interface GolfPartItem {
  name: string;
  timeRange: string;
  reservedTeams: number;
  visitedTeams: number;
  pendingTeams: number;
  players: number;
  greenFeeRevenue: number;
  avgGreenFee: number;
  avgGreenFeeFormatted: string;
}

export interface GolfPartAnalysis {
  totalReservedTeams: number;
  totalVisitedTeams: number;
  totalCanceledTeams: number;
  totalPendingTeams: number;
  overallAvgGreenFee: number;
  overallAvgGreenFeeFormatted: string;
  parts: {
    part1: GolfPartItem;
    part2: GolfPartItem;
    part3: GolfPartItem;
  };
}

export interface GolfMembershipItem {
  players: number;
  playersFormatted: string;
  playerRatio: number;
  greenFeeRevenue: number;
  greenFeeRevenueFormatted: string;
  avgGreenFee: number;
  avgGreenFeeFormatted: string;
}

export interface GolfMembershipAnalysis {
  member: GolfMembershipItem;
  nonMember: GolfMembershipItem;
  greenFeeGap: number;
  greenFeeGapFormatted: string;
}

export interface GolfChannelAnalysisV2Response {
  success: boolean;
  meta: {
    engine: string;
    period: { startDate: string; endDate: string };
    summary: {
      totalGolfRevenue: number;
      totalGolfRevenueFormatted: string;
      totalPlayers: number;
      totalPlayersFormatted: string;
      totalTransactions: number;
      arpu: number;
      arpuFormatted: string;
      courseCoreRevenue?: number;
      courseCoreRatio?: number;
      amenityRevenue?: number;
      amenityQuantity?: number;
      amenityRatio?: number;
      partAnalysis?: GolfPartAnalysis;
      membershipAnalysis?: GolfMembershipAnalysis;
    };
  };
  partAnalysis?: GolfPartAnalysis;
  membershipAnalysis?: GolfMembershipAnalysis;
  channels: Array<{
    venueName: string;
    ticketGroup: string;
    totalRevenue: number;
    revenueFormatted: string;
    greenFeeRevenue: number;
    greenFeeFormatted: string;
    cartFeeRevenue: number;
    cartFeeFormatted: string;
    playerCount: number;
    playerCountFormatted: string;
    revenueSharePct: number;
    arpu: number;
    arpuFormatted: string;
  }>;
  dailyTrends: Array<{
    date_id: string;
    sales_date: string;
    daily_revenue: number;
    daily_revenue_formatted: string;
    daily_players: number;
    daily_players_formatted: string;
  }>;
}

// ============================================================================
// ④ 일일 진성 방문객 분석 V2 (daily-member-visitors-v2)
// ============================================================================
export interface DailyMemberVisitorsV2Response {
  success: boolean;
  meta: {
    engine: string;
    period: { startDate: string; endDate: string };
    summary: {
      totalVisitors: number;
      totalVisitorsFormatted: string;
      roomGuests: number;
      roomGuestsFormatted: string;
      golfPlayers: number;
      golfPlayersFormatted: string;
      leisureVisitors: number;
      leisureVisitorsFormatted: string;
      totalResortSales: number;
      totalResortSalesFormatted: string;
      spendPerVisitor: number;
      spendPerVisitorFormatted: string;
    };
  };
  venueVisitors: Array<{
    category_code: string;
    venue_name: string;
    ticket_group: string;
    visitor_count: number;
    visitor_count_formatted: string;
    revenue: number;
    revenue_formatted: string;
    visitor_share_pct: number;
  }>;
  dailyVisitors: Array<{
    date_id: string;
    sales_date: string;
    daily_visitors: number;
    daily_visitors_formatted: string;
    daily_room_guests: number;
    daily_golf_players: number;
    daily_leisure_visitors: number;
    daily_revenue: number;
    daily_revenue_formatted: string;
  }>;
}

// ============================================================================
// ⑤ 고객 여정 크로스 번들 분석 V2 (customer-journey-bundles-v2)
// ============================================================================
export interface CustomerJourneyBundlesV2Response {
  success: boolean;
  meta: {
    engine: string;
    period: { startDate: string; endDate: string };
    totalResortSales: number;
    totalResortSalesFormatted: string;
  };
  bundles: Array<{
    bundleType: string;
    departmentDepth: number;
    daysCount: number;
    totalRevenue: number;
    revenueFormatted: string;
    totalQuantity: number;
    quantityFormatted: string;
    revenueSharePct: number;
  }>;
  dailyTrends: Array<{
    date_id: string;
    sales_date: string;
    active_bundle_type: string;
    department_depth: number;
    daily_revenue: number;
    daily_revenue_formatted: string;
    daily_quantity: number;
    daily_quantity_formatted: string;
  }>;
}

// ============================================================================
// ⑧ 레저본부 영업장별 숙박객 대비 이용률 리포트 (leisure-usage-rate)
// ============================================================================
export interface LeisureUsageRateDataPoint {
  month: string;
  usageRate: number; // e.g. 142.3 (%)
  visitors: number; // e.g. 18230 (명)
  totalRoomGuests: number; // e.g. 12810 (명)
}

export interface LeisureUsageRateSeries {
  facilityName: string;
  data: LeisureUsageRateDataPoint[];
}

export interface LeisureUsageRateResponse {
  success: boolean;
  months: string[];
  series: LeisureUsageRateSeries[];
  error?: string;
}

// ============================================================================
// ⑨ 레저본부 연도별 영업장 이용률 정밀 매트릭스 (leisure-yoy-matrix)
// ============================================================================
export interface LeisureYoyYearData {
  usageRate: number;
  visitors: number;
  roomGuests: number;
}

export interface LeisureYoyRow {
  month: number;
  [year: string]: LeisureYoyYearData | number;
}

export interface LeisureYoyMatrixResponse {
  success: boolean;
  facilities: string[];
  years: string[];
  pivotData: Record<string, LeisureYoyRow[]>;
  periodRange?: { startMonth: number; endMonth: number; label: string };
  periodCumulative?: Record<string, { visitors: number; roomGuests: number; usageRate: number }>;
  facilityPeriodCumulative?: Record<string, Record<string, { visitors: number; roomGuests: number; usageRate: number }>>;
  error?: string;
}

// ============================================================================
// ⑩ 벨포레 연도별 숙박객 수 YoY 매트릭스 (room-guests-yoy)
// ============================================================================
export interface RoomGuestsYoyRow {
  month: number;
  rowTotal?: number;
  [year: string]: number | undefined;
}

export interface RoomGuestsYoyResponse {
  success: boolean;
  years: string[];
  matrix: RoomGuestsYoyRow[];
  totals?: Record<string, number>;
  grandTotal?: number;
  error?: string;
}

// ============================================================================
// ⑪ 세일즈본부 연회/세미나실 장소별(Venue) 판매 분석 및 단체 명부 V6
// ============================================================================
export interface SalesVenueItem {
  venueId: string;
  venueName: string;
  capacity?: number;
  bookedCount: number;
  totalRevenue: number;
  averagePrice: number;
  sharePct?: number;
  lyBookedCount?: number;
  lyRevenue?: number;
  growthRate?: number;
}

export interface SalesVenueMonthlyTrend {
  yearMonth: string;
  year?: number;
  month?: number;
  totalBookings?: number;
  totalCount?: number;
  totalRevenue?: number;
  venues?: Record<string, number>;
  venueBreakdown?: Record<string, number>;
}

export interface SalesVenueGroupBooking {
  eventDate?: string;
  bookingDate?: string;
  reservationNo?: string;
  eventId?: string;
  venueName: string;
  clientName?: string;
  corporateName?: string;
  eventName?: string;
  paxCount?: number;
  rentalPrice?: number;
  packageType?: string;
  salesManager?: string;
  remarks?: string;
}

export interface SalesVenuePerformanceSummary {
  totalVenuesCount: number;
  totalEventsCount: number;
  totalRentalRevenue: number;
  averageRentalPrice?: number;
  mostBookedVenue: string;
  lyTotalEventsCount?: number;
  lyTotalRentalRevenue?: number;
  eventsGrowthRate?: number;
  revenueGrowthRate?: number;
}

export interface SalesVenuePerformanceResponse {
  success: boolean;
  summary: SalesVenuePerformanceSummary;
  venues: SalesVenueItem[];
  monthlyTrends: SalesVenueMonthlyTrend[];
  groupBookings: SalesVenueGroupBooking[];
  error?: string;
}

// ============================================================================
// ⑩ 날씨-매출 상관관계 분석 (weather-correlation)
// ============================================================================
export interface WeatherStats {
  rainyDays: number;
  snowyDays: number;
  clearDays: number;
  avgPrecipitation: number;
  maxPrecipitation: number;
}

export interface WeatherImpactVenue {
  venueName: string;
  categoryName: string;
  impactRate: number;
  deltaRevenue: number;
}

export interface WeatherCorrelationDayBreakdown {
  correlationPrecip: number;
  correlationSnow: number;
  clearDayAvgRevenue: number;
  rainyDayAvgRevenue: number;
  snowyDayAvgRevenue: number;
  rainyRevenueDelta: number;
  rainyImpactRate: number;
  snowyRevenueDelta: number;
  snowyImpactRate: number;
  sampleClearDays: number;
  sampleRainyDays: number;
  sampleSnowyDays: number;
  sensitivityTag: string;
}

export interface WeatherVenueRankingItem {
  categoryCode: string;
  categoryName: string;
  venueName: string;
  correlationPrecip: number;
  correlationSnow: number;
  clearDayAvgRevenue: number;
  rainyDayAvgRevenue: number;
  snowyDayAvgRevenue: number;
  rainyRevenueDelta: number;
  rainyImpactRate: number;
  snowyRevenueDelta: number;
  snowyImpactRate: number;
  sensitivityTag: string;
  weekday: WeatherCorrelationDayBreakdown;
  holiday: WeatherCorrelationDayBreakdown;
}

export interface WeatherDailyTimeSeriesItem {
  date: string;
  dayType: 'WEEKDAY' | 'HOLIDAY';
  dayName: string;
  precipitation: number;
  snowfall: number;
  avgTemp: number;
  weatherCondition: 'RAIN' | 'SNOW' | 'CLEAR';
  totalRevenue: number;
  golfRevenue: number;
  ticketRevenue: number;
  fnbRevenue: number;
  roomRevenue: number;
  motoRevenue: number;
  goodsRevenue: number;
}

export interface WeatherSalesCorrelationResponse {
  success: boolean;
  data: {
    summary: {
      period: {
        startDate: string;
        endDate: string;
        totalDays: number;
      };
      weatherStats: WeatherStats;
      topVulnerableVenues: WeatherImpactVenue[];
      topBeneficiaryVenues: WeatherImpactVenue[];
    };
    venueRankings: WeatherVenueRankingItem[];
    dailyTimeSeries: WeatherDailyTimeSeriesItem[];
  };
}

// ============================================================================
// ⑧ 날씨 예측 시뮬레이션 V6 (weather-forecast-simulation)
// ============================================================================
export interface WeatherForecastSimulationVenue {
  categoryCode: string;
  categoryName: string;
  venueName: string;
  lyWeekdayAvgRevenue: number;
  forecastWeekdayRevenue: number;
  weekdayRevenueDelta: number;
  weekdayImpactRate: number;
  lyHolidayAvgRevenue: number;
  forecastHolidayRevenue: number;
  holidayRevenueDelta: number;
  holidayImpactRate: number;
  sensitivityTag: string;
}

export interface WeatherForecastSimulationCategory {
  categoryCode: string;
  categoryName: string;
  lyWeekdayAvgRevenue: number;
  forecastWeekdayRevenue: number;
  weekdayRevenueDelta: number;
  weekdayImpactRate: number;
  lyHolidayAvgRevenue: number;
  forecastHolidayRevenue: number;
  holidayRevenueDelta: number;
  holidayImpactRate: number;
}

export interface WeatherForecastSimulationGrandTotal {
  lyWeekdayAvgRevenue: number;
  forecastWeekdayRevenue: number;
  weekdayRevenueDelta: number;
  weekdayImpactRate: number;
  lyHolidayAvgRevenue: number;
  forecastHolidayRevenue: number;
  holidayRevenueDelta: number;
  holidayImpactRate: number;
}

export interface WeatherForecastSimulationResponse {
  success: boolean;
  data: {
    targetMonth: string;
    lyMonth: string;
    weatherInput: {
      precipitation: number;
      snowfall: number;
    };
    grandTotal: WeatherForecastSimulationGrandTotal;
    categories: WeatherForecastSimulationCategory[];
    venues: WeatherForecastSimulationVenue[];
  };
}

// ============================================================================
// ⑫ 레저본부 영업장별 판매금액 Top 5 상품 및 가격/수요 시뮬레이션 (leisure-top-products)
// ============================================================================
export interface LeisureTopProductItem {
  rank: number;
  itemId: string;
  itemName: string;
  currentPrice: number;
  lySoldQty: number;
  lyRevenue: number;
  sharePct?: number;
  monthlyQty: number[];
  monthlyRevenue?: number[];
}

export interface LeisureTopProductsResponse {
  success: boolean;
  facility: string;
  baseYear: number;
  totalFacilityRevenue?: number;
  topProducts: LeisureTopProductItem[];
  error?: string;
}

// ============================================================================
// ⑬ 익일 부대시설 예상 매출 예측 모델 (BESM v6.0 ancillary-revenue-forecast)
// ============================================================================
export interface AncillaryCalendarInfo {
  dateId: string;
  dayOfWeek: number;
  dayName: string;
  dayType: string;
  dayGroup?: string;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName: string;
}

export interface AncillaryWeatherForecast {
  targetDate: string;
  weatherDesc: string;
  condition: 'CLEAR' | 'RAIN' | 'SNOW' | string;
  precipitationMm: number;
  tempMax: number;
  tempMin: number;
  isRainy: boolean;
  source?: string;
}

export interface BookingListItem {
  name: string;
  type?: string;
  rooms: number;
  guests: number;
}

export interface CondoSegmentDetail {
  label: string;
  rooms: number;
  guests: number;
  roomSharePct: number;
  bookingList?: BookingListItem[];
}

export interface CondoDemographics {
  totalReservedRooms: number;
  totalCapacity: number;
  occupancyRate: number;
  totalEstimatedGuests: number;
  historicalAvgRooms?: number;
  roomDeviation?: number;
  segments: {
    trueGroup: CondoSegmentDetail;
    corpWelfare: CondoSegmentDetail;
    generalFit: CondoSegmentDetail;
  };
}

export interface GolfContext {
  targetDateGolfTeams: number;
  golfPostRoundDiningSpilloverTotal: number;
  golfPostRoundDiningSpilloverFormatted?: string;
}

export interface AncillaryForecastSummary {
  grandTotalForecastRevenue: number;
  grandTotalForecastFormatted: string;
  totalGolfForecastRevenue?: number;
  totalGolfForecastFormatted?: string;
  totalRoomForecastRevenue?: number;
  totalRoomForecastFormatted?: string;
  totalFnbForecastRevenue?: number;
  totalFnbForecastFormatted?: string;
  totalLeisureForecastRevenue?: number;
  totalLeisureForecastFormatted?: string;
  totalMotoForecastRevenue?: number;
  totalMotoForecastFormatted?: string;
  totalHotelSpilloverRevenue?: number;
  totalHotelSpilloverFormatted?: string;
  totalGolfSpilloverRevenue?: number;
  totalGolfSpilloverFormatted?: string;
  clearDayBaselineRevenue?: number;
  totalWeatherImpactDelta?: number;
  spilloverSharePct?: number;
  avgSeasonalityMultiplier?: number;
  avgDayOfWeekMultiplier?: number;
  modelName?: string;
  methodology?: string;
}

export interface AncillaryVenueSegmentBreakdown {
  groupSpillover: number;
  welfareSpillover: number;
  fitSpillover: number;
}

export type WeatherSensitivityType = 'HIGH_NEGATIVE' | 'RESILIENT' | 'VULNERABLE' | 'BENEFICIARY' | string;

export interface AncillaryForecastVenue {
  venueName: string;
  displayName?: string;
  categoryCode: string;
  categoryName: string;
  forecastRevenue: number;
  forecastRevenueFormatted: string;
  forecastVisitorCount: number;
  forecastVisitorCountFormatted: string;
  historicalBenchmarkRevenue?: number;
  seasonalityMultiplier?: number;
  dayOfWeekMultiplier?: number;
  weatherMultiplier?: number;
  baselineDayTripperRevenue?: number;
  hotelSpilloverRevenue?: number;
  golfSpilloverRevenue?: number;
  hotelSpilloverSharePct?: number;
  segmentBreakdown?: AncillaryVenueSegmentBreakdown;
  weatherSensitivityTag: WeatherSensitivityType;
  weatherImpactRatePct?: number;
  weatherDeltaRevenue?: number;
  isClosed?: boolean;
  dayGroup?: string;
  sampleHistoricalDays?: number;
  keyInsight?: string;
}

export interface AncillaryRevenueForecastResponse {
  success: boolean;
  targetDate: string;
  calendar: AncillaryCalendarInfo;
  weatherForecast: AncillaryWeatherForecast;
  condoDemographics: CondoDemographics;
  golfContext?: GolfContext;
  forecastSummary: AncillaryForecastSummary;
  venues: AncillaryForecastVenue[];
  error?: string;
}






