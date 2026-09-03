'use client';

import React from 'react';
import V6DashboardViewer from '@/components/V6DashboardViewer';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">통합 경영 대시보드</h1>
        </div>
        <V6DashboardViewer />
      </div>
    </div>
  );
}
