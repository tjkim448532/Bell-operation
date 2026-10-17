export type MainCategoryType = 'golf' | 'room' | 'leisure' | 'dining';

export interface RegularPriceItem {
  name: string;
  target?: string;
  priceWeekday: string;
  priceWeekend?: string;
  note?: string;
}

export interface DiscountPolicy {
  target: string;
  rate: string;
  discountPrice?: string;
  condition: string;
}

export interface LeisureFacilityPricing {
  id: string;
  name: string;
  mainCategory: MainCategoryType;
  mainCategoryLabel: '골프' | '객실' | '레져' | '식음';
  subCategory?: string;
  summary: string;
  representativePrice: string;
  operatingHours: string;
  breakTime?: string;
  closedDay?: string;
  location?: string;
  contact?: string;
  ageRequirement?: string;
  discountBadges: string[];
  regularPrices: RegularPriceItem[];
  discounts: DiscountPolicy[];
  requirements: string[];
  notes: string[];
  cancellationPolicy?: string;
  officialUrl?: string;
  period?: string;
  isSpecialOffer?: boolean;
}

export const MAIN_CATEGORY_TABS = [
  { key: 'all', label: '전체 통합', icon: 'Sparkles' },
  { key: 'golf', label: '골프', icon: 'Flag' },
  { key: 'room', label: '객실', icon: 'Hotel' },
  { key: 'leisure', label: '레져', icon: 'Ticket' },
  { key: 'dining', label: '식음', icon: 'Utensils' },
] as const;

