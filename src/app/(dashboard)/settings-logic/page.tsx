'use client';

import { Info, ShieldCheck } from 'lucide-react';

export default function SettingsLogicPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">비용 세부분류 안내</h1>
        <p className="text-gray-500 mt-2">
          과거 시스템이 엑셀 데이터를 강제로 분류하던 휴리스틱 자동 분류(Heuristic Parsing) 규칙에 대한 안내입니다.
        </p>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg shadow-sm">
        <div className="flex">
          <div className="flex-shrink-0">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-bold text-blue-900">SSOT 정책에 따른 시스템 개편 안내</h3>
            <div className="mt-2 text-sm text-blue-800 space-y-4">
              <p>
                <strong>과거의 프론트엔드 자동 분류 엔진(Heuristic Rules)이 전면 철거되었습니다.</strong>
              </p>
              <p>
                이전 버전에서는 사용자가 엑셀 비용 데이터를 업로드할 때, 프론트엔드 내부 코드에 하드코딩된 100여 개의 규칙에 의해
                계정과목 이름이 사용자 몰래 임의로 강제 변조(Hijacking)되는 심각한 사각지대가 존재했습니다. 
              </p>
              <p>
                이제 시스템은 <strong>단일 진실 공급원(Single Source of Truth, SSOT) 원칙</strong>을 100% 준수합니다.
                사용자가 업로드한 원본 데이터(엑셀의 계정과목)는 단 1글자도 프론트엔드에 의해 조작되지 않고 원본 그대로 파이어베이스 DB에 저장됩니다.
              </p>
              <div className="bg-blue-100 p-4 rounded-md border border-blue-200">
                <p className="font-semibold mb-2">데이터 분류는 이제 어떻게 되나요?</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>새로운 비용 내역이 발생하면, 칸반 보드의 <strong>'미분류'</strong> 영역에 즉시 원본 이름 그대로 표시됩니다.</li>
                  <li>관리자는 <strong>[설정 &rarr; 공통비 분배 규칙 설정]</strong> 메뉴에서 직접 미분류 항목을 원하는 팀(칸반 기둥)으로 드래그 앤 드롭하여 매핑합니다.</li>
                  <li>이러한 드래그 앤 드롭을 통한 사용자 지정 매핑 규칙만이 이 시스템의 유일한 진실(SSOT)로 작동합니다.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
