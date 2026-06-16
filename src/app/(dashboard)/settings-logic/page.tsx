'use client';

import { HEURISTIC_RULES } from '@/lib/rules';
import { Info, Tag, Search, CheckCircle } from 'lucide-react';

export default function SettingsLogicPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">비용 세부분류 안내</h1>
        <p className="text-gray-500 mt-2">
          시스템이 엑셀의 <strong>적요, 업체, 계정과목명</strong> 데이터를 읽어 자동으로 세부분류를 적용하는 규칙입니다.
        </p>
      </div>

      <div className="bg-mint-50 border-l-4 border-mint-500 p-4 rounded-r-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-mint-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-mint-800">자동 분류 원리 (휴리스틱 파싱)</h3>
            <div className="mt-2 text-sm text-mint-700">
              <p>
                비용 엑셀 업로드 시, 시스템은 우선순위가 높은 규칙부터 차례대로 키워드를 검사합니다. 
                텍스트 중에 단 1개라도 일치하는 키워드가 발견되면, 즉시 해당 <strong>대상 계정과목(분류)</strong>으로 매핑합니다.
                만약 어떤 규칙에도 해당하지 않는다면, 엑셀에 적힌 원본 계정과목명 그대로 저장됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <Search className="w-5 h-5 mr-2 text-gray-500" />
            현재 적용 중인 분류 규칙
          </h2>
          <span className="text-sm text-gray-500">총 {HEURISTIC_RULES.length}개 규칙</span>
        </div>
        
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-white">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/6">
                대분류
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/4">
                분류될 계정과목명 (Target)
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/2">
                인식 키워드 (Keywords)
              </th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/12">
                우선순위
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {HEURISTIC_RULES.map((rule) => (
              <tr key={rule.id} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-gray-100 text-gray-800">
                    {rule.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm font-bold text-gray-900">
                    <CheckCircle className="w-4 h-4 mr-1.5 text-green-500" />
                    {rule.targetTerm}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {rule.keywords.map((kw, idx) => (
                      <span 
                        key={idx} 
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-mint-50 border border-mint-100 text-mint-700"
                      >
                        <Tag className="w-3 h-3 mr-1 opacity-50" />
                        {kw}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 font-medium">
                  {rule.priority}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-center mt-8">
        <p className="text-sm text-gray-400">
          * 이 페이지의 키워드를 수정하려면 현재는 코드 레벨(`src/lib/rules.ts`)의 수정이 필요합니다. 추후 화면에서 직접 수정하는 기능을 오픈할 예정입니다.
        </p>
      </div>
    </div>
  );
}
