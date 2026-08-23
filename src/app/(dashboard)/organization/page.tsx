'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Activity, Coffee, Monitor, Key, TreePine, FileCode2, 
  ExternalLink, Copy, Check, Server, ShieldCheck, Database, Layers,
  Sparkles, CheckCircle2, ArrowRight
} from 'lucide-react';

const teams = [
  {
    name: '레저본부',
    role: '총괄',
    icon: <TreePine size={44} className="text-emerald-400" />,
    color: 'bg-gradient-to-br from-emerald-600 to-teal-800',
    colSpan: 'col-span-full',
    children: [
      {
        name: '액티비티',
        icon: <Activity size={28} className="text-blue-600" />,
        color: 'bg-blue-50/70 border-blue-200 text-blue-900',
        badge: '5개 영업장',
        facilities: ['마운틴카트', '사계절썰매장', '마리나 클럽', '원더풀', '썸머랜드']
      },
      {
        name: '목장',
        icon: <TreePine size={28} className="text-emerald-600" />,
        color: 'bg-emerald-50/70 border-emerald-200 text-emerald-900',
        badge: '3개 영업장',
        facilities: ['벨포레 목장', '목장(체험)', '얼룩말카페']
      },
      {
        name: '미디어아트센터',
        icon: <Monitor size={28} className="text-purple-600" />,
        color: 'bg-purple-50/70 border-purple-200 text-purple-900',
        badge: '3개 영업장',
        facilities: ['미디어아트센터', '미디어-뮤지엄카페', '미디어-기프트샵']
      },
      {
        name: '디지털지원팀',
        icon: <Server size={28} className="text-indigo-600" />,
        color: 'bg-indigo-50/70 border-indigo-200 text-indigo-900',
        badge: '지원 부서',
        facilities: ['키오스크 & POS', '홈페이지 및 앱 기술 사항', '레저본부 마케팅', '네트워크 & BGM 유지보수']
      },
      {
        name: '본부팀',
        icon: <Key size={28} className="text-amber-600" />,
        color: 'bg-amber-50/70 border-amber-200 text-amber-900',
        badge: '총괄 관리',
        facilities: ['레저본부 신규 영업', '레저본부 마케팅', '관리 및 운영 업무']
      }
    ]
  }
];

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants: any = {
  hidden: { y: 16, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { stiffness: 100 }
  }
};

