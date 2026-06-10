import Link from 'next/link';
import { Home, Upload, Settings, BarChart2 } from 'lucide-react';

export default function Sidebar() {
  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-screen">
      <div className="p-6 text-2xl font-bold border-b border-gray-800 tracking-wider">
        <span className="text-blue-400">Leisure</span>Fin
      </div>
      <nav className="flex-1 p-4 space-y-6">
        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">📊 리포트 및 분석</h3>
          <div className="space-y-1">
            <Link href="/" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <Home size={20} className="text-blue-400" />
              <span>대시보드</span>
            </Link>
            <Link href="/analysis" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <BarChart2 size={20} className="text-blue-400" />
              <span>상세 분석</span>
            </Link>
          </div>
        </div>

        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">📤 데이터 관리</h3>
          <div className="space-y-1">
            <Link href="/upload" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <Upload size={20} className="text-green-400" />
              <span>데이터 업로드</span>
            </Link>
          </div>
        </div>

        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">⚙️ 시스템 설정</h3>
          <div className="space-y-1">
            <Link href="/settings" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <Settings size={20} className="text-gray-400" />
              <span>팀 매핑 설정</span>
            </Link>
            <Link href="/settings-expense" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <Settings size={20} className="text-gray-400" />
              <span>비용 필터 설정</span>
            </Link>
            <Link href="/settings-logic" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <Settings size={20} className="text-gray-400" />
              <span>분류 규칙 확인</span>
            </Link>
          </div>
        </div>
      </nav>
      <div className="p-4 border-t border-gray-800 text-sm text-gray-500">
        © 2026 Leisure Division
      </div>
    </div>
  );
}
