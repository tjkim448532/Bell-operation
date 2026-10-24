export interface VenueUsageFacility {
  rank: number;
  facilityName: string;
  categoryName: string;
  categoryCode: string;
  visitors: number;
  usageRate: number;
  lyVisitors: number;
  lyUsageRate: number | null;
  rateDiff: number | null;
  visitorGrowth: number | null;
  revenue: number;
  unitPrice: number | null;
}

export interface VenueUsagePopulation {
  totalBase: number;
  roomGuests: number;
  roomGuestsShare: number;
  walkinGuests: number;
  walkinGuestsShare: number;
  golfExcluded: number;
}

export interface VenueUsageSummary {
  totalFacilityVisitors: number;
  totalRevenue: number;
  topFacility: {
    name: string;
    visitors: number;
    usageRate: number;
  } | null;
}

export interface VenueUsageRateResponse {
  success: boolean;
  period: {
    startDate: string;
    endDate: string;
    label: string;
  };
  population: VenueUsagePopulation;
  summary: VenueUsageSummary;
  facilities: VenueUsageFacility[];
  error?: string;
}