const apiResponseJson = `{
  "status": "success",
  "division": "레저본부",
  "summary": {
    "totalVenues": 11,
    "totalRegularHeadcount": 27,
    "totalWeekdayHeadcount": 35,
    "totalWeekendHeadcount": 50
  },
  "parts": [
    {
      "partName": "액티비티",
      "totalRegular": 12,
      "totalWeekday": 25,
      "totalWeekend": 29,
      "venues": [
        {
          "id": 1,
          "venueName": "마운틴카트",
          "leaderName": "배유진 선임",
          "regularHeadcount": 2,
          "weekdayHeadcount": 3,
          "weekendHeadcount": 4,
          "memo": "안수빈,김대희"
        },
        {
          "id": 2,
          "venueName": "사계절썰매장",
          "leaderName": "이성민 매니저",
          "regularHeadcount": 3,
          "weekdayHeadcount": 3,
          "weekendHeadcount": 4,
          "memo": "홍세준,연명순"
        },
        {
          "id": 3,
          "venueName": "마리나 클럽",
          "leaderName": "김정식 선임",
          "regularHeadcount": 2,
          "weekdayHeadcount": 2,
          "weekendHeadcount": 3,
          "memo": "정송현"
        },
        {
          "id": 4,
          "venueName": "썸머랜드",
          "leaderName": "김형도 팀장",
          "regularHeadcount": 3,
          "weekdayHeadcount": 15,
          "weekendHeadcount": 15,
          "memo": "연봉석,허영준"
        },
        {
          "id": 5,
          "venueName": "원더풀",
          "leaderName": "김원곤 선임",
          "regularHeadcount": 2,
          "weekdayHeadcount": 2,
          "weekendHeadcount": 3,
          "memo": "김원곤,김주현"
        }
      ]
    },
    {
      "partName": "목장",
      "totalRegular": 10,
      "totalWeekday": 6,
      "totalWeekend": 16,
      "venues": [
        {
          "id": 6,
          "venueName": "벨포레 목장",
          "leaderName": "이재훈 팀장",
          "regularHeadcount": 9,
          "weekdayHeadcount": 5,
          "weekendHeadcount": 14,
          "memo": "이민혜,장준호,고성민,강남준,김가람,신정민"
        },
        {
          "id": 7,
          "venueName": "벨포레 목장(체험)",
          "leaderName": "",
          "regularHeadcount": 0,
          "weekdayHeadcount": 0,
          "weekendHeadcount": 0,
          "memo": "공연 8명, 매표 2명, 리틀팜 2명, 승마 2명"
        },
        {
          "id": 8,
          "venueName": "얼룩말카페",
          "leaderName": "조혜원 매니저",
          "regularHeadcount": 1,
          "weekdayHeadcount": 1,
          "weekendHeadcount": 2,
          "memo": "조혜원"
        }
      ]
    },
    {
      "partName": "미디어아트센터",
      "totalRegular": 5,
      "totalWeekday": 4,
      "totalWeekend": 5,
      "venues": [
        {
          "id": 9,
          "venueName": "미디어아트센터",
          "leaderName": "신지선 팀장",
          "regularHeadcount": 5,
          "weekdayHeadcount": 4,
          "weekendHeadcount": 5,
          "memo": "윤정한,조예림,최지영"
        },
        {
          "id": 10,
          "venueName": "미디어-뮤지엄카페",
          "leaderName": "",
          "regularHeadcount": 0,
          "weekdayHeadcount": 0,
          "weekendHeadcount": 0,
          "memo": ""
        },
        {
          "id": 11,
          "venueName": "미디어-기프트샵",
          "leaderName": "",
          "regularHeadcount": 0,
          "weekdayHeadcount": 0,
          "weekendHeadcount": 0,
          "memo": ""
        }
      ]
    }
  ]
}`;

const adminPayloadJson = `{
  "items": [
    {
      "id": 1,
      "venueName": "마운틴카트",
      "leaderName": "배유진 선임",
      "regularHeadcount": 2,
      "weekdayHeadcount": 3,
      "weekendHeadcount": 4,
      "memo": "안수빈,김대희"
    }
  ]
}`;

