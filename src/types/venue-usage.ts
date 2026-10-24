export interface VenueUsagePeriod {
  targetDate: string;
  startDate: string;
  endDate: string;
  lyStartDate: string;
  lyEndDate: string;
  daysCount: number;
  year: number;
}

export interface VenueUsageDenominator {
  targetPoolVisitors: number;
  roomGuestsExGolf: number;
  parkingWalkinVisitors: number;
  roomGuestsExGolfSharePct: number;
  walkinSharePct: number;
  roomTotalGuests: number;
  roomSoldUnits: number;
  roomGolfSynergyRooms: number;
  roomGolfSynergyGuests: number;
  grossPoolVisitors: number;
  golfTotalPlayers: number;
  netPhysicalResortGuests: number;
  lyTargetPoolVisitors: number;
  lyRoomGuestsExGolf: number;
  lyParkingWalkinVisitors: number;
  targetPoolDiff: number;
  targetPoolGrowthPct: number | null;
}

export interface VenueUsageSummary {
  targetPoolVisitors: number;
  roomGuestsExGolf: number;
  parkingWalkinVisitors: number;
  roomGuestsExGolfSharePct: number;
  walkinSharePct: number;
  totalVenueVisitors: number;
  lyTotalVenueVisitors: number;
  totalVenueVisitorsDiff: number;
  totalVenueVisitorsGrowthPct: number | null;
  overallUsageRatePct: number;
  lyOverallUsageRatePct: number | null;
  overallUsageRateDiffPctp: number | null;
  avgVenuesPerGuest: number;
  totalVenueRevenue: number;
  lyTotalVenueRevenue: number;
  topVenueName: string | null;
  topVenueVisitors: number;
  topVenueUsageRatePct: number;
}

export interface VenueUsageItem {
  venueName: string;
  categoryCode: string;
  categoryName: string;
  teamName: string;
  partName: string;
  isExperienceSubVenue: boolean;
  conversionFromRanchPct?: number | null;
  visitors: number;
  lyVisitors: number;
  visitorsDiff: number;
  visitorsGrowthPct: number | null;
  denominator: number;
  lyDenominator: number;
  usageRatePct: number;
  lyUsageRatePct: number | null;
  usageRateDiffPctp: number | null;
  usageRateGrossPoolPct: number;
  usageRateRoomOnlyPct: number;
  usageRateTotalResortPct: number;
  visitorSharePct: number;
  revenue: number;
  lyRevenue: number;
  unitPrice: number | null;
  spendPerPoolGuest: number;
}

export interface MountainCartCombined {
  venueName: string;
  visitors: number;
  lyVisitors: number;
  denominator: number;
  usageRatePct: number;
  lyUsageRatePct: number | null;
  usageRateDiffPctp: number | null;
  revenue: number;
}

export interface FnbAndOtherVenueItem {
  venueName: string;
  categoryCode: string;
  categoryName: string;
  teamName: string;
  isVisitorTracked: boolean;
  itemQuantity: number;
  orderRatePerPoolPct: number | null;
  revenue: number;
  spendPerPoolGuest: number;
}

export interface VenueTrendMetric {
  visitors: number;
  usageRatePct: number;
  revenue?: number;
}

export interface VenueUsageTrendPoint {
  date?: string;
  month?: string;
  label?: string;
  targetPoolVisitors: number;
  roomGuestsExGolf?: number;
  parkingWalkinVisitors?: number;
  totalVenueVisitors: number;
  overallUsageRatePct: number;
  venues?: Record<string, VenueTrendMetric | number>;
}

export interface VenueUsageRateResponse {
  success: boolean;
  ssotFormula: string;
  period: VenueUsagePeriod;
  denominator: VenueUsageDenominator;
  summary: VenueUsageSummary;
  venues: VenueUsageItem[];
  mountainCartCombined: MountainCartCombined | null;
  fnbAndOtherVenues: FnbAndOtherVenueItem[];
  dailyTrends: VenueUsageTrendPoint[];
  monthlyTrends: VenueUsageTrendPoint[];
  error?: string;
}
