'use client';

import { useState, useEffect } from 'react';
import { PieChart, Loader2, ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Link from 'next/link';

export default function PresentationPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen bg-gray-900"><Loader2 className="w-16 h-16 animate-spin text-blue-500" /></div>;
  }

  if (!data || data.totalRevenue === 0 && data.totalExpense === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-gray-400">
        <PieChart className="w-24 h-24 mb-6 opacity-50" />
        <h2 className="text-4xl font-bold mb-4 text-white">데이터가 없습니다</h2>
        <p className="text-xl">먼저 PMS 매출 및 재경 비용 데이터를 업로드해 주세요.</p>
        <Link href="/" className="mt-8 text-blue-400 hover:text-blue-300 flex items-center">
          <ArrowLeft className="w-5 h-5 mr-2" /> 대시보드로 돌아가기
        </Link>
      </div>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex flex-col">
      <div className="p-8 flex justify-between items-center">
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
            레저본부 실적 현황
          </h1>
          <p className="text-2xl text-gray-400 mt-2 font-light tracking-wide">월간 재무 리뷰</p>
        </div>
        <Link href="/" className="opacity-50 hover:opacity-100 transition-opacity">
          <ArrowLeft className="w-8 h-8" />
        </Link>
      </div>

      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="flex flex-col justify-center space-y-8">
          <div className="bg-white/10 backdrop-blur-md shadow-xl p-10 rounded-3xl border border-white/10">
            <p className="text-xl text-blue-300 font-medium tracking-wider uppercase mb-2">총 매출</p>
            <h3 className="text-6xl font-black">{formatCurrency(data.totalRevenue)}</h3>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md shadow-xl p-10 rounded-3xl border border-white/10">
            <p className="text-xl text-red-300 font-medium tracking-wider uppercase mb-2">총 비용</p>
            <h3 className="text-6xl font-black">{formatCurrency(data.totalExpense)}</h3>
          </div>

          <div className={`bg-white/10 backdrop-blur-md shadow-xl p-10 rounded-3xl border ${data.netProfit >= 0 ? 'border-green-500/30 bg-green-900/20' : 'border-orange-500/30 bg-orange-900/20'}`}>
            <p className={`text-xl font-medium tracking-wider uppercase mb-2 ${data.netProfit >= 0 ? 'text-green-400' : 'text-orange-400'}`}>순이익</p>
            <h3 className={`text-6xl font-black ${data.netProfit >= 0 ? 'text-green-400' : 'text-orange-400'}`}>
              {formatCurrency(data.netProfit)}
            </h3>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white/10 backdrop-blur-md shadow-xl p-8 rounded-3xl border border-white/10 flex flex-col">
          <h2 className="text-3xl font-bold mb-8 text-gray-200 tracking-wide">팀별 매출 및 비용 비교</h2>
          <div className="flex-1 min-h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.teamData}
                margin={{ top: 40, right: 30, left: 60, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis dataKey="team" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 18, fontWeight: 600}} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 16}} tickFormatter={(value) => `₩${(value / 1000000).toFixed(0)}M`} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  cursor={{fill: '#1F2937'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: 'rgba(17, 24, 39, 0.9)', color: '#fff', fontSize: '18px', padding: '16px' }}
                />
                <Bar dataKey="revenue" name="매출" fill="#3B82F6" radius={[8, 8, 0, 0]} maxBarSize={100} />
                <Bar dataKey="expense" name="비용" fill="#EF4444" radius={[8, 8, 0, 0]} maxBarSize={100} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
