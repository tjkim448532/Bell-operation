import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC3cAL9Qr3ke0pVsMENWQNp75OLFjECpxo",
  authDomain: "bell-operation.firebaseapp.com",
  projectId: "bell-operation",
  storageBucket: "bell-operation.firebasestorage.app",
  messagingSenderId: "593133920835",
  appId: "1:593133920835:web:61f25b39170b2f62ce6af6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const INITIAL_SPOTS = [
  {
    spotId: 'SPOT-LOBBY-01',
    zoneName: '본관 실내',
    spotName: '로비 동측 안내데스크 옆',
    mediaType: 'BANNER',
    specWidthMm: 600,
    specHeightMm: 1800,
    finishingGuide: '단면 고해상도 PET 출력, 물통형 거치대 마감 (사방 쇠고리 아일렛)',
    spotImageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    isActive: true,
  },
  {
    spotId: 'SPOT-LOBBY-02',
    zoneName: '본관 실내',
    spotName: '중앙 엘리베이터 홀 입구',
    mediaType: 'BANNER',
    specWidthMm: 600,
    specHeightMm: 1800,
    finishingGuide: 'X형 거치대용 무광 PET 배너 (상하좌우 15mm 여백 확보)',
    spotImageUrl: 'https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=800&q=80',
    isActive: true,
  },
  {
    spotId: 'SPOT-CAFETERIA-01',
    zoneName: '본관 실내',
    spotName: '지하 1층 구내식당 진입로',
    mediaType: 'POSTER',
    specWidthMm: 594,
    specHeightMm: 841,
    finishingGuide: 'A1 규격 고급 인화지 출력, 원터치 알루미늄 슬라이드 개폐 프레임 규격',
    spotImageUrl: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80',
    isActive: true,
  },
  {
    spotId: 'SPOT-PLAZA-01',
    zoneName: '중앙 광장',
    spotName: '중앙 광장 시계탑 앞 휀스',
    mediaType: 'PLACARD',
    specWidthMm: 5000,
    specHeightMm: 900,
    finishingGuide: '실외 내후성 솔벤트 텐트천 출력, 사방 아일렛 50cm 간격 타공 및 고탄성 로프 마감',
    spotImageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80',
    isActive: true,
  },
  {
    spotId: 'SPOT-PLAZA-02',
    zoneName: '중앙 광장',
    spotName: '야외 테라스 카페 앞 데크',
    mediaType: 'BANNER',
    specWidthMm: 800,
    specHeightMm: 1800,
    finishingGuide: '강풍 대비 20L 중대형 사각 물통 거치대 전용 양면/단면 매트 배너',
    spotImageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',
    isActive: true,
  },
  {
    spotId: 'SPOT-CONF-01',
    zoneName: '컨퍼런스동',
    spotName: '대강당 메인 로비 정면',
    mediaType: 'POSTER',
    specWidthMm: 841,
    specHeightMm: 1189,
    finishingGuide: 'A0 대형 규격, 투명 아크릴 다보 볼트 고정용 사방 20mm 천공 마감',
    spotImageUrl: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=800&q=80',
    isActive: true,
  },
  {
    spotId: 'SPOT-CONF-02',
    zoneName: '컨퍼런스동',
    spotName: '2층 세미나실 복도 입구',
    mediaType: 'BANNER',
    specWidthMm: 850,
    specHeightMm: 2000,
    finishingGuide: '고급 크롬 롤업(Roll-up) 거치대 전용 0.22mm 블라인드 필름 출력',
    spotImageUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80',
    isActive: true,
  },
  {
    spotId: 'SPOT-GATE-01',
    zoneName: '진입로 및 외곽',
    spotName: '정문 진입로 게이트 휀스',
    mediaType: 'PLACARD',
    specWidthMm: 6000,
    specHeightMm: 900,
    finishingGuide: '강풍 안전 통풍 메쉬(Mesh) 원단, 열풍 융착 테두리 및 쇠고리 마감',
    spotImageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80',
    isActive: true,
  },
];

