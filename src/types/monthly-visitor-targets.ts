export interface VisitorTargetCell {
  target: number | null;
  actual: number | null;
  achievementRatePct: number | null;
}

export interface VisitorTargetRow {
  rowKey: 'LEISURE_TOTAL' | 'ROOM_VISITORS' | 'WALKIN_DIGITAL';
  label: string;
  subLabel: string;
  badgeText: string;
  annual: VisitorTargetCell;
  monthly: Record<string, VisitorTargetCell>;
}

export interface VenueUsageTargetCell {
  targetRatePct: number | null;
  actualRatePct: number | null;
  achievementRatePct: number | null;
  visitors: number | null;
  denominator: number | null;
}

export interface VenueUsageTargetRow {
  venueKey: string;
  venueName: string;
  rawVenueName: string;
  partName: string;
  isCoreSheetVenue: boolean;
  annual: VenueUsageTargetCell;
  monthly: Record<string, VenueUsageTargetCell>;
}

export interface VenueAmountTargetCell {
  target: number | null;
  actual: number | null;
  achievementRatePct: number | null;
}

export interface VenueAmountTargetRow {
  venueKey: string;
  venueName: string;
  rawVenueName: string;
  isSummaryRow?: boolean;
  annual: VenueAmountTargetCell;
  monthly: Record<string, VenueAmountTargetCell>;
}

export interface MonthlyVisitorTargetsResponse {
  success: boolean;
  year: number;
  lastUpdated: string | null;
  sheetUrl?: string;
  isTargetEndpointReady: boolean;
  ssotFormula: string;
  visitorTargets: VisitorTargetRow[];
  venueUsageTargets: VenueUsageTargetRow[];
  venueRevenueTargets?: VenueAmountTargetRow[];
  venueUnitPriceTargets?: VenueAmountTargetRow[];
  error?: string;
}
