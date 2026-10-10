/**
 * 벨포레 3단계 친화형 비용 분류(의·식·주, 상품매입, 7자리 계정코드) 전면 마이그레이션 스크립트
 * 대상: Firestore `expenses_v2` 전체 도큐먼트
 */

const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc,
} = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC3cAL9Qr3ke0pVsMENWQNp75OLFjECpxo",
  authDomain: "bell-operation.firebaseapp.com",
  projectId: "bell-operation",
  storageBucket: "bell-operation.firebasestorage.app",
  messagingSenderId: "593133920835",
  appId: "1:593133920835:web:61f25b39170b2f62ce6af6",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function makeFriendlyCategory(accountCode, accountName, memo, clientName) {
  const code = (accountCode || '').replace(/[^0-9]/g, '');
  const name = (accountName || '').trim();
  const m = (memo || '').trim();
  const cl = (clientName || '').trim();

  // (1) 판매용 상품 및 기프트샵 물품 매입
  if (
    code.startsWith('146') ||
    code.startsWith('451') ||
    name.includes('상품매입') ||
    name.includes('상품') ||
    name.includes('원재료') ||
    cl.includes('토이즈') ||
    m.includes('기프트샵') ||
    m.includes('기념품') ||
    m.includes('선물용품') ||
    m.includes('장난감') ||
    m.includes('인형')
  ) {
    return { category: '판매용 상품·기프트샵 물품 매입', subcategory: '상품/기프트샵 매입' };
  }

  // (2) 직원 기숙사 및 숙소 월세
  if (
    (code.startsWith('619') || code.startsWith('819') || name.includes('임차료') || name.includes('기숙사') || name.includes('월세')) &&
    (cl.includes('대성베르힐') || cl.includes('햇살나무') || cl.includes('로망스빌') || cl.includes('오피스텔') || cl.includes('원룸') ||
     m.includes('대성베르힐') || m.includes('햇살나무') || m.includes('로망스빌') || m.includes('기숙사') || m.includes('숙소') || m.includes('월세') || m.includes('사택') ||
     name.includes('기숙사') || name.includes('숙소'))
  ) {
    return { category: '직원 기숙사와 숙소 월세', subcategory: '직원 기숙사/숙소 월세' };
  }

  // (3) 직원 유니폼 및 피복비
  if (
    code === '6110009' ||
    code.startsWith('6110009') ||
    name.includes('피복') ||
    name.includes('유니폼') ||
    m.includes('피복') ||
    m.includes('유니폼')
  ) {
    return { category: '직원 유니폼과 피복비', subcategory: '직원 유니폼/피복비' };
  }

  // (4) 아르바이트비 (알바비)
  if (
    code.startsWith('604') ||
    code.startsWith('804') ||
    name.includes('잡급') ||
    name.includes('일용') ||
    name.includes('아르바이트') ||
    m.includes('일용') ||
    m.includes('아르바이트') ||
    m.includes('알바') ||
    m.includes('잡급')
  ) {
    return { category: '아르바이트비 (알바비)', subcategory: '아르바이트/일용직 노임' };
  }

  // (5) 정규직 직원 급여
  if (
    code.startsWith('603') ||
    code.startsWith('802') ||
    code.startsWith('803') ||
    ((name.includes('급여') || name.includes('상여')) && !name.includes('퇴직')) ||
    ((m.includes('급여') || m.includes('상여')) && !m.includes('퇴직') && !m.includes('일용') && !m.includes('알바'))
  ) {
    return { category: '정규직 직원 급여', subcategory: '정규직 직원 월급/상여' };
  }

  // (6) 직원 4대보험과 국민연금
  if (
    code.startsWith('609') ||
    code.startsWith('806') ||
    code === '6110003' ||
    name.includes('퇴직') ||
    name.includes('국민연금') ||
    name.includes('건강보험') ||
    name.includes('고용보험') ||
    name.includes('산재보험') ||
    cl.includes('국민건강보험') ||
    cl.includes('국민연금') ||
    cl.includes('근로복지공단') ||
    m.includes('국민건강보험') ||
    m.includes('국민연금') ||
    m.includes('근로복지공단') ||
    m.includes('퇴직')
  ) {
    return { category: '직원 4대보험과 국민연금 (직원비용)', subcategory: '4대보험 및 국민연금' };
  }

  // (7) 직원 밥값과 간식비
  if (
    code === '6110007' ||
    code === '6110008' ||
    name.includes('식대') ||
    cl.includes('삼성웰스토리') ||
    cl.includes('웰스토리') ||
    m.includes('식대') ||
    m.includes('구내식당') ||
    m.includes('간식') ||
    name.includes('복리후생비')
  ) {
    return { category: '직원 밥값과 간식비', subcategory: '직원 식사/간식' };
  }

  // (8) 손님과 시설 안전 보험료
  if (
    name.includes('보험료') ||
    cl.includes('화재해상') ||
    cl.includes('손해보험') ||
    m.includes('영업배상') ||
    m.includes('화재보험')
  ) {
    return { category: '손님과 시설 안전 보험료', subcategory: '화재/영업배상/시설손해보험' };
  }

  // (9) 전기세와 물·가스 요금
  if (
    name.includes('수도광열비') ||
    name.includes('전력비') ||
    cl.includes('한국전력') ||
    cl.includes('상수도') ||
    cl.includes('도시가스')
  ) {
    return { category: '전기세와 물·가스 요금', subcategory: '전기/수도 요금' };
  }

  // (10) 인터넷과 전화 요금
  if (
    name.includes('통신비') ||
    cl.includes('케이티') ||
    cl.includes('KT') ||
    cl.includes('LG유플러스') ||
    cl.includes('SK텔레콤') ||
    cl.includes('SK브로드밴드')
  ) {
    return { category: '인터넷과 전화 요금', subcategory: '인터넷/무전기/통신료' };
  }

  // (11) 정수기와 차량 빌린 돈
  if (
    name.includes('임차료') ||
    cl.includes('코웨이') ||
    cl.includes('SK매직') ||
    cl.includes('청호나이스') ||
    cl.includes('캐피탈') ||
    cl.includes('렌탈') ||
    m.includes('렌탈') ||
    m.includes('정수기')
  ) {
    return { category: '정수기와 차량 빌린 돈', subcategory: '정수기/차량 렌탈료' };
  }

  // (12) 현수막·배너 만들기와 홍보비
  if (
    name.includes('광고선전비') ||
    name.includes('도서인쇄비') ||
    m.includes('현수막') ||
    m.includes('배너') ||
    m.includes('포스터') ||
    m.includes('인쇄')
  ) {
    return { category: '현수막·배너 만들기와 홍보비', subcategory: '안내판/배너/광고 제작' };
  }

  // (13) 고장난 시설과 기구 고치기
  if (name.includes('수선비') || m.includes('수리') || m.includes('보수') || m.includes('부품교체')) {
    return { category: '고장난 시설과 기구 고치기', subcategory: '놀이기구/시설물 수리비' };
  }

  // (14) 리조트 차량 기름값과 정비
  if (
    name.includes('차량유지비') ||
    m.includes('주유') ||
    m.includes('정비') ||
    cl.includes('주유소') ||
    cl.includes('오일')
  ) {
    return { category: '리조트 차량 기름값과 정비', subcategory: '차량 주유/정비비' };
  }

  // (15) 카드단말기·서비스 수수료
  if (
    name.includes('지급수수료') ||
    m.includes('수수료') ||
    m.includes('VAN') ||
    m.includes('결제대행') ||
    cl.includes('나이스정보통신') ||
    cl.includes('KICC') ||
    cl.includes('KSNET')
  ) {
    return { category: '카드단말기·서비스 수수료', subcategory: '결제/프로그램 수수료' };
  }

  // (16) 나라와 지자체에 낸 세금
  if (
    name.includes('세금과공과') ||
    m.includes('세금') ||
    m.includes('과태료') ||
    m.includes('공과금') ||
    cl.includes('세무서') ||
    cl.includes('구청') ||
    cl.includes('군청')
  ) {
    return { category: '나라와 지자체에 낸 세금', subcategory: '지방세/공과금' };
  }

  // (17) 좋은 일 돕기 (기부금)
  if (name.includes('기부금') || m.includes('기부')) {
    return { category: '좋은 일 돕기 (기부금)', subcategory: '지역 장학/사회 공헌' };
  }

  // (18) 영업장에 필요한 물건 사기
  if (name.includes('소모품비') || name.includes('사무용품비') || m.includes('비품') || m.includes('소모품')) {
    return { category: '영업장에 필요한 물건 사기', subcategory: '현장 비품/소모품 구매' };
  }

  return { category: '기타 운영 지출', subcategory: '미분류' };
}