export const LEISURE_FACILITIES: LeisureFacilityPricing[] = [
  // ==========================================
  // 1. 골프 (GOLF)
  // ==========================================
  {
    id: 'golf-greenfee',
    name: '블랙스톤 벨포레 CC (그린피·카트·캐디)',
    mainCategory: 'golf',
    mainCategoryLabel: '골프',
    subCategory: '골프 라운딩',
    summary: '블랙스톤의 품격 그대로, 원남호와 두타산 숲속 18홀 정규 코스 (마운틴뷰 / 레이크뷰)',
    representativePrice: '그린피 주중 197,000원 / 주말 258,000원 (카트피 10만 / 캐디피 8만~16만)',
    operatingHours: '일출 20분 전 ~ 일몰 20분 후 (3부 야간 조명 가동 탄력 운영)',
    closedDay: '연중무휴 (기상악화 및 동절기 일부 탄력 휴장)',
    contact: '1566-0162 (내선 1번, 09:00~17:30)',
    location: '블랙스톤 벨포레 CC 클럽하우스',
    discountBadges: ['콘도분양회원 1만원 할인', '인터넷회원 특가', '수시단체 우대'],
    regularPrices: [
      { name: '18홀 그린피 (주중)', priceWeekday: '197,000원', priceWeekend: '-', note: '정상가 기준 (인터넷 회원가 별도 적용)' },
      { name: '18홀 그린피 (주말/공휴일)', priceWeekday: '-', priceWeekend: '258,000원', note: '토·일·공휴일 정상가 기준' },
      { name: '골프카트 이용료', priceWeekday: '100,000원', priceWeekend: '100,000원', note: '팀당 18홀 기준 (5인승 전자동 골프카트)' },
      { name: '캐디피 (1·2부 경력자)', priceWeekday: '150,000원', priceWeekend: '150,000원', note: '팀당 18홀 기준' },
      { name: '캐디피 (3부 야간 경력자)', priceWeekday: '160,000원', priceWeekend: '160,000원', note: '팀당 18홀 기준 (야간 라이트 경기)' },
      { name: '캐디피 (교육캐디 - 신입)', priceWeekday: '130,000원', priceWeekend: '130,000원', note: '캐디교육센터 수료 신입 (3부 운영시 배치)' },
      { name: '캐디피 (교육캐디 - 인턴)', priceWeekday: '110,000원', priceWeekend: '110,000원', note: '실무 인턴 캐디 (3부 운영시 배치)' },
      { name: '캐디피 (드라이빙 캐디)', priceWeekday: '80,000원', priceWeekend: '80,000원', note: '운전 및 기본 서브 전용 캐디' }
    ],
    discounts: [
      { target: '콘도 분양회원', rate: '1인 10,000원 할인', discountPrice: '1인 10,000원 할인', condition: '회원권 등재 인원 한정 (회원혜택 횟수 미차감)' },
      { target: '인터넷 회원', rate: '실시간 타임별 차등 특가', condition: '공식 웹/앱 예약창에서 티오프 시간대별 실시간 할인율 확인 가능' },
      { target: '수시단체 (3팀 이상)', rate: '단체 특전 요금 적용', condition: '4인 1팀, 3팀 이상 내장 시 단체 협약 요금 적용 가능' }
    ],
    requirements: [
      '원칙적으로 4인 1팀 라운드 (3인 플레이 시 클럽 규정에 따름)',
      '티오프 시간 최소 30분 전 클럽하우스 도착 및 체크인 필수',
      '단정한 골프 복장 준수 (깃 있는 상의, 골프화 착용, 청바지/슬리퍼 불가)',
      '과도한 경기 지연(Slow Play) 및 도박성 내기 엄격 금지'
    ],
    notes: [
      '코스 규모: 18홀 대중제 골프장 (마운틴 코스 9홀 + 레이크 코스 9홀)',
      '클럽하우스 내 락커룸, 샤워실, 프로샵, 레스토랑 완비',
      '국가 임시 공휴일 지정 시 해당일은 주말 요금으로 적용',
      '3부 야간 라운드는 최신 고효율 LED 조명 타워 완비로 쾌적한 야간 플레이 지원'
    ],
    cancellationPolicy: '예약 취소는 이용일 3주 전~주말 3일 전/평일 2일 전까지 위약 없이 취소 가능. 기상악화 시 공정위 표준약관에 따라 홀별 정산(1홀 종료 전 취소 시 기본요금 제외 전액 환불, 2홀 이후 이용 홀수 비례 환불).',
    officialUrl: 'https://belleforetresort.com/content/golf_fee'
  },
  {
    id: 'golf-clubhouse',
    name: '골프 클럽하우스 레스토랑 & 스타트하우스',
    mainCategory: 'golf',
    mainCategoryLabel: '골프',
    subCategory: '골프 식음',
    summary: '블랙스톤 벨포레 CC 클럽하우스 2층 레스토랑 및 그늘집 스타트하우스',
    representativePrice: '식사 18,000원~ / 스타트하우스 안주·스낵 25,000원~',
    operatingHours: '첫 조 티오프 1시간 전 ~ 마지막 조 라운딩 종료 시',
    closedDay: '골프장 운영일과 동일',
    contact: '043-926-1000',
    location: '블랙스톤 벨포레 CC 클럽하우스 2층',
    discountBadges: ['단체 연회 사전예약 가능'],
    regularPrices: [
      { name: '클럽하우스 조식/중식 정식', priceWeekday: '18,000원~', priceWeekend: '18,000원~', note: '해장국, 능이갈비탕, 전복미역국 등 계절 한식' },
      { name: '스타트하우스 시그니처 세트', priceWeekday: '35,000원~', priceWeekend: '35,000원~', note: '수제 훈제 바비큐 소시지, 모둠 튀김, 떡볶이 등' },
      { name: '커피 및 음료 (리필 가능)', priceWeekday: '9,000원', priceWeekend: '9,000원', note: '보온병 지참 시 라운드 테이크아웃 지원' }
    ],
    discounts: [],
    requirements: ['외부 음식물 및 주류 반입 금지', '단체 룸(VIP Room) 이용 시 사전 예약 필수'],
    notes: ['골프 코스 전경이 한눈에 내려다보이는 파노라마 레이크뷰 다이닝'],
    officialUrl: 'https://belleforetresort.com/content/golf_restaurant'
  },

  // ==========================================
  // 2. 객실 (ROOM & STAY)
  // ==========================================
  {
    id: 'room-bella-16',
    name: '벨라포레 16평형 (Studio)',
    mainCategory: 'room',
    mainCategoryLabel: '객실',
    subCategory: '일반 객실',
    summary: '원남호의 정취가 한눈에 들어오는 아늑한 원룸형 호수 전망 객실 (연인·소규모 투숙 추천)',
    representativePrice: '기준 2인 (미취학 아동 1인 무료 추가 가능)',
    operatingHours: '체크인 15:00 / 체크아웃 11:00 (스마트 모바일 체크인 지원)',
    closedDay: '연중무휴',
    contact: '1566-0162 (내선 1번)',
    location: '벨포레 리조트 콘도미니엄 101~104동',
    discountBadges: ['분양회원 우대', '공홈 예약 특가', '쿠치나 조식 결합 가능'],
    regularPrices: [
      { name: '16평형 1박 (주중)', priceWeekday: '공식 예약창 실시간 공시', priceWeekend: '-', note: '일~목 투숙 기준 (일자별/시즌별 탄력 요금제)' },
      { name: '16평형 1박 (주말/성수기)', priceWeekday: '-', priceWeekend: '공식 예약창 실시간 공시', note: '금·토·공휴일 전일 기준' }
    ],
    discounts: [
      { target: '콘도 분양회원', rate: '회원 전용 회원가', condition: '회원권 소유자 로그인 후 예약 시 자동 적용' },
      { target: '쿠치나 조식 결합', rate: '조식 사전할인 혜택', condition: '객실 예약 시 조식 추가 사전예약 시 대인 28,000원 / 소인 19,000원' }
    ],
    requirements: [
      '기준 인원: 성인 2명 (성인 인원 추가 불가, 미취학 아동 1인까지 무료 동반 가능)',
      '입실 15:00, 퇴실 11:00 (지연 퇴실 시 30분당 추가요금 부과)',
      '전 객실 절대 금연 구역 (흡연 적발 시 특수 클리닝비 청구)',
      '클린형 객실로 객실 내 조리 및 취사 도구 사용 불가'
    ],
    notes: [
      '침실 구성: 더블베드 1개 또는 트윈베드 (호수 전망 발코니 완비)',
      '비치 물품: 스마트 TV, 냉장고, 전기포트, 헤어드라이어, 타월, 어메니티',
      '칫솔/치약 등 일회용품은 환경보호 정책에 따라 미제공 (CU 편의점 구매 가능)',
      '스마트 모바일 체크인 이용 시 대기 없이 모바일 키로 다이렉트 입실 가능'
    ],
    officialUrl: 'https://belleforetresort.com/content/resort_stay'
  },
  {
    id: 'room-bella-35',
    name: '벨라포레 35평형 (Suite)',
    mainCategory: 'room',
    mainCategoryLabel: '객실',
    subCategory: '일반 객실',
    summary: '넓고 쾌적한 거실과 침실이 분리된 구조로 온전한 휴식을 선사하는 패밀리 스위트',
    representativePrice: '기준 4인 (최대 6인 투숙 가능)',
    operatingHours: '체크인 15:00 / 체크아웃 11:00',
    closedDay: '연중무휴',
    contact: '1566-0162 (내선 1번)',
    location: '벨포레 리조트 콘도미니엄 101~104동',
    discountBadges: ['분양회원 우대', '공홈 예약 특가', '패밀리 인기 1위'],
    regularPrices: [
      { name: '35평형 1박 (주중)', priceWeekday: '공식 예약창 실시간 공시', priceWeekend: '-', note: '기준 4인 기준 (일~목)' },
      { name: '35평형 1박 (주말/성수기)', priceWeekday: '-', priceWeekend: '공식 예약창 실시간 공시', note: '기준 4인 기준 (금·토·공휴일 전일)' },
      { name: '기준 인원 초과 추가요금', priceWeekday: '1인 10,000원 / 1박', priceWeekend: '1인 10,000원 / 1박', note: '침구 미포함 (최대 2인 추가 가능)' },
      { name: '추가 침구류 (침구 세트 1채)', priceWeekday: '15,000원 / 1박', priceWeekend: '15,000원 / 1박', note: '요/이불/베개 1세트' }
    ],
    discounts: [
      { target: '콘도 분양회원', rate: '회원 전용 회원가', condition: '회원권 소유자 로그인 후 예약 시 자동 적용' }
    ],
    requirements: [
      '기준 인원 4인 / 최대 인원 6인 (초과 투숙 불가)',
      '입실 15:00, 퇴실 11:00',
      '전 객실 금연, 반려동물 동반 불가 (반려동물 동반 시 펫룸 예약 필수)'
    ],
    notes: [
      '구조: 침실 2 + 거실 + 욕실 2 + 호수 전망 발코니',
      '대가족 및 유아 동반 가족 단위 여행객에게 가장 인기 있는 베스트셀러 객실'
    ],
    officialUrl: 'https://belleforetresort.com/content/resort_stay'
  },
  {
    id: 'room-bella-51',
    name: '벨라포레 51평형 (Grand Suite)',
    mainCategory: 'room',
    mainCategoryLabel: '객실',
    subCategory: '일반 객실',
    summary: '넓은 거실과 침실, 프라이빗 맞춤형 구조로 원남호의 멋진 전망을 즐기는 대형 스위트',
    representativePrice: '기준 6인 (최대 8인 투숙 가능)',
    operatingHours: '체크인 15:00 / 체크아웃 11:00',
    closedDay: '연중무휴',
    contact: '1566-0162 (내선 1번)',
    location: '벨포레 리조트 콘도미니엄',
    discountBadges: ['분양회원 우대', '대가족/2가족 맞춤', '초대형 테라스'],
    regularPrices: [
      { name: '51평형 1박 (주중)', priceWeekday: '공식 예약창 실시간 공시', priceWeekend: '-', note: '기준 6인 기준' },
      { name: '51평형 1박 (주말/성수기)', priceWeekday: '-', priceWeekend: '공식 예약창 실시간 공시', note: '기준 6인 기준' }
    ],
    discounts: [
      { target: '콘도 분양회원', rate: '회원 전용 회원가', condition: '회원권 소유자 로그인 후 예약 시 자동 적용' }
    ],
    requirements: [
      '기준 인원 6인 / 최대 인원 8인 (초과 시 입실 제한)',
      '커넥팅 조립형 룸 구조로 프라이버시 완벽 보장'
    ],
    notes: [
      '구조: 침실 3 + 거실 + 욕실 3 + 대형 파노라마 발코니',
      '부모님 동반 여행 및 2가족 동반 여행에 최적화된 최고급 객실'
    ],
    officialUrl: 'https://belleforetresort.com/content/resort_stay'
  },
  {
    id: 'room-pet',
    name: '펫포레 하우스 (반려견 동반 객실 16·35·51평)',
    mainCategory: 'room',
    mainCategoryLabel: '객실',
    subCategory: '펫룸',
    summary: '반려견과 함께 투숙하는 펫 전용 웰컴 어메니티 완비 힐링 객실',
    representativePrice: '16평(견주2+견1) / 35평(견주4+견2) / 51평(견주6+견3)',
    operatingHours: '체크인 15:00 / 체크아웃 11:00',
    closedDay: '연중무휴',
    contact: '1566-0162 (내선 1번)',
    location: '벨포레 펫포레 하우스 전용 동',
    discountBadges: ['반려견 전용 어메니티 무료제공', '펫포레 파크 인접'],
    regularPrices: [
      { name: '16평형 펫룸', priceWeekday: '공식 예약창 실시간 공시', priceWeekend: '공식 예약창 실시간 공시', note: '견주 2인 + 반려견 1마리 기준 (반려견 추가 불가)' },
      { name: '35평형 펫룸', priceWeekday: '공식 예약창 실시간 공시', priceWeekend: '공식 예약창 실시간 공시', note: '견주 4인(추가 2인 가능) + 반려견 2마리' },
      { name: '51평형 펫룸', priceWeekday: '공식 예약창 실시간 공시', priceWeekend: '공식 예약창 실시간 공시', note: '견주 6인(추가 2인 가능) + 반려견 3마리' }
    ],
    discounts: [],
    requirements: [
      '광견병 및 기본 5대 필수 예방접종 완료견만 투숙 가능 (접종 확인서 지참)',
      '리조트 공용 구역 이동 시 반드시 2m 이내 리드줄 또는 이동장 착용 필수',
      '체고 및 맹견 품종 입장 제한 (동물보호법상 5대 맹견 입장 불가)',
      '객실 내 반려견 혼자 방치 금지 (외출 시 동반 필수)'
    ],
    notes: [
      '펫 전용 무료 제공 어메니티: 배변판, 배변패드 3매, 반려견 식기, 반려견 전용 방석, 펫 타월',
      '벨포레 펫포레 파크(반려견 전용 천연 잔디 운동장) 도보 이동 가능'
    ],
    officialUrl: 'https://belleforetresort.com/content/resort_pets'
  },
  // 객실 스페셜 오퍼 패키지 5종
  {
    id: 'offer-room-cucina',
    name: '[스페셜 오퍼] 벨포레 메가 딜 (조식 2인 PKG)',
    mainCategory: 'room',
    mainCategoryLabel: '객실',
    subCategory: '객실 패키지',
    summary: '단 3주간만 진행되는 벨포레 빅 세일! 객실 + 쿠치나 뷔페 조식 2인 결합 초특가',
    representativePrice: '16평 / 35평 / 51평 객실 + 쿠치나 조식 뷔페 2인',
    operatingHours: '예약 2026.09.29 ~ 10.19 / 투숙 2026.09.29 ~ 12.17',
    closedDay: '주중 한정 (일~목 투숙 전용)',
    contact: '1566-0162 (내선 1번)',
    location: '벨포레 콘도 & 웰컴센터 2층 쿠치나',
    discountBadges: ['단 3주간 빅세일', '조식 2인 무료포함', '조식추가 사전할인'],
    period: '2026-09-29 ~ 2026-10-19',
    isSpecialOffer: true,
    regularPrices: [
      { name: '16평형 + 조식 2인 PKG', priceWeekday: '메가딜 단독 특가', priceWeekend: '-', note: '객실 1박 + 쿠치나 조식 2인 포함 (주중 한정)' },
      { name: '35평형 + 조식 2인 PKG', priceWeekday: '메가딜 단독 특가', priceWeekend: '-', note: '객실 1박 + 쿠치나 조식 2인 포함 (주중 한정)' },
      { name: '51평형 + 조식 2인 PKG', priceWeekday: '메가딜 단독 특가', priceWeekend: '-', note: '객실 1박 + 쿠치나 조식 2인 포함 (주중 한정)' }
    ],
    discounts: [
      { target: '조식 인원 추가', rate: '사전할인가 적용', condition: '객실 내 QR 예약 시 대인 28,000원(정상 3.3만) / 소인 19,000원(정상 2.4만)' }
    ],
    requirements: [
      '본 상품은 공식 벨포레 홈페이지 및 벨포레 앱에서만 구매 가능',
      '투숙 기간: 2026.09.29 ~ 2026.12.17 (주중 한정)',
      '단순 변심으로 이용하지 않은 패키지 포함 상품은 환불 불가'
    ],
    notes: [
      '쿠치나 조식은 숙박 일자별로 제공 (07:00 ~ 10:00, 입장마감 09:30)',
      '36개월 미만 유아는 증빙서류 지참 시 조식 무료'
    ],
    officialUrl: 'https://belleforetresort.com/package/96?sca=%EA%B0%9D%EC%8B%A4'
  },
  {
    id: 'offer-room-sled',
    name: '[스페셜 오퍼] 벨포레 메가 딜 (썰매·햄버거 PKG)',
    mainCategory: 'room',
    mainCategoryLabel: '객실',
    subCategory: '객실 패키지',
    summary: '단 3주간 진행되는 벨포레 빅 세일! 객실 + 사계절썰매 무제한 + 브리스킷 수제버거 결합',
    representativePrice: '16평(2인 패키지) / 35·51평(4인 패키지)',
    operatingHours: '예약 2026.09.29 ~ 10.19 / 투숙 2026.09.29 ~ 12.17',
    closedDay: '주중 한정 (썰매 월요일 휴장)',
    contact: '1566-0162 (내선 1번)',
    location: '벨포레 콘도 + 사계절썰매장 + 브리스킷 346',
    discountBadges: ['단 3주간 빅세일', '썰매무제한 포함', '브리스킷 버거 포함'],
    period: '2026-09-29 ~ 2026-10-19',
    isSpecialOffer: true,
    regularPrices: [
      { name: '16평형 PKG (2인 구성)', priceWeekday: '메가딜 단독 특가', priceWeekend: '-', note: '객실 + 썰매무제한 2인 + 브리스킷 버거 2인' },
      { name: '35평형 PKG (4인 구성)', priceWeekday: '메가딜 단독 특가', priceWeekend: '-', note: '객실 + 썰매무제한 4인 + 브리스킷 버거 4인' },
      { name: '51평형 PKG (4인 구성)', priceWeekday: '메가딜 단독 특가', priceWeekend: '-', note: '객실 + 썰매무제한 4인 + 브리스킷 버거 4인' }
    ],
    discounts: [],
    requirements: [
      '사계절 썰매는 월요일 휴장 (일요일 투숙객은 일요일 당일 사용, 월요일 투숙객은 화요일 사용)',
      '구매 후 전송된 LMS 또는 QR 모바일 바코드를 매표소에 제시 후 입장',
      '썰매 단독 탑승: 키 130cm 이상 (키 85~130cm 미만은 보호자 동반 필수)'
    ],
    notes: [
      '브리스킷 346: 정통 텍사스 스타일 브리스킷 패티 수제버거',
      '미사용한 레저시설 입장권은 바코드 유효기간 내 사용 가능'
    ],
    officialUrl: 'https://belleforetresort.com/package/95?sca=%EA%B0%9D%EC%8B%A4'
  },
  {
    id: 'offer-room-winter',
    name: '[스페셜 오퍼] 씽씽한끼 PKG',
    mainCategory: 'room',
    mainCategoryLabel: '객실',
    subCategory: '객실 패키지',
    summary: '신나게 씽씽 썰매 타고, 맛있는 햄버거를 한끼로! 알찬 겨울방학 패키지',
    representativePrice: '16평(2인 세트) / 35·51평(4인 세트)',
    operatingHours: '투숙 기간: 2026.10.09 ~ 2027.01.31',
    closedDay: '썰매 월요일 휴장',
    contact: '1566-0162 (내선 1번)',
    location: '벨포레 콘도 + 사계절썰매장 + 브리스킷 346',
    discountBadges: ['겨울방학 시즌특가', '썰매무제한', '브리스킷 버거'],
    period: '2026-10-08 ~ 2027-01-31',
    isSpecialOffer: true,
    regularPrices: [
      { name: '16평 씽씽한끼 PKG', priceWeekday: '시즌 단독 특가', priceWeekend: '시즌 단독 특가', note: '객실 + 썰매무제한 2인 + 브리스킷 346 버거 2인' },
      { name: '35평 씽씽한끼 PKG', priceWeekday: '시즌 단독 특가', priceWeekend: '시즌 단독 특가', note: '객실 + 썰매무제한 4인 + 브리스킷 346 버거 4인' },
      { name: '51평 씽씽한끼 PKG', priceWeekday: '시즌 단독 특가', priceWeekend: '시즌 단독 특가', note: '객실 + 썰매무제한 4인 + 브리스킷 346 버거 4인' }
    ],
    discounts: [],
    requirements: ['1월 예약은 11월 8일 09시 공식 오픈 예정'],
    notes: ['겨울 시즌 학생 및 가족 단위 여행객에게 가장 인기 있는 겨울 액티비티 패키지'],
    officialUrl: 'https://belleforetresort.com/package/97?sca=%EA%B0%9D%EC%8B%A4'
  },
  {
    id: 'offer-room-autumn',
    name: '[스페셜 오퍼] 달맞이 소원 성취 PKG',
    mainCategory: 'room',
    mainCategoryLabel: '객실',
    subCategory: '객실 패키지',
    summary: '1년 뒤 나에게 전하는 느린 편지 추억과 조식 2인, 룸 업그레이드권, 레저 30% 할인권 결합',
    representativePrice: '객실 + 조식 2인 + 느린편지 + 룸업글권 + 레저30%할인권',
    operatingHours: '투숙 기간: 2026.09.01 ~ 2026.11.30',
    closedDay: '연중무휴',
    contact: '1566-0162 (내선 1번)',
    location: '벨포레 콘도 & 리조트 전역',
    discountBadges: ['조식 2인 포함', '주중 룸업글권 증정', '레저3종 30%할인권'],
    period: '2026-07-08 ~ 2026-11-30',
    isSpecialOffer: true,
    regularPrices: [
      { name: '16평/35평/51평 달맞이 PKG', priceWeekday: '가을 힐링 특가', priceWeekend: '가을 힐링 특가', note: '객실 + 조식 2인 + 느린편지 엽서 + 주중 룸 업그레이드 바우처 + 레저 3종 할인권' }
    ],
    discounts: [],
    requirements: ['작성한 편지는 1년 뒤 해당 월의 마지막 영업일에 실제 우편 발송됩니다.'],
    notes: [
      '레저 3종 할인권: 미디어아트센터 / 벨포레 목장 / 마운틴카트 30% 할인',
      '주중 룸 업그레이드 바우처는 차회 공홈/유선 예약 시 사용 가능'
    ],
    officialUrl: 'https://belleforetresort.com/package/94?sca=%EA%B0%9D%EC%8B%A4'
  },
  {
    id: 'offer-room-joyful',
    name: '[스페셜 오퍼] [BEST 재출시] 조이풀 패밀리 PKG (리턴즈!)',
    mainCategory: 'room',
    mainCategoryLabel: '객실',
    subCategory: '객실 패키지',
    summary: '성원에 힘입어 다시 돌아온 시그니처 베스트셀러! 객실 + 레저 4종 올패스 결합',
    representativePrice: '16평(2인 올패스) / 35·51평(4인 올패스)',
    operatingHours: '투숙 기간: 2026.07.01 ~ 2026.12.31',
    closedDay: '카트/썰매 월요일 휴장',
    contact: '1566-0162 (내선 1번)',
    location: '벨포레 콘도 + 목장 + 카트 + 썰매 + 미디어아트',
    discountBadges: ['BEST 시그니처', '레저 4종 올패스 포함', '최대 4인 올패스'],
    period: '2026-06-08 ~ 2026-12-31',
    isSpecialOffer: true,
    regularPrices: [
      { name: '16평 조이풀 패밀리 PKG', priceWeekday: '베스트셀러 패키지 특가', priceWeekend: '베스트셀러 패키지 특가', note: '객실 + 조이풀 패밀리 패스 2인 (목장+카트1회+썰매무제한+미디어아트)' },
      { name: '35평 조이풀 패밀리 PKG', priceWeekday: '베스트셀러 패키지 특가', priceWeekend: '베스트셀러 패키지 특가', note: '객실 + 조이풀 패밀리 패스 4인 (목장+카트1회+썰매무제한+미디어아트)' },
      { name: '51평 조이풀 패밀리 PKG', priceWeekday: '베스트셀러 패키지 특가', priceWeekend: '베스트셀러 패키지 특가', note: '객실 + 조이풀 패밀리 패스 4인 (목장+카트1회+썰매무제한+미디어아트)' }
    ],
    discounts: [],
    requirements: ['일요일 투숙객은 일요일 당일 이용, 월요일 투숙객은 화요일 이용 권장'],
    notes: ['리조트 내 핵심 레저 4종을 한 번에 가장 저렴하게 즐길 수 있는 공식 완판 패키지'],
    officialUrl: 'https://belleforetresort.com/package/92?sca=%EA%B0%9D%EC%8B%A4'
  },

  // ==========================================
  // 3. 레져 (LEISURE & ATTRACTION)
  // ==========================================
  {
    id: 'mountain-kart',
    name: '마운틴 카트 (루지)',
    mainCategory: 'leisure',
    mainCategoryLabel: '레져',
    subCategory: '육상·스피드',
    summary: '두타산 자연 경사로를 주행하는 약 3km 스릴 전기 레이싱',
    representativePrice: '그랜드포렛 30,000원 / 미니포렛 5,000원',
    operatingHours: '하절기 10:00~18:00 / 동절기 10:00~17:00 (마감 30분 전 티켓마감)',
    breakTime: '주중 12:30~13:30 / 주말 12:00~13:00',
    closedDay: '매주 월요일 휴장',
    contact: '043-926-1000',
    location: '마운틴카트 탑승장',
    ageRequirement: '그랜드: 키 150cm 이상 / 미니: 단독 130cm 이상 (동반 85~129cm)',
    discountBadges: ['도민·군인 25%', '숙박객 25%', '회원 최대 50%'],
    regularPrices: [
      { name: '그랜드포렛 코스 (약 3km / 스릴)', priceWeekday: '30,000원', priceWeekend: '30,000원', note: '청소년·성인 스릴 코스 (주중/주말 동일)' },
      { name: '미니포렛 코스 (어린이 전용)', priceWeekday: '5,000원', priceWeekend: '5,000원', note: '일반/동반 동일 요금 (할인 적용 불가)' }
    ],
    discounts: [
      { target: '콘도 분양회원 (레드/화이트)', rate: '50% 할인', discountPrice: '15,000원', condition: '회원카드 실물 지참 필수 (그랜드포렛 기준)' },
      { target: '콘도 분양회원 (그린)', rate: '30% 할인', discountPrice: '21,000원', condition: '회원카드 실물 지참 필수 (그랜드포렛 기준)' },
      { target: '충북도민', rate: '25% 할인', discountPrice: '22,500원', condition: '주민등록상 충북 거주 신분증 제시' },
      { target: '37사단 군인', rate: '25% 할인', discountPrice: '22,500원', condition: '군인 신분증 또는 휴가증 제시' },
      { target: '콘도 숙박 고객', rate: '25% 할인', discountPrice: '22,500원', condition: '예약 문자 또는 입실 영수증 제시' }
    ],
    requirements: [
      '그랜드포렛: 키 150cm 이상 탑승 가능 (150cm 미만 탑승 불가)',
      '미니포렛: 단독 탑승 키 130cm 이상 / 보호자 동반 탑승 시 36개월 이상 & 85cm~129cm',
      '신발은 반드시 운동화 착용 (슬리퍼, 샌들, 하이힐 탑승 금지)',
      '헬멧 착용 필수(위생모 제공), 주행 중 휴대폰 촬영 절대 금지'
    ],
    notes: ['전기고카트 최고 속도 30km/h 리미티드 제한 적용', '온라인 예매 당일 사용 가능'],
    cancellationPolicy: '천재지변 및 회사 귀책 사유 외 단순 변심 환불 불가',
    officialUrl: 'https://belleforetresort.com/attraction/10'
  },
  {
    id: 'tubing-sled',
    name: '사계절 썰매장 (튜빙 썰매)',
    mainCategory: 'leisure',
    mainCategoryLabel: '레져',
    subCategory: '육상·스피드',
    summary: '튜브를 타고 슬로프를 미끄러져 내려오는 스릴 만점 액티비티',
    representativePrice: '무제한 썰매 대인 20,000원~ (소인 10,000원~)',
    operatingHours: '하절기 10:00~18:00 / 동절기 10:00~17:00',
    breakTime: '주중 12:30~13:30 / 주말 12:00~13:00',
    closedDay: '매주 월요일 휴장',
    contact: '043-926-1000',
    location: '사계절 썰매장 매표소',
    ageRequirement: '단독: 키 130cm 이상 / 동반: 키 85~130cm 미만 (65세 미만 탑승)',
    discountBadges: ['도민·군민 30%', '숙박객 최대 25%', '회원 최대 50%'],
    regularPrices: [
      { name: '사계절썰매 대인 (주중 무제한)', priceWeekday: '20,000원', priceWeekend: '-', note: '14세 이상 (주중 올데이 무제한 탑승)' },
      { name: '사계절썰매 대인 (주말/공휴일 3회권)', priceWeekday: '-', priceWeekend: '15,000원', note: '14세 이상 (주말 3회 이용)' },
      { name: '사계절썰매 소인 (주중 무제한)', priceWeekday: '15,000원', priceWeekend: '-', note: '36개월 이상 ~ 초등학생 (주중 무제한)' },
      { name: '사계절썰매 소인 (주말/공휴일 3회권)', priceWeekday: '-', priceWeekend: '10,000원', note: '36개월 이상 ~ 초등학생 (주말 3회)' },
      { name: '썰매 동반 탑승권 (1인)', priceWeekday: '5,000원', priceWeekend: '5,000원', note: '보호자 동반 탑승 시 보호자 티켓' }
    ],
    discounts: [
      { target: '콘도 분양회원 (레드/화이트)', rate: '50% 할인', discountPrice: '주중 10,000원 / 주말 7,500원', condition: '회원카드 실물 지참' },
      { target: '충북도민 / 증평군민', rate: '30% 할인', discountPrice: '주중 14,000원 / 주말 10,500원', condition: '주민등록증 제시' },
      { target: '콘도 숙박 고객', rate: '25% 할인', discountPrice: '주중 15,000원 / 주말 11,250원', condition: '입실 확인 문자 제시' }
    ],
    requirements: ['단독 탑승: 키 130cm 이상 / 동반 탑승: 키 85cm~130cm 미만'],
    notes: ['무빙워크 설치로 튜브를 들고 올라갈 필요 없이 편안하게 이용 가능'],
    officialUrl: 'https://belleforetresort.com/attraction/3'
  },
  {
    id: 'belleforet-farm',
    name: '벨포레 목장 (양떼몰이·승마·동물교감)',
    mainCategory: 'leisure',
    mainCategoryLabel: '레져',
    subCategory: '자연·동물교감',
    summary: '보더콜리 양떼몰이 공연, 승마 체험, 다양한 동물들과 교감하는 친환경 힐링 목장',
    representativePrice: '목장 입장 대인 5,000원~ (승마 10,000원 / 먹이 2,000원)',
    operatingHours: '하절기 10:00~18:00 / 동절기 10:00~17:00',
    closedDay: '연중무휴 (기상악화 시 실내 위주 운영)',
    contact: '043-926-1098',
    location: '벨포레 목장 돔하우스 앞',
    ageRequirement: '승마: 36개월 이상~초등학생 (성인 승마 불가) / 36개월 미만 목장 무료입장',
    discountBadges: ['도민 1,000원 할인', '36개월 미만 무료', '회원 무료입장'],
    regularPrices: [
      { name: '목장 입장권 (주중 대인)', priceWeekday: '5,000원', priceWeekend: '-', note: '중학생 이상 (양떼몰이 관람 포함)' },
      { name: '목장 입장권 (주말/공휴일 대인)', priceWeekday: '-', priceWeekend: '8,000원', note: '중학생 이상 (양떼몰이 관람 포함)' },
      { name: '목장 입장권 (주중 소인)', priceWeekday: '4,000원', priceWeekend: '-', note: '36개월 이상 ~ 초등학생' },
      { name: '목장 입장권 (주말/공휴일 소인)', priceWeekday: '-', priceWeekend: '6,000원', note: '36개월 이상 ~ 초등학생' },
      { name: '어린이 승마 체험 (1회)', priceWeekday: '10,000원', priceWeekend: '10,000원', note: '전문 교관 인솔 트랙 3바퀴 체험' },
      { name: '동물 먹이주기 (바구니 1개)', priceWeekday: '2,000원', priceWeekend: '2,000원', note: '당근 / 건초 (자판기 또는 매표소)' }
    ],
    discounts: [
      { target: '콘도 분양회원 (본인+동반 3인)', rate: '무료 입장', discountPrice: '0원', condition: '회원카드 실물 지참' },
      { target: '충북도민', rate: '1,000원 할인', discountPrice: '주중 4,000원 / 주말 7,000원', condition: '신분증 제시' },
      { target: '36개월 미만 영유아', rate: '무료 입장', discountPrice: '0원', condition: '등본 등 증빙서류 필수' }
    ],
    requirements: ['양떼몰이 공연 시간: 주중 13:30, 15:30 / 주말 11:30, 13:30, 15:30'],
    notes: ['양, 알파카, 조랑말, 토끼, 기니피그 등 교감 가능', '얼룩말 카페 음료 구매 시 양 먹이 무료'],
    officialUrl: 'https://belleforetresort.com/attraction/1'
  },
  {
    id: 'media-art',
    name: '미디어아트센터',
    mainCategory: 'leisure',
    mainCategoryLabel: '레져',
    subCategory: '문화·전시',
    summary: '초대형 스크린과 최첨단 인터랙티브 기술이 선사하는 몰입형 미디어 전시',
    representativePrice: '대인 17,000원 / 청소년 13,000원 / 아동 10,000원',
    operatingHours: '10:00 ~ 18:00 (입장 마감 17:00)',
    closedDay: '매주 월요일 휴관',
    contact: '043-926-1160',
    location: '벨포레 미디어아트센터',
    ageRequirement: '전 연령 관람 가능 (36개월 미만 무료)',
    discountBadges: ['도민 3,000원 할인', '숙박객 3,000원 할인', '회원 50% 할인'],
    regularPrices: [
      { name: '미디어아트 성인 (19세 이상)', priceWeekday: '17,000원', priceWeekend: '17,000원', note: '빛과 바다/우주 테마 전시' },
      { name: '미디어아트 청소년 (중·고생)', priceWeekday: '13,000원', priceWeekend: '13,000원', note: '14세 ~ 18세' },
      { name: '미디어아트 아동 (36개월~초등)', priceWeekday: '10,000원', priceWeekend: '10,000원', note: '36개월 이상 ~ 13세' }
    ],
    discounts: [
      { target: '콘도 분양회원 (레드/화이트)', rate: '50% 할인', discountPrice: '8,500원', condition: '회원카드 실물 지참' },
      { target: '충북도민 / 콘도 투숙객', rate: '3,000원 할인', discountPrice: '14,000원', condition: '신분증 또는 투숙 영수증 제시' },
      { target: '36개월 미만 유아', rate: '무료 입장', discountPrice: '0원', condition: '증빙서류 지참' }
    ],
    requirements: ['플래시 및 삼각대 사용 금지', '음식물 반입 불가'],
    notes: ['비 오는 날이나 더운 날씨에도 쾌적하게 즐길 수 있는 최고의 실내 명소'],
    officialUrl: 'https://belleforetresort.com/attraction/16'
  },
  {
    id: 'marina-club',
    name: '마리나 클럽 (제트보트·요트)',
    mainCategory: 'leisure',
    mainCategoryLabel: '레져',
    subCategory: '수상·물놀이',
    summary: '원남호를 가르는 440마력 스릴 제트보트, 유유자적 럭셔리 카타마란 요트',
    representativePrice: '제트보트 30,000원 / 요트투어 20,000원',
    operatingHours: '10:00 ~ 17:30 (11월 30일까지 운영 후 동절기 휴장)',
    closedDay: '매주 월요일·화요일 휴장',
    contact: '043-926-1000',
    location: '원남호 마리나 선착장',
    ageRequirement: '제트보트: 7세 이상 ~ 65세 미만 / 요트: 전 연령 탑승 가능',
    discountBadges: ['도민 30% 할인', '숙박객 25% 할인', '회원 50% 할인'],
    regularPrices: [
      { name: '제트보트 (스릴 회전 쾌속 주행)', priceWeekday: '30,000원', priceWeekend: '30,000원', note: '4인 이상 출항 (소요시간 약 7분)' },
      { name: '카타마란 요트투어 (대인)', priceWeekday: '20,000원', priceWeekend: '20,000원', note: '원남호 풍경 감상 (소요시간 약 30분)' },
      { name: '카타마란 요트투어 (소인)', priceWeekday: '15,000원', priceWeekend: '15,000원', note: '36개월 이상 ~ 초등학생' }
    ],
    discounts: [
      { target: '충북도민', rate: '30% 할인', discountPrice: '제트보트 21,000원 / 요트 14,000원', condition: '신분증 제시' },
      { target: '콘도 숙박 고객', rate: '25% 할인', discountPrice: '제트보트 22,500원 / 요트 15,000원', condition: '투숙 영수증 제시' }
    ],
    requirements: ['구명조끼 착용 필수', '탑승 전 음주 측정 실시', '기상악화 시 운항 중단'],
    notes: ['물 튀김 방지를 위한 우비 무료 제공'],
    officialUrl: 'https://belleforetresort.com/travel/1'
  },
  {
    id: 'moto-arena',
    name: '인터내셔널 모토아레나 (서킷 레이싱)',
    mainCategory: 'leisure',
    mainCategoryLabel: '레져',
    subCategory: '육상·스피드',
    summary: '국제 공인 서킷 규격 레이싱 카트장 (최고속도 70km/h 질주)',
    representativePrice: '레저 카트 1인승 32,000원 / 2인승 40,000원',
    operatingHours: '10:00 ~ 17:30 (주행 일정에 따라 탄력 운영)',
    closedDay: '매주 화요일 휴장 (대회 일정 시 일반 주행 제한)',
    contact: '043-926-1000',
    location: '벨포레 인터내셔널 모토아레나',
    ageRequirement: '1인승: 키 155cm 이상 & 만 14세 이상 / 2인승 동승: 키 100cm 이상',
    discountBadges: ['도민 15% 할인', '숙박객 10% 할인'],
    regularPrices: [
      { name: '레저카트 1인승 (10분 주행)', priceWeekday: '32,000원', priceWeekend: '32,000원', note: 'FIA CIK 공인 인터내셔널 트랙 주행' },
      { name: '레저카트 2인승 (10분 주행)', priceWeekday: '40,000원', priceWeekend: '40,000원', note: '보호자 운전 + 동승자 탑승' }
    ],
    discounts: [
      { target: '충북도민', rate: '15% 할인', discountPrice: '1인승 27,200원 / 2인승 34,000원', condition: '신분증 제시' },
      { target: '콘도 투숙객', rate: '10% 할인', discountPrice: '1인승 28,800원 / 2인승 36,000원', condition: '투숙 영수증 제시' }
    ],
    requirements: ['안전 헬멧 및 넥 브레이스 착용 필수', '운전면허증 소지자 또는 모토스쿨 수료자 우대'],
    notes: ['레이스 랩타임 기록 측정 및 실시간 순위 전광판 표출 시스템'],
    officialUrl: 'https://belleforetresort.com/content/moto_intro'
  },
  {
    id: 'healing-forest',
    name: '벨포레 힐링포레스트 & 짚라인',
    mainCategory: 'leisure',
    mainCategoryLabel: '레져',
    subCategory: '자연·힐링',
    summary: '울창한 숲속 피톤치드 산책로와 스릴 넘치는 짚라인 공중 활강',
    representativePrice: '짚라인 1회 15,000원 / 숲치유 프로그램 무료~10,000원',
    operatingHours: '10:00 ~ 17:00',
    closedDay: '매주 월요일 휴장',
    contact: '043-926-1000',
    location: '벨포레 힐링포레스트 센터',
    ageRequirement: '짚라인: 체중 35kg 이상 ~ 100kg 이하',
    discountBadges: ['도민 20% 할인', '숙박객 20% 할인'],
    regularPrices: [
      { name: '짚라인 공중활강 1회', priceWeekday: '15,000원', priceWeekend: '15,000원', note: '두타산 숲속 활강 체험' },
      { name: '치유의 숲 명상/테라피', priceWeekday: '10,000원', priceWeekend: '10,000원', note: '숲 전문 해설사 인솔 힐링' }
    ],
    discounts: [],
    requirements: ['편안한 복장과 운동화 필수'],
    notes: ['원남호 수변산책로와 연결되어 산책하기에 최적'],
    officialUrl: 'https://belleforetresort.com/travel/3'
  },
  {
    id: 'theme-park',
    name: '벨포레 놀이동산 & 회전그네',
    mainCategory: 'leisure',
    mainCategoryLabel: '레져',
    subCategory: '놀이·테마파크',
    summary: '원남호를 내려다보는 회전그네, 바이킹, 회전목마 등 동화 같은 놀이공원',
    representativePrice: '놀이기구 1회권 4,000원~6,000원 / Big3 12,000원',
    operatingHours: '10:00 ~ 18:00',
    closedDay: '연중무휴',
    contact: '043-926-1000',
    location: '놀이동산 광장',
    ageRequirement: '기구별 신장 기준 상이 (보호자 동반 가능)',
    discountBadges: ['Big3 할인권', '회원할인'],
    regularPrices: [
      { name: '회전그네 (1회)', priceWeekday: '6,000원', priceWeekend: '6,000원', note: '원남호 호수 상공 스윙' },
      { name: '바이킹 / 회전목마 / 미니슬라이드', priceWeekday: '4,000원', priceWeekend: '4,000원', note: '어린이 인기 놀이기구' },
      { name: 'Big 3 통합이용권', priceWeekday: '12,000원', priceWeekend: '12,000원', note: '놀이기구 3종 자유 선택' }
    ],
    discounts: [],
    requirements: ['키 100cm 미만 어린이는 보호자 동반 탑승 필수'],
    notes: ['밤이 되면 화려한 LED 조명으로 변신하는 야경 명소'],
    officialUrl: 'https://belleforetresort.com/attraction/7'
  },
  {
    id: 'mini-golf',
    name: '미니골프 (18홀 퍼팅 파크)',
    mainCategory: 'leisure',
    mainCategoryLabel: '레져',
    subCategory: '놀이·테마파크',
    summary: '온 가족이 함께 즐기는 아기자기한 18홀 퍼팅 미니골프 코스',
    representativePrice: '대인 12,000원 / 소인 8,000원',
    operatingHours: '10:00 ~ 17:30',
    closedDay: '매주 월요일 휴장',
    contact: '043-926-1000',
    location: '놀이동산 옆 미니골프장',
    ageRequirement: '전 연령 이용 가능',
    discountBadges: ['도민 2,000원 할인'],
    regularPrices: [
      { name: '미니골프 18홀 (대인)', priceWeekday: '12,000원', priceWeekend: '12,000원', note: '퍼터 및 골프공 대여 포함' },
      { name: '미니골프 18홀 (소인)', priceWeekday: '8,000원', priceWeekend: '8,000원', note: '초등학생 이하' }
    ],
    discounts: [],
    requirements: ['골프 경험이 전혀 없어도 남녀노소 즐길 수 있는 가족형 퍼팅 파크'],
    notes: ['18개 홀마다 다양한 테마 장애물 설치'],
    officialUrl: 'https://belleforetresort.com/attraction/6'
  },
  {
    id: 'dino-cinema',
    name: '디노 시네마 (야외 극장 & 어린이 시네마)',
    mainCategory: 'leisure',
    mainCategoryLabel: '레져',
    subCategory: '문화·전시',
    summary: '공룡 테마 조형물과 함께 즐기는 야외 패밀리 시네마',
    representativePrice: '관람권 5,000원',
    operatingHours: '상영 일정에 따라 탄력 운영',
    closedDay: '동절기 일부 탄력 휴장',
    contact: '043-926-1000',
    location: '디노 시네마 광장',
    ageRequirement: '전 연령 이용 가능',
    discountBadges: ['목장 티켓 소지자 할인'],
    regularPrices: [
      { name: '디노 시네마 관람권', priceWeekday: '5,000원', priceWeekend: '5,000원', note: '어린이 공룡 애니메이션 상영' }
    ],
    discounts: [],
    requirements: ['상영 스케줄은 현장 매표소 안내 참조'],
    notes: ['실물 크기 움직이는 공룡 포토존 구비'],
    officialUrl: 'https://belleforetresort.com/attraction/4'
  },
  // 레저 스페셜 오퍼 / 패키지 3종
  {
    id: 'offer-ticket-5pass',
    name: '[스페셜 오퍼] 패밀리 올데이 5종 패스',
    mainCategory: 'leisure',
    mainCategoryLabel: '레져',
    subCategory: '티켓 패키지',
    summary: '마운틴카트 + 썰매무제한 + 미디어아트 + 목장 + 제트보트/스피드보트 5대 레저 파격 할인',
    representativePrice: '대인 44,000원 (정상 8.6만, 48.8%↓) / 소인 39,000원 (정상 7.3만, 46.6%↓)',
    operatingHours: '구매 후 30일 이내 사용 가능 (11월 30일까지 사용)',
    closedDay: '카트/썰매 월요일 휴장, 마리나클럽 월/화 휴장',
    contact: '1566-0162',
    location: '벨포레 리조트 레저 시설 전역',
    ageRequirement: '대인: 14세 이상~65세 미만, 키 150cm 이상 / 소인: 36개월 이상~초등 6학년',
    discountBadges: ['최대 48.8% 파격할인', '올데이 5종 올인원', '모바일 당일사용'],
    period: '2026-04-24 ~ 2026-11-30',
    isSpecialOffer: true,
    regularPrices: [
      { name: '대인 올데이 5종 패스', priceWeekday: '44,000원', priceWeekend: '44,000원', note: '정상가 86,000원 대비 48.8% 할인 (카트+썰매무제한+미디어+목장+제트보트)' },
      { name: '소인 올데이 5종 패스', priceWeekday: '39,000원', priceWeekend: '39,000원', note: '정상가 73,000원 대비 46.6% 할인 (7세 미만은 스피드보트 대체)' }
    ],
    discounts: [],
    requirements: [
      '티켓 유효기간은 구매일로부터 30일 (단, 마리나클럽 시즌 종료로 11월 30일까지 최종 사용)',
      '카트·썰매는 월요일 휴장, 마리나클럽은 월·화 휴장',
      '우천 시 목장/썰매/카트는 정상 운영되며 부분 환불 불가 (태풍·낙뢰 영업중단 시 부분환불)'
    ],
    notes: ['벨포레 공식 홈페이지 및 앱에서 구매 후 모바일 바코드로 매표소 발권 없이 바로 입장'],
    officialUrl: 'https://belleforetresort.com/package/88?sca=%ED%8B%B0%EC%BC%93'
  },
  {
    id: 'offer-ticket-4pass',
    name: '[스페셜 오퍼] 패밀리 4종 패스',
    mainCategory: 'leisure',
    mainCategoryLabel: '레져',
    subCategory: '티켓 패키지',
    summary: '마운틴카트 + 사계절썰매(무제한) + 미디어아트센터 + 벨포레목장 실속 패키지',
    representativePrice: '대인 34,000원 (정상 6.1만, 44.3%↓) / 소인 29,000원 (정상 5.1만, 43.1%↓)',
    operatingHours: '구매 후 30일 이내 사용 가능',
    closedDay: '카트/썰매 월요일 휴장',
    contact: '1566-0162',
    location: '벨포레 리조트 4대 인기 체험 시설',
    ageRequirement: '대인: 14세 이상 / 소인: 36개월 이상~초등 6학년',
    discountBadges: ['최대 44.3% 할인', '시그니처 4종 패스', '주중/주말 공용'],
    period: '2026-02-28 ~ 2026-11-30',
    isSpecialOffer: true,
    regularPrices: [
      { name: '대인 4종 패스', priceWeekday: '34,000원', priceWeekend: '34,000원', note: '정상가 61,000원 대비 44.3% 할인' },
      { name: '소인 4종 패스', priceWeekday: '29,000원', priceWeekend: '29,000원', note: '정상가 51,000원 대비 43.1% 할인' }
    ],
    discounts: [],
    requirements: ['단순 변심으로 인한 환불 불가, 미사용 티켓은 유효기간 내 사용 가능'],
    notes: ['가장 부담 없이 하루 만에 벨포레 핵심 어트랙션을 완벽 정복할 수 있는 패키지'],
    officialUrl: 'https://belleforetresort.com/package/52?sca=%ED%8B%B0%EC%BC%93'
  },
  {
    id: 'offer-ticket-musical',
    name: '[스페셜 오퍼] 미디어아트 + 어린이 공연 PKG',
    mainCategory: 'leisure',
    mainCategoryLabel: '레져',
    subCategory: '티켓 패키지',
    summary: '미디어아트센터 1인 입장 + 벨포레홀 어린이 가족 뮤지컬(별주부전) 1회 관람',
    representativePrice: '1인 15,000원 (미디어아트 + 어린이 뮤지컬 결합)',
    operatingHours: '공연: 매주 토요일 17:00 / 미디어아트: 10:00~18:00',
    closedDay: '미디어아트 월요일 휴관',
    contact: '043-926-1160',
    location: '미디어아트센터 & 벨포레홀 (103동 앞)',
    ageRequirement: '전 연령 관람 가능 (36개월 미만 무료입장)',
    discountBadges: ['뮤지컬 결합 특가', '매주 토요일 17시', '선착순 입장'],
    period: '2026-04-01 ~ 2026-12-31',
    isSpecialOffer: true,
    regularPrices: [
      { name: '미디어아트 + 뮤지컬 1인권', priceWeekday: '15,000원', priceWeekend: '15,000원', note: '미디어아트 1인 입장권 + 어린이 공연 1회 관람권' }
    ],
    discounts: [],
    requirements: ['어린이 공연은 매주 토요일 17:00 벨포레홀에서 선착순 입장으로 진행'],
    notes: ['아이들과 함께 감상하는 신나는 전래동화 뮤지컬 특별 패키지'],
    officialUrl: 'https://belleforetresort.com/package/63?sca=%ED%8B%B0%EC%BC%93'
  },

  // ==========================================
  // 4. 식음 (F&B / DINING)
  // ==========================================
  {
    id: 'dining-cucina',
    name: '쿠치나 (CUCINA - 조식 뷔페 & 레스토랑)',
    mainCategory: 'dining',
    mainCategoryLabel: '식음',
    subCategory: '뷔페·다이닝',
    summary: '모던 & 캐주얼 뷔페! 매일 아침 신선한 재료로 준비되는 벨포레 공식 조식 레스토랑',
    representativePrice: '조식 대인 33,000원 (사전예약 28,000원) / 소인 24,000원 (사전예약 19,000원)',
    operatingHours: '07:00 ~ 10:00 (입장 마감 09:30)',
    closedDay: '연중무휴',
    contact: '043-926-1078',
    location: '웰컴센터 2층',
    ageRequirement: '대인 14세 이상 / 소인 14세 미만 (36개월 미만 무료)',
    discountBadges: ['사전예약 최대 5,000원 할인', '36개월 미만 무료', '숙박객 특가'],
    regularPrices: [
      { name: '조식 뷔페 대인 (14세 이상)', priceWeekday: '33,000원', priceWeekend: '33,000원', note: '현장 정상가 기준' },
      { name: '조식 뷔페 소인 (14세 미만)', priceWeekday: '24,000원', priceWeekend: '24,000원', note: '현장 정상가 기준' },
      { name: '36개월 미만 영유아', priceWeekday: '무료', priceWeekend: '무료', note: '의료보험증/등본 등 증빙 필수' }
    ],
    discounts: [
      { target: '사전예약 & 패키지 고객 (대인)', rate: '5,000원 할인', discountPrice: '28,000원', condition: '객실 내 QR 또는 예약 시 사전 결제' },
      { target: '사전예약 & 패키지 고객 (소인)', rate: '5,000원 할인', discountPrice: '19,000원', condition: '객실 내 QR 또는 예약 시 사전 결제' }
    ],
    requirements: [
      '쿠치나 홀 이용만 가능하며 음식 테이크아웃 불가',
      '반려견 동반 입장 불가 (펫룸 투숙객 유의)',
      '업장 사정에 따라 단품 메뉴로 변경될 수 있어 사전 확인 권장'
    ],
    notes: [
      '메뉴 구성: Cold, Hot, Live Station, Salad, Bakery, Dessert, Drink 바 완비',
      '웰컴센터 2층에 위치하여 콘도 투숙객 이용 편리'
    ],
    officialUrl: 'https://belleforetresort.com/dining/7'
  },
  {
    id: 'dining-brisket',
    name: '브리스킷 346 (정통 훈제 바비큐 & 수제버거)',
    mainCategory: 'dining',
    mainCategoryLabel: '식음',
    subCategory: '양식·바비큐',
    summary: '참나무 훈연으로 12시간 이상 조리한 정통 텍사스 스타일 바비큐 & 수제버거 맛집',
    representativePrice: '수제버거 세트 16,000원~ / 바비큐 플래터 48,000원~',
    operatingHours: '11:30 ~ 21:00 (라스트오더 20:00)',
    closedDay: '연중무휴',
    contact: '043-926-1077',
    location: '놀이동산 회전그네 옆 (무빙워크 이용 가능)',
    discountBadges: ['리조트 내 픽업 서비스', '배달/포장 주문 가능'],
    regularPrices: [
      { name: '브리스킷 버거 세트', priceWeekday: '16,000원', priceWeekend: '16,000원', note: '12시간 훈연 브리스킷 패티 + 감자튀김 + 음료' },
      { name: '풀드포크 버거 세트', priceWeekday: '15,000원', priceWeekend: '15,000원', note: '부드러운 풀드포크 수제버거 세트' },
      { name: '브리스킷 바비큐 플래터 (2인)', priceWeekday: '48,000원', priceWeekend: '48,000원', note: '브리스킷 + 풀드포크 + 모닝빵 + 코울슬로' }
    ],
    discounts: [],
    requirements: ['도보 이동 불편 시 전화 요청 시 픽업 셔틀 차량 운행'],
    notes: [
      '픽업 노선: 브리스킷 주차장 ↔ 브리스킷346 / 투썸 정류장 ↔ 브리스킷346 / 클럽하우스 ↔ 브리스킷346',
      '객실 배달 주문 가능 (전용 모바일 주문 페이지 제공)'
    ],
    officialUrl: 'https://belleforetresort.com/dining/6'
  },
  {
    id: 'dining-namdo',
    name: '남도예담 인 벨포레 (담양 정통 떡갈비)',
    mainCategory: 'dining',
    mainCategoryLabel: '식음',
    subCategory: '한식 정식',
    summary: '담양의 대한민국 3대 떡갈비 명가! 주문 즉시 참숯에 구워내는 정갈한 한상차림',
    representativePrice: '한돈 떡갈비 28,000원 / 반반 33,000원 / 한우 39,000원',
    operatingHours: '10:30 ~ 21:00 (라스트오더 20:00)',
    closedDay: '연중무휴',
    contact: '043-926-1076',
    location: '벨포레 놀이동산 입구',
    discountBadges: ['대나무 죽순 요리 기본제공', '가족모임 룸 구비'],
    regularPrices: [
      { name: '한우 떡갈비 정식 (1인)', priceWeekday: '39,000원', priceWeekend: '39,000원', note: '100% 국내산 한우 수제 떡갈비 한상' },
      { name: '반반 떡갈비 정식 (1인)', priceWeekday: '33,000원', priceWeekend: '33,000원', note: '한우 떡갈비 1쪽 + 한돈 떡갈비 1쪽' },
      { name: '한돈 떡갈비 정식 (1인)', priceWeekday: '28,000원', priceWeekend: '28,000원', note: '국내산 암퇘지 수제 떡갈비 정식' },
      { name: '황금 보리굴비 정식 (1인)', priceWeekday: '35,000원', priceWeekend: '35,000원', note: '영광 보리굴비 + 녹차물 밥상' },
      { name: '모듬 해물장 정식 (1인)', priceWeekday: '39,000원', priceWeekend: '39,000원', note: '간장게장, 새우장, 연어장, 전복장' }
    ],
    discounts: [],
    requirements: ['정식 메뉴는 2인 이상 주문 가능'],
    notes: ['대통밥 추가 가능, 어르신 및 부모님 동반 가족 식사로 리조트 내 선호도 1위'],
    officialUrl: 'https://belleforetresort.com/dining/4'
  },
  {
    id: 'dining-delight',
    name: '딜라이트 (매표소 푸드코트 & 카페)',
    mainCategory: 'dining',
    mainCategoryLabel: '식음',
    subCategory: '스낵·분식',
    summary: '매표소 2층에서 즐기는 돈까스, 버거, 제육덮밥, 우동, 떡볶이 등 온 가족 간편 식사',
    representativePrice: '식사류 10,000원~13,000원 / 스낵 5,000원~',
    operatingHours: '10:00 ~ 17:30 (라스트오더 17:00)',
    closedDay: '매주 월~수 휴장 (목~일 운영)',
    contact: '043-926-1073',
    location: '티켓 매표소 2층',
    discountBadges: ['매표소 바로 위', '빠른 식사 지원'],
    regularPrices: [
      { name: '수제돈까스', priceWeekday: '13,000원', priceWeekend: '13,000원', note: '바삭한 경양식 돈까스' },
      { name: '수제버거 단품', priceWeekday: '12,000원', priceWeekend: '12,000원', note: '패티 수제버거' },
      { name: '제육덮밥 / 불고기덮밥', priceWeekday: '13,000원', priceWeekend: '13,000원', note: '든든한 한식 덮밥' },
      { name: '자장면 / 우동', priceWeekday: '10,000원~11,000원', priceWeekend: '10,000원~11,000원', note: '어린이 선호 면 요리' },
      { name: '떡볶이 / 모듬튀김', priceWeekday: '7,000원~8,000원', priceWeekend: '7,000원~8,000원', note: '매콤달콤 국민 간식' },
      { name: '회오리감자 / 소떡소떡 / 츄러스', priceWeekday: '5,000원', priceWeekend: '5,000원', note: '간식 스낵' }
    ],
    discounts: [],
    requirements: ['셀프 서비스 운영'],
    notes: ['매표소 2층에 위치하여 어트랙션 이용 전후 편리한 식사 가능'],
    officialUrl: 'https://belleforetresort.com/dining/2'
  },
  {
    id: 'dining-bambam',
    name: '밤밤테이블 (글램핑 텐트 바비큐)',
    mainCategory: 'dining',
    mainCategoryLabel: '식음',
    subCategory: '바비큐·텐트',
    summary: '프라이빗 글램핑 텐트에서 즐기는 낭만적인 야외 바비큐 파티 (반려견 동반 가능)',
    representativePrice: '개인 텐트(12인 정원) / 단체 텐트(42인) 100% 사전 예약제',
    operatingHours: '주중 16:00~22:30 / 주말 11:00~22:30 (브레이크타임 14:30~16:00)',
    closedDay: '매주 화요일 휴무 (공휴일·공휴일 전일 정상 운영)',
    contact: '043-926-1076',
    location: '콘도 103동 맞은편 벨포레홀 주차장 좌측 내리막길 (도보 3분)',
    discountBadges: ['100% 사전예약제', '반려동물 동반가능 (리드줄 필수)'],
    regularPrices: [
      { name: '개인 텐트 (12인 정원)', priceWeekday: '현장/유선 예약 문의', priceWeekend: '현장/유선 예약 문의', note: '프라이빗 독립 텐트' },
      { name: '단체 텐트 (42인 정원)', priceWeekday: '현장/유선 예약 문의', priceWeekend: '현장/유선 예약 문의', note: '기업/워크숍/동호회 대관' },
      { name: '공용 텐트 (금·토 한정)', priceWeekday: '-', priceWeekend: '무료', note: '금·토 한정 공용 공간 오픈' },
      { name: '한돈 삼겹살 / 목살 / 꼬들살 (100g)', priceWeekday: '12,000원', priceWeekend: '12,000원', note: '바비큐 구이용 정육' },
      { name: '부대찌개 / 오뎅탕 밀키트', priceWeekday: '25,000원~30,000원', priceWeekend: '25,000원~30,000원', note: '캠핑 전골 밀키트' }
    ],
    discounts: [],
    requirements: ['외부 음식 및 주류 반입 금지', '반려견 동반 시 리드줄 필수 착용'],
    notes: ['감성적인 캠핑 무드와 함께 최고급 바비큐 고기 세트 현장 구매 구비'],
    officialUrl: 'https://belleforetresort.com/dining/13'
  },
  {
    id: 'dining-pitstop',
    name: '핏스탑 (모토아레나 카페 & 스낵)',
    mainCategory: 'dining',
    mainCategoryLabel: '식음',
    subCategory: '카페·스낵',
    summary: '모토아레나 서킷을 한눈에 조망하며 즐기는 핫도그 세트 및 시원한 음료',
    representativePrice: '핫도그 세트 8,000원~ / 커피·음료 4,000원~',
    operatingHours: '11:00 ~ 17:00 (식사류 주문마감 16:00, 음료마감 17:00)',
    closedDay: '매주 월요일 휴무 (화~일·공휴일·연휴 운영)',
    contact: '1566-0162',
    location: '모토아레나 내 모토플라자 3층 (주차 가능)',
    discountBadges: ['서킷 파노라마 뷰', '식사&음료'],
    regularPrices: [
      { name: '모토 핫도그 세트', priceWeekday: '8,500원', priceWeekend: '8,500원', note: '아메리칸 소시지 핫도그 + 음료' },
      { name: '아메리카노 / 카페라떼', priceWeekday: '4,500원~5,000원', priceWeekend: '4,500원~5,000원', note: '커피류' }
    ],
    discounts: [],
    requirements: ['핫도그 등 식사류는 16:00 주문 마감'],
    notes: ['모토아레나 서킷 전경이 시원하게 펼쳐지는 전용 라운지'],
    officialUrl: 'https://belleforetresort.com/dining/10'
  },
  {
    id: 'dining-zebra',
    name: '얼룩말카페 (목장 힐링 카페)',
    mainCategory: 'dining',
    mainCategoryLabel: '식음',
    subCategory: '카페·디저트',
    summary: '벨포레 목장 안 돔하우스 앞! 제조 음료 주문 시 양 먹이 무료 증정',
    representativePrice: '시그니처 바닐라클라우드 라떼 7,000원 / 아메리카노 5,500원',
    operatingHours: '10:00 ~ 17:30 (라스트오더 17:00)',
    closedDay: '연중무휴 (상시운영)',
    contact: '043-926-1083',
    location: '벨포레 목장 내 돔하우스 앞',
    discountBadges: ['음료 구매시 양 먹이 무료', '시그니처 라떼'],
    regularPrices: [
      { name: '시그니처 바닐라 클라우드 라떼', priceWeekday: '7,000원', priceWeekend: '7,000원', note: '커피 / Non-커피 밀크 선택 가능' },
      { name: '아메리카노 / 카페라떼', priceWeekday: '5,500원~6,000원', priceWeekend: '5,500원~6,000원', note: '디카페인 변경 +1,000원' },
      { name: '에이드 / 과일라떼', priceWeekday: '6,500원~7,000원', priceWeekend: '6,500원~7,000원', note: '딸기라떼, 청포도에이드 등' }
    ],
    discounts: [],
    requirements: ['목장 입장객 전용 이용 공간'],
    notes: ['얼룩말카페 제조 음료 1잔 주문 시 양 먹이 1컵 무료 증정 혜택'],
    officialUrl: 'https://belleforetresort.com/dining/3'
  },
  {
    id: 'dining-twosome',
    name: '투썸플레이스 (투썸 인 벨포레)',
    mainCategory: 'dining',
    mainCategoryLabel: '식음',
    subCategory: '카페·디저트',
    summary: '원남호 전망을 바라보며 즐기는 프리미엄 디저트 & 스페셜티 커피',
    representativePrice: '아메리카노 4,500원 / 조각 케이크 6,500원~',
    operatingHours: '09:00 ~ 20:00',
    closedDay: '연중무휴 (상시운영)',
    contact: '043-926-1080',
    location: '투썸플레이스 정류장 앞 단독 매장',
    discountBadges: ['투썸 정품 멤버십 적립 가능', '테라스 호수 전망'],
    regularPrices: [
      { name: '아메리카노 (레귤러)', priceWeekday: '4,500원', priceWeekend: '4,500원', note: '블랙그라운드 / 아로마노트' },
      { name: '스초생 (스트로베리 초콜릿 생크림 케이크)', priceWeekday: '6,700원', priceWeekend: '6,700원', note: '조각 케이크' }
    ],
    discounts: [],
    requirements: [],
    notes: ['리조트 내 셔틀버스 정류장 바로 앞에 위치하여 이동 중 티타임에 최적'],
    officialUrl: 'https://belleforetresort.com/dining/1'
  },
  {
    id: 'dining-bhc',
    name: 'BHC 치킨 (BHC(멕시카나))',
    mainCategory: 'dining',
    mainCategoryLabel: '식음',
    subCategory: '치킨·야식',
    summary: '신선한 원재료와 차별화된 레시피로 콘도 투숙객의 야식 치맥을 책임지는 치킨 전문점',
    representativePrice: '뿌링클 / 맛초킹 / 후라이드 20,000원~22,000원',
    operatingHours: '17:00 ~ 21:30 (상시운영)',
    closedDay: '연중무휴 (상시운영)',
    contact: '043-926-1082',
    location: '콘도미니엄 104동 앞 / CU편의점 옆 (101~103동 연결 통로 도보 2~3분)',
    discountBadges: ['야식 치킨 테이크아웃', '상시운영'],
    regularPrices: [
      { name: 'BHC 뿌링클 / 맛초킹 / 골드킹', priceWeekday: '21,000원~22,000원', priceWeekend: '21,000원~22,000원', note: '인기 시그니처 치킨' },
      { name: '후라이드 / 양념 치킨', priceWeekday: '20,000원~21,000원', priceWeekend: '20,000원~21,000원', note: '기본 치킨 메뉴' }
    ],
    discounts: [],
    requirements: ['픽업만 가능 (홀 이용 및 배달 불가)'],
    notes: ['104동 앞 위치로 투숙객들의 늦은 시간 야식 테이크아웃에 최적'],
    officialUrl: 'https://belleforetresort.com/dining/15'
  },
  {
    id: 'dining-cu',
    name: 'CU 편의점',
    mainCategory: 'dining',
    mainCategoryLabel: '식음',
    subCategory: '편의점',
    summary: '다양한 상품과 합리적 가격의 리조트 내 가장 가까운 24시간 하이브리드 편의점',
    representativePrice: '편의점 정가 판매',
    operatingHours: '13:00 ~ 22:00 유인 운영 / 22:00 ~ 13:00 무인 운영',
    closedDay: '연중무휴 (24시간 상시운영)',
    contact: '043-926-1081',
    location: '콘도미니엄 104동 앞 / BHC 치킨 옆',
    discountBadges: ['24시간 편의점', '유·무인 복합운영'],
    regularPrices: [
      { name: '스낵 / 음료 / 간편식 / 생활용품', priceWeekday: '정가', priceWeekend: '정가', note: '무인 시간대(22:00~13:00) 주류 및 담배 구매 불가' }
    ],
    discounts: [],
    requirements: ['야간 무인 시간(22:00~13:00)에는 주류 및 담배 구매 불가'],
    notes: ['콘도 101~104동에서 도보 2~3분 거리 위치'],
    officialUrl: 'https://belleforetresort.com/dining/16'
  }
];
