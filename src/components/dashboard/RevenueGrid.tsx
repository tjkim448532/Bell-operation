import React from 'react';

// 1. 공통 숫자 포맷팅 유틸리티 (₩ 기호 제외, #,##0 서식)
const formatRevenue = (val: number) => val ? val.toLocaleString('ko-KR') : '0';

// (타입 정의: 백엔드에서 넘어오는 8단계 계층 및 검증 객체)
export interface ValidationMaster {
  originalTotal: number;
  payloadTotal: number;
  variance: number;
  isZeroVariance: boolean;
}

// ... 중략 (8단계 하위 트리 인터페이스 정의) ...
export interface GridProps {
  data: any[]; // 백엔드 8단계 중첩 배열
  validationMaster: ValidationMaster;
}

export default function RevenueGrid({ data, validationMaster }: GridProps) {
  // 프론트엔드 연산(reduce 등) 완전 배제. 백엔드가 준 rowSpan과 subtotal을 그대로 렌더링.
  
  const renderRows = () => {
    const rows: React.ReactNode[] = [];
    
    // 트리 순회하며 Flat한 <tr> 배열로 변환 (UI 렌더링용)
    (data || []).forEach((category) => {
      (category.teams || []).forEach((team: any, teamIdx: number) => {
        (team.parts || []).forEach((part: any, partIdx: number) => {
          (part.venues || []).forEach((venue: any, venueIdx: number) => {
            (venue.ticket_groups || []).forEach((tg: any, tgIdx: number) => {
              (tg.products || []).forEach((product: any, prodIdx: number) => {
                
                // 각 계층의 첫 번째 요소일 때만 td(rowSpan) 렌더링
                const isFirstCategory = teamIdx === 0 && partIdx === 0 && venueIdx === 0 && tgIdx === 0 && prodIdx === 0;
                const isFirstTeam = partIdx === 0 && venueIdx === 0 && tgIdx === 0 && prodIdx === 0;
                const isFirstPart = venueIdx === 0 && tgIdx === 0 && prodIdx === 0;
                const isFirstVenue = tgIdx === 0 && prodIdx === 0;
                const isFirstTg = prodIdx === 0;

                rows.push(
                  <tr key={`${category.category_code}-${product.product_name}-${prodIdx}-${Math.random()}`} className="border-b hover:bg-gray-50">
                    {isFirstCategory && (
                      <td rowSpan={category.rowSpan || 1} className="p-2 font-bold bg-gray-100 border-r">
                        {category.category_code}
                      </td>
                    )}
                    {isFirstTeam && (
                      <td rowSpan={team.rowSpan || 1} className="p-2 bg-gray-50 border-r">
                        {team.team_name}
                      </td>
                    )}
                    {isFirstPart && (
                      <td rowSpan={part.rowSpan || 1} className="p-2 bg-gray-50 border-r">
                        {part.part_name}
                      </td>
                    )}
                    {isFirstVenue && (
                      <td rowSpan={venue.rowSpan || 1} className="p-2 font-semibold border-r">
                        {venue.venue_name}
                      </td>
                    )}
                    {isFirstTg && (
                      <td rowSpan={tg.rowSpan || 1} className="p-2 border-r">
                        {tg.ticket_group}
                      </td>
                    )}
                    <td className="p-2 border-r text-gray-700">{product.product_name}</td>
                    <td className="p-2 border-r text-center">{product.source_channel}</td>
                    
                    {/* 리프 노드 수치 (₩ 기호 제외) */}
                    <td className="p-2 text-right text-blue-600 font-medium">
                      {formatRevenue(product.metrics?.todayActual || 0)}
                    </td>
                    <td className="p-2 text-right text-gray-500">
                      {formatRevenue(product.metrics?.todayQuantity || 0)}
                    </td>
                  </tr>
                );
              });
            });
          });
        });
      });
    });

    return rows;
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-sm rounded-lg">
      <div className="overflow-auto flex-grow">
        <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
          <thead className="bg-gray-800 text-white sticky top-0 z-10">
            <tr>
              <th className="p-3 border-r">대분류</th>
              <th className="p-3 border-r">본부</th>
              <th className="p-3 border-r">파트</th>
              <th className="p-3 border-r">영업장(38개)</th>
              <th className="p-3 border-r">티켓그룹</th>
              <th className="p-3 border-r">상품/트랜잭션명</th>
              <th className="p-3 border-r">채널</th>
              <th className="p-3 border-r text-right">매출액(당일)</th>
              <th className="p-3 text-right">수량</th>
            </tr>
          </thead>
          <tbody>
            {renderRows()}
          </tbody>
        </table>
      </div>

      {/* 4. 검증 마스터 (Validation Master) 하단 고정 패널 */}
      {validationMaster && (
        <div className={`p-4 border-t-2 font-bold flex justify-between items-center ${
          validationMaster.isZeroVariance ? 'bg-green-50 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className="flex items-center gap-4">
            <span className="text-lg">
              {validationMaster.isZeroVariance ? '✅ Zero-Variance 검증 완료' : '🚨 [장부 불일치] 무결성 에러'}
            </span>
            <span className="text-sm font-normal">
              원천 장부: {formatRevenue(validationMaster.originalTotal)} / 
              대시보드 총액: {formatRevenue(validationMaster.payloadTotal)}
            </span>
          </div>
          <div className="text-xl tracking-tight">
            오차(Variance): {formatRevenue(validationMaster.variance)}
          </div>
        </div>
      )}
    </div>
  );
}