async function migrate() {
  console.log('🔄 Firestore `expenses_v2` 전체 전표 조회 중...');
  const collRef = collection(db, 'expenses_v2');
  const snap = await getDocs(collRef);
  console.log(`📊 총 ${snap.size}개 도큐먼트 로드 완료.`);

  let updatedCount = 0;
  let batch = writeBatch(db);
  let batchOps = 0;
  const categoryCounts = {};

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const { category, subcategory } = makeFriendlyCategory(
      data.accountCode,
      data.accountName,
      data.memo,
      data.clientName
    );

    categoryCounts[category] = (categoryCounts[category] || 0) + 1;

    // 변경 사항이 있는 경우만 업데이트
    if (data.friendlyCategory !== category || data.friendlySubcategory !== subcategory) {
      batch.update(docSnap.ref, {
        friendlyCategory: category,
        friendlySubcategory: subcategory,
        updatedAt: new Date().toISOString(),
      });
      updatedCount++;
      batchOps++;

      if (batchOps >= 400) {
        console.log(`💾 400건 배치 커밋 중... (진행: ${updatedCount}건 업데이트)`);
        await batch.commit();
        batch = writeBatch(db);
        batchOps = 0;
      }
    }
  }

  if (batchOps > 0) {
    console.log(`💾 마지막 ${batchOps}건 배치 커밋 중...`);
    await batch.commit();
  }

  console.log('\n==================================================');
  console.log('🎉 [마이그레이션 완료 보고]');
  console.log(`총 검사 전표: ${snap.size}건`);
  console.log(`업데이트된 전표: ${updatedCount}건`);
  console.log('--------------------------------------------------');
  console.log('📊 3단계 친화형 카테고리별 전표 분포:');
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, cnt]) => {
      console.log(` - ${cat}: ${cnt}건`);
    });
  console.log('==================================================\n');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