const sqlSchemaCode = `CREATE TABLE IF NOT EXISTS dim_facility_headcount (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_code VARCHAR(30) NOT NULL DEFAULT 'TICKET', -- 부서 코드
  team_name VARCHAR(50) NOT NULL DEFAULT '레저본부', -- 본부명 (레저본부)
  part_name VARCHAR(50) NOT NULL, -- 파트명 (액티비티, 목장, 미디어아트센터)
  venue_name VARCHAR(100) NOT NULL UNIQUE, -- 영업장명 (마운틴카트 등)
  leader_name VARCHAR(50) DEFAULT '', -- 선임/책임자 성함
  regular_headcount INT DEFAULT 0, -- 정규직 인원
  weekday_headcount INT DEFAULT 0, -- 주중 투입 인원
  weekend_headcount INT DEFAULT 0, -- 주말 투입 인원
  daily_worker_weekday INT DEFAULT 0, -- 주중 일용직 (선택)
  daily_worker_weekend INT DEFAULT 0, -- 주말 일용직 (선택)
  is_outsourced TINYINT(1) DEFAULT 0, -- 외주 여부 (0: 직영, 1: 외주)
  memo TEXT, -- 근무자/자격증/특이사항 메모
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_team (team_name),
  INDEX idx_part (part_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

export default function OrganizationPage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-12">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
              <TreePine className="w-6 h-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              레저본부 조직도 & 인력 체계
            </h1>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-extrabold rounded-full border border-emerald-200/60">
              3대 직영 파트 · 11개 영업장
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            벨포레 레저본부 산하 직영 부서 및 공식 11개 영업장의 조직 체계와 실시간 인력 현황 연동 가이드를 제공합니다.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <a 
            href="https://belleforet-data-git-main-tjkim448532s-projects.vercel.app/admin/mapping" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
          >
            <Users className="w-3.5 h-3.5" />
            관리자 인력 통제 센터
            <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
          </a>
        </div>
      </div>

      {/* 2. Visual Organization Chart Tree */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-10"
      >
        {teams.map((hq, idx) => (
          <div key={idx} className="flex flex-col items-center">
            {/* HQ Head Node */}
            <motion.div 
              variants={itemVariants}
              className={`w-full max-w-sm rounded-3xl shadow-lg overflow-hidden ${hq.color} p-6 sm:p-8 text-white flex flex-col items-center justify-center transform transition-transform hover:scale-[1.02] cursor-pointer z-10 border border-emerald-400/30`}
            >
              <div className="bg-white/20 p-3.5 rounded-2xl backdrop-blur-md mb-3 shadow-inner">
                {hq.icon}
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-widest">{hq.name}</h2>
              <p className="text-emerald-100 text-sm mt-1.5 font-semibold tracking-wide">총괄 본부 (HQ)</p>
            </motion.div>

            {/* Tree Branch Lines */}
            <div className="w-px h-10 bg-gray-300"></div>
            <div className="w-[85%] h-px bg-gray-300"></div>
            <div className="w-[85%] flex justify-between">
              {hq.children.map((_, i) => (
                <div key={i} className="w-px h-6 bg-gray-300"></div>
              ))}
            </div>

            {/* 5 Child Teams (미사용티켓 삭제 완료) */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 mt-3">
              {hq.children.map((team, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className={`relative rounded-2xl border p-5 flex flex-col items-center text-center shadow-xs hover:shadow-md transition-all bg-white ${team.color}`}
                >
                  <div className="p-3 rounded-2xl mb-3 bg-white border border-gray-200/80 shadow-2xs">
                    {team.icon}
                  </div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <h3 className="text-lg font-black text-gray-900">{team.name}</h3>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 bg-white/80 rounded-full border border-black/5 mb-3 text-gray-700">
                    {team.badge}
                  </span>
                  <div className="w-full space-y-2 flex-1">
                    {team.facilities.map((fac, fIdx) => (
                      <div 
                        key={fIdx} 
                        className="bg-white/90 backdrop-blur-sm rounded-xl py-2 px-3 text-xs font-bold text-gray-800 border border-black/5 shadow-2xs flex items-center justify-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                        <span className="truncate">{fac}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </motion.div>

      {/* 3. Technical Integration Specification Section */}
      <section className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden mt-12">
        {/* Spec Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-gray-900 to-slate-800 text-white p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                <FileCode2 className="w-4 h-4" />
                <span>Backend & System Integration Specification</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                [백엔드/시스템 연동 기술 명세서] 레저본부 조직도 & 영업장 인력 현황 API 연동 가이드
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-300">
                <span className="bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700 font-mono">
                  문서 번호: SPEC-20260823-LEISURE-ORG-BACKEND-V1
                </span>
                <span className="bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700 font-mono">
                  문서명: backend_leisure_organization_integration_spec.md
                </span>
                <span className="bg-emerald-900/60 text-emerald-300 border border-emerald-600/50 px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 상태: 🟢 운영 배포 완료 (Live Online)
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
            <div>
              <span className="text-gray-400 font-medium">운영 배포 베이스 도메인:</span>
              <div className="font-mono text-emerald-400 mt-0.5 break-all">
                https://belleforet-data-git-main-tjkim448532s-projects.vercel.app
              </div>
            </div>
            <div>
              <span className="text-gray-400 font-medium">관리자 웹 통제 센터:</span>
              <div className="mt-0.5">
                <a 
                  href="https://belleforet-data-git-main-tjkim448532s-projects.vercel.app/admin/mapping" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-mono text-blue-400 hover:underline inline-flex items-center gap-1 break-all"
                >
                  https://belleforet-data-git-main-tjkim448532s-projects.vercel.app/admin/mapping
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-10 text-gray-800 text-sm">
          {/* Section 1: Overview */}
          <div>
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-bold">1</span>
              개요 및 연동 목적
            </h3>
            <p className="text-gray-600 leading-relaxed pl-9">
              본 기술 명세서는 <strong className="text-gray-900 font-bold">통합 데이터 통제 센터(Admin Web App)</strong>에서 관리되는 벨포레 레저본부 3대 직영 파트 및 11개 공식 영업장별 인력 현황(선임자, 정규직, 주중 인원, 주말 인원, 근무자 메모) 데이터를 전사 타 대시보드, 모바일 앱, ERP/그룹웨어 및 외부 연동 시스템에서 안전하고 일관되게 조회·활용할 수 있도록 표준 REST API 및 데이터 모델을 정의합니다.
            </p>
          </div>

          {/* Section 2: SSOT Scope */}
          <div>
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-bold">2</span>
              레저본부 공식 조직 및 영업장 기준 (SSOT)
            </h3>
            <div className="pl-9 space-y-2">
              <p className="text-gray-700">
                • <strong className="text-emerald-700 font-bold">관리 범위:</strong> 레저본부 산하 3대 직영 파트 / 11개 공식 직영 영업장
              </p>
              <p className="text-gray-700">
                • <strong className="text-rose-600 font-bold">제외 항목:</strong> 외주 운영 시설(놀이동산) 및 식음 전용 시설(썸머트럭)은 직영 인력 통제 대상에서 제외.
              </p>
            </div>
          </div>

          {/* Section 3: REST API Specifications */}
          <div>
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-4">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-bold">3</span>
              핵심 REST API 명세서
            </h3>
            
            <div className="pl-9 space-y-8">
              {/* API 1 */}
              <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/50 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 bg-blue-600 text-white font-extrabold text-xs rounded-lg">
                      GET
                    </span>
                    <span className="font-extrabold text-gray-900 text-base">
                      [API 1] 대시보드 실시간 조회용 엔드포인트 (Consumer API)
                    </span>
                  </div>
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                    응답 속도 &lt; 100ms
                  </span>
                </div>

                <div className="space-y-1 text-xs font-mono">
                  <div className="text-gray-500">Request URL:</div>
                  <div className="bg-white p-2.5 rounded-xl border border-gray-200 text-blue-700 break-all select-all font-bold">
                    https://belleforet-data-git-main-tjkim448532s-projects.vercel.app/api/v6/report/leisure-organization
                  </div>
                </div>

                <div className="text-xs text-gray-600">
                  <strong>Header:</strong> <code className="bg-white px-2 py-0.5 rounded border border-gray-200">Content-Type: application/json (CORS * 지원)</code>
                </div>

                {/* cURL */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
                    <span>Request Example (cURL)</span>
                    <button
                      onClick={() => handleCopy('curl -X GET "https://belleforet-data-git-main-tjkim448532s-projects.vercel.app/api/v6/report/leisure-organization" -H "Accept: application/json"', 'curl1')}
                      className="text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'curl1' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'curl1' ? '복사완료' : '복사'}
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl text-xs overflow-x-auto font-mono">
{`curl -X GET "https://belleforet-data-git-main-tjkim448532s-projects.vercel.app/api/v6/report/leisure-organization" \\
  -H "Accept: application/json"`}
                  </pre>
                </div>

                {/* Response Example */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
                    <span>Response Example (Live 200 OK)</span>
                    <button
                      onClick={() => handleCopy(apiResponseJson, 'resp1')}
                      className="text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'resp1' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'resp1' ? '복사완료' : 'JSON 복사'}
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-emerald-300 p-4 rounded-xl text-xs overflow-x-auto font-mono max-h-96">
{apiResponseJson}
                  </pre>
                </div>
              </div>

              {/* API 2 */}
              <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/50 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 bg-amber-600 text-white font-extrabold text-xs rounded-lg">
                      POST
                    </span>
                    <span className="font-extrabold text-gray-900 text-base">
                      [API 2] 관리자 인력 설정 수정/저장 엔드포인트 (Admin CRUD API)
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-xs font-mono">
                  <div className="text-gray-500">Request URL:</div>
                  <div className="bg-white p-2.5 rounded-xl border border-gray-200 text-amber-700 break-all select-all font-bold">
                    https://belleforet-data-git-main-tjkim448532s-projects.vercel.app/api/v6/admin/organization/leisure
                  </div>
                </div>

                {/* Request Payload Example */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
                    <span>Request Payload Example</span>
                    <button
                      onClick={() => handleCopy(adminPayloadJson, 'pay2')}
                      className="text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'pay2' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'pay2' ? '복사완료' : 'JSON 복사'}
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-amber-300 p-4 rounded-xl text-xs overflow-x-auto font-mono">
{adminPayloadJson}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Data Model / DB Schema */}
          <div>
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-bold">4</span>
              백엔드 데이터 모델 (DB Schema SSOT)
            </h3>
            
            <div className="pl-9 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                <span className="flex items-center gap-1.5 font-mono text-gray-900">
                  <Database className="w-4 h-4 text-emerald-600" /> dim_facility_headcount DDL
                </span>
                <button
                  onClick={() => handleCopy(sqlSchemaCode, 'sql')}
                  className="text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'sql' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'sql' ? '복사완료' : 'SQL 복사'}
                </button>
              </div>
              <pre className="bg-slate-900 text-sky-300 p-4 rounded-xl text-xs overflow-x-auto font-mono">
{sqlSchemaCode}
              </pre>
            </div>
          </div>

          {/* Section 5: Architecture Principles */}
          <div>
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-bold">5</span>
              시스템 연동 핵심 원칙 (Bible v4.2 준수 가이드)
            </h3>
            
            <div className="pl-9 space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1.5">
                <div className="font-black text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  단일 진실 공급원 (SSOT)
                </div>
                <p className="text-xs text-emerald-900/90 leading-relaxed">
                  모든 대시보드와 외부 시스템은 위 API를 통해서만 인력 데이터를 수신해야 하며, 로컬 하드코딩이나 임의 정규표현식 추론을 엄격히 금지합니다.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1.5">
                <div className="font-black text-blue-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  사전 집계 (Pre-aggregated) 총합 사용 (No Slice Summation)
                </div>
                <p className="text-xs text-blue-900/90 leading-relaxed">
                  전사 총합(<code className="bg-white/80 px-1 py-0.5 rounded font-mono">summary</code>) 및 파트별 소계(<code className="bg-white/80 px-1 py-0.5 rounded font-mono">part.totalRegular, part.totalWeekday, part.totalWeekend</code>)는 백엔드가 사전에 계산하여 내려주므로, 클라이언트에서 직접 가산(Slice Summation)하지 않고 제공된 값을 그대로 바인딩하십시오.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-1.5">
                <div className="font-black text-purple-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  관리자 웹 실시간 동기화
                </div>
                <p className="text-xs text-purple-900/90 leading-relaxed">
                  운영팀이 관리자 화면(<a href="https://belleforet-data-git-main-tjkim448532s-projects.vercel.app/admin/mapping" target="_blank" rel="noopener noreferrer" className="underline font-mono font-bold text-purple-700">admin/mapping</a>)에서 인원을 수정하고 저장하면, 연동된 모든 대시보드에 실시간으로 즉시 반영됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