const getRelativeDate = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const INITIAL_RESERVATIONS = [
  {
    reservationId: 'RES-2026-001',
    spotId: 'SPOT-LOBBY-01',
    zoneName: '본관 실내',
    spotName: '로비 동측 안내데스크 옆',
    mediaType: 'BANNER',
    specSummary: '600 × 1,800 mm',
    requesterName: '김철수',
    requesterDept: '경영지원팀',
    title: '2026년 하반기 사내 안전보건 정기교육 안내',
    purpose: '전 임직원 필수 법정의무교육 이수 독려 및 온라인 수강 링크 홍보',
    startDate: getRelativeDate(2),
    endDate: getRelativeDate(9),
    draftImageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80',
    installedImageUrl: null,
    status: 'PENDING',
    rejectReason: null,
    createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
  },
  {
    reservationId: 'RES-2026-002',
    spotId: 'SPOT-LOBBY-02',
    zoneName: '본관 실내',
    spotName: '중앙 엘리베이터 홀 입구',
    mediaType: 'BANNER',
    specSummary: '600 × 1,800 mm',
    requesterName: '이민지',
    requesterDept: 'DX혁신추진팀',
    title: '사내 AI Agent 해커톤 및 아이디어 챌린지',
    purpose: '생성형 AI 기반 업무 자동화 우수 아이디어 발굴 및 사내 시상식 홍보',
    startDate: getRelativeDate(-1),
    endDate: getRelativeDate(6),
    draftImageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
    installedImageUrl: null,
    status: 'APPROVED',
    rejectReason: null,
    createdAt: new Date(Date.now() - 3600 * 1000 * 36).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 10).toISOString(),
  },
  {
    reservationId: 'RES-2026-003',
    spotId: 'SPOT-CAFETERIA-01',
    zoneName: '본관 실내',
    spotName: '지하 1층 구내식당 진입로',
    mediaType: 'POSTER',
    specSummary: '594 × 841 mm',
    requesterName: '박준호',
    requesterDept: '인사총무팀',
    title: '임직원 마음건강 심리상담 센터 운영 안내',
    purpose: '익명 심리상담 예약 프로세스 및 전문 상담사 상주 시간표 안내',
    startDate: getRelativeDate(-4),
    endDate: getRelativeDate(3),
    draftImageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
    installedImageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
    status: 'INSTALLED',
    rejectReason: null,
    createdAt: new Date(Date.now() - 3600 * 1000 * 96).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 80).toISOString(),
  },
  {
    reservationId: 'RES-2026-004',
    spotId: 'SPOT-PLAZA-01',
    zoneName: '중앙 광장',
    spotName: '중앙 광장 시계탑 앞 휀스',
    mediaType: 'PLACARD',
    specSummary: '5,000 × 900 mm',
    requesterName: '최원석',
    requesterDept: '노사상생협의회',
    title: '2026 상반기 노사 한마음 체육대회 개최',
    purpose: '전사 체육대회 종목별 대진표 및 기념품 증정 안내',
    startDate: getRelativeDate(-10),
    endDate: getRelativeDate(-2),
    draftImageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=80',
    installedImageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=600&q=80',
    status: 'EXPIRED_OVERDUE',
    rejectReason: null,
    createdAt: new Date(Date.now() - 3600 * 1000 * 240).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
  },
  {
    reservationId: 'RES-2026-005',
    spotId: 'SPOT-CONF-01',
    zoneName: '컨퍼런스동',
    spotName: '대강당 메인 로비 정면',
    mediaType: 'POSTER',
    specSummary: '841 × 1,189 mm',
    requesterName: '정다은',
    requesterDept: '사내 동호회 연합',
    title: '주말 볼링 & e스포츠 친선 교류전 참가자 모집',
    purpose: '친목 동호회 정기 모임 홍보',
    startDate: getRelativeDate(5),
    endDate: getRelativeDate(12),
    draftImageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
    installedImageUrl: null,
    status: 'REJECTED',
    rejectReason: '컨퍼런스홀 메인 로비는 사외 고객 방문 및 공식 전사 행사용 거점입니다. 사내 동호회 홍보는 사내 인트라넷 게시판 또는 동호회 전용 게시판을 이용해 주시기 바랍니다.',
    createdAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 20).toISOString(),
  },
  {
    reservationId: 'RES-2026-006',
    spotId: 'SPOT-GATE-01',
    zoneName: '진입로 및 외곽',
    spotName: '정문 진입로 게이트 휀스',
    mediaType: 'PLACARD',
    specSummary: '6,000 × 900 mm',
    requesterName: '강태양',
    requesterDept: '홍보브랜드팀',
    title: '글로벌 품질 인증 ISO 9001 갱신 달성 축하',
    purpose: '대외 고객사 방문 시 당사 기술력 및 신뢰도 홍보',
    startDate: getRelativeDate(-20),
    endDate: getRelativeDate(-5),
    draftImageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
    installedImageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=600&q=80',
    status: 'REMOVED',
    rejectReason: null,
    createdAt: new Date(Date.now() - 3600 * 1000 * 400).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 120).toISOString(),
  },
];

async function seed() {
  console.log('Seeding ad_spots to Firestore bell-operation...');
  for (const s of INITIAL_SPOTS) {
    await setDoc(doc(db, 'ad_spots', s.spotId), s);
    console.log(`  Added spot: ${s.spotId}`);
  }

  console.log('Seeding ad_reservations to Firestore bell-operation...');
  for (const r of INITIAL_RESERVATIONS) {
    await setDoc(doc(db, 'ad_reservations', r.reservationId), r);
    console.log(`  Added reservation: ${r.reservationId}`);
  }

  console.log('Done!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
