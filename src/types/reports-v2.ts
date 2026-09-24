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
// ============================================================================
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
    };
  };
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
