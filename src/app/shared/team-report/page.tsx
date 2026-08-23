'use client';

import React, { useState } from 'react';
import TeamReport from '@/components/TeamReport';
import OrganizationView from '@/components/OrganizationView';
import { Users, BarChart3, TreePine } from 'lucide-react';

export default function SharedTeamReportPage() {
  const [activeTab, setActiveTab] = useState<'report' | 'org'>('report');

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Shared Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2 font-black text-gray-900 tracking-tight">
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <TreePine className="w-4 h-4" />
            </span>
            <span>벨포레 레저본부 리포트</span>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-2xl border border-gray-200/60">
            <button
              onClick={() => setActiveTab('report')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'report'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
              5대 팀별 실적 현황
            </button>
            <button
              onClick={() => setActiveTab('org')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'org'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              레저본부 조직도 & 인력 현황
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'report' ? (
          <TeamReport isShared={true} />
        ) : (
          <OrganizationView isShared={true} />
        )}
      </div>
    </div>
  );
}
