'use client';

import { useState, useEffect, useMemo } from 'react';
import { Filter, Loader2, PieChart as PieChartIcon, LineChart as LineChartIcon, List, Activity } from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function AnalysisPage() {
  const [team, setTeam] = useState('all');
  const [activeTab, setActiveTab] = useState<'breakdown' | 'correlation' | 'list'>('breakdown');
  const [listType, setListType] = useState<'expense' | 'revenue'>('expense');
  const [breakdownBy, setBreakdownBy] = useState<'category' | 'team'>('category');
  
  const { startDate, endDate, setStartDate, setEndDate } = useDateFilter();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [revenues, setRevenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const queryParams = `?team=${team}&startDate=${startDate}&endDate=${endDate}`;
        const [expRes, revRes] = await Promise.all([
          fetch(`/api/analysis${queryParams}&type=expense`),
          fetch(`/api/analysis${queryParams}&type=revenue`)
        ]);
        const expData = await expRes.json();
        const revData = await revRes.json();
        setExpenses(Array.isArray(expData) ? expData : []);
        setRevenues(Array.isArray(revData) ? revData : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [team, startDate, endDate]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('ko-KR');

  const breakdownData = useMemo(() => {
    const sums: Record<string, number> = {};
    expenses.forEach(exp => {
      const key = breakdownBy === 'category' ? (exp.mapped_term || '기타') : (exp.team || '기타');
      sums[key] = (sums[key] || 0) + (exp.amount || 0);
    });
    return Object.keys(sums).map(key => ({ name: key, value: sums[key] })).sort((a, b) => b.value - a.value);
  }, [expenses, breakdownBy]);

  const teamExpenseData = useMemo(() => {
    const teamGroups: Record<string, any[]> = {};
    expenses.forEach(exp => {
      const t = exp.team || '기타';
      if (!teamGroups[t]) teamGroups[t] = [];
      teamGroups[t].push(exp);
    });

    return Object.keys(teamGroups).map(t => {
      const exps = teamGroups[t];
      let total = 0;
      const catMap: Record<string, number> = {};
      exps.forEach(e => {
        const cat = e.mapped_term || '기타';
        catMap[cat] = (catMap[cat] || 0) + (e.amount || 0);
        total += (e.amount || 0);
      });

      const sortedCats = Object.keys(catMap).map(k => ({ name: k, value: catMap[k] })).sort((a,b) => b.value - a.value);
      const top3 = sortedCats.slice(0, 3);
      const rest = sortedCats.slice(3).reduce((sum, item) => sum + item.value, 0);
      
      const finalItems = [...top3];
      if (rest > 0) {
        finalItems.push({ name: '기타 비용', value: rest });
      }

      return {
        team: t,
        total,
        items: finalItems
      };
    }).sort((a, b) => b.total - a.total);
  }, [expenses]);

  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#10B981'];

  const correlationData = useMemo(() => {
    const grouped: Record<string, { date: string, revenue: number, totalExpense: number, variableExpense: number }> = {};
    const getKey = (dateStr: string) => {
      const d = new Date(dateStr);
      return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월`;
    };

    revenues.forEach(r => {
      const key = getKey(r.date);
      if (!grouped[key]) grouped[key] = { date: key, revenue: 0, totalExpense: 0, variableExpense: 0 };
      grouped[key].revenue += (r.amount || 0);
    });

    expenses.forEach(e => {
      const key = getKey(e.date);
      if (!grouped[key]) grouped[key] = { date: key, revenue: 0, totalExpense: 0, variableExpense: 0 };
      grouped[key].totalExpense += (e.amount || 0);
      
      const cat = e.mapped_term || '';
      if (cat.includes('인건비') || cat.includes('수수료') || cat.includes('용역') || cat.includes('재료')) {
        grouped[key].variableExpense += (e.amount || 0);
      }
    });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [revenues, expenses, startDate, endDate]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">상세 분석</h1>
          <p className="text-gray-500 mt-2">비용 세부분석 및 기간별 상관관계를 확인하세요.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex items-center text-gray-500 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
            <Filter className="w-4 h-4 mr-2" />
            <select 
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="bg-transparent border-none outline-none text-gray-800 font-semibold cursor-pointer text-sm"
            >
              <option value="all">전체 팀</option>
              <option value="목장">목장</option>
              <option value="미디어아트센터">미디어아트센터</option>
              <option value="엑티비티">엑티비티</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-xl p-1 shadow-sm px-2">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="border-none bg-transparent px-2 py-1.5 text-sm outline-none text-gray-700 font-medium" 
            />
            <span className="text-gray-400 font-medium">~</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="border-none bg-transparent px-2 py-1.5 text-sm outline-none text-gray-700 font-medium" 
            />
          </div>
        </div>
      </div>

      <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1 w-fit">
        <button 
          onClick={() => setActiveTab('breakdown')}
          className={`flex items-center px-6 py-2 rounded-lg font-medium transition-colors ${activeTab === 'breakdown' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'}`}
        >
          <PieChartIcon className="w-4 h-4 mr-2" /> 비용 파이 차트
        </button>
        <button 
          onClick={() => setActiveTab('correlation')}
          className={`flex items-center px-6 py-2 rounded-lg font-medium transition-colors ${activeTab === 'correlation' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'}`}
        >
          <Activity className="w-4 h-4 mr-2" /> 매출-비용 상관관계
        </button>
        <button 
          onClick={() => setActiveTab('list')}
          className={`flex items-center px-6 py-2 rounded-lg font-medium transition-colors ${activeTab === 'list' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'}`}
        >
          <List className="w-4 h-4 mr-2" /> 세부 내역 목록
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : activeTab === 'breakdown' ? (
        <div className="flex flex-col gap-6">
          <div className="flex bg-gray-100 rounded-lg p-1 text-sm w-fit self-end">
            <button onClick={() => setBreakdownBy('category')} className={`px-4 py-1.5 rounded-md font-bold transition-colors ${breakdownBy === 'category' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>전체 카테고리별</button>
            <button onClick={() => setBreakdownBy('team')} className={`px-4 py-1.5 rounded-md font-bold transition-colors ${breakdownBy === 'team' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>팀별 집중 분석</button>
          </div>

          {breakdownBy === 'category' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                <h2 className="text-lg font-bold text-gray-800 mb-4 w-full text-left">어디에 돈을 가장 많이 썼을까요?</h2>
                {breakdownData.length === 0 ? (
                  <div className="h-80 flex items-center text-gray-400">데이터가 없습니다.</div>
                ) : (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={breakdownData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} dataKey="value">
                          {breakdownData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-y-auto max-h-[420px]">
                <h2 className="text-lg font-bold text-gray-800 mb-4">비용 카테고리 순위</h2>
                <div className="space-y-4">
                  {breakdownData.map((item, index) => (
                    <div key={item.name} className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 border border-gray-50">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="font-medium text-gray-700">{item.name}</span>
                      </div>
                      <span className="font-bold text-gray-900">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {teamExpenseData.map((teamData, tIdx) => (
                <div key={teamData.team} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                  <div className="mb-6">
                    <h3 className="text-xl font-extrabold text-gray-900">{teamData.team}</h3>
                    <p className="text-gray-500 text-sm mt-1">총 비용</p>
                    <p className="text-2xl font-bold text-red-500 mt-1">{formatCurrency(teamData.total)}</p>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Top 3 비용 및 기타</h4>
                    {teamData.items.map((item, idx) => {
                      const percentage = teamData.total > 0 ? (item.value / teamData.total) * 100 : 0;
                      return (
                        <div key={item.name} className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-semibold text-gray-700 flex items-center gap-2">
                              {idx < 3 ? <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-xs font-bold">{idx + 1}</span> : null}
                              {item.name}
                            </span>
                            <span className="font-bold text-gray-900">{formatCurrency(item.value)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${item.name === '기타 비용' ? 'bg-gray-400' : 'bg-red-400'}`} style={{ width: `${percentage}%` }}></div>
                            </div>
                            <span className="text-xs text-gray-400 w-8 text-right">{percentage.toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {teamExpenseData.length === 0 && (
                <div className="col-span-3 text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100">데이터가 없습니다.</div>
              )}
            </div>
          )}
        </div>
      ) : activeTab === 'correlation' ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-6">매출 증가에 따른 비용 변화 추이</h2>
          <p className="text-sm text-gray-500 mb-6">파란색 막대(매출)가 오를 때, 주황색/빨간색 선(변동비/총비용)이 어떻게 따라 움직이는지 확인하세요. (변동비: 인건비, 수수료, 재료 등)</p>
          {correlationData.length === 0 ? (
            <div className="h-96 flex justify-center items-center text-gray-400">데이터가 없습니다.</div>
          ) : (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={correlationData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{fill: '#6B7280', fontSize: 13}} dy={10} />
                  <YAxis yAxisId="left" tickFormatter={(value) => `₩${(value/10000).toFixed(0)}만`} tickLine={false} axisLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `₩${(value/10000).toFixed(0)}만`} tickLine={false} axisLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                  <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} cursor={{fill: '#F3F4F6'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                  <Bar yAxisId="left" dataKey="revenue" name="총 매출" barSize={40} fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="totalExpense" name="총 비용" stroke="#EF4444" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                  <Line yAxisId="right" type="monotone" dataKey="variableExpense" name="주요 변동비(인건비/수수료 등)" stroke="#F59E0B" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} strokeDasharray="5 5" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
            <button onClick={() => setListType('expense')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${listType === 'expense' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>비용 보기</button>
            <button onClick={() => setListType('revenue')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${listType === 'revenue' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>매출 보기</button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">날짜</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">팀명</th>
                    {listType === 'expense' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">분류된 카테고리</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">원본 계정명</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">적요/메모</th>
                      </>
                    )}
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">금액</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(listType === 'expense' ? expenses : revenues).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">{formatDate(row.date)}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded bg-gray-100 text-gray-700">
                          {row.team}
                        </span>
                      </td>
                      {listType === 'expense' && (
                        <>
                          <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-800">{row.mapped_term}</td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-400 hidden md:table-cell">{row.original_term}</td>
                          <td className="px-6 py-3 text-sm text-gray-500 hidden lg:table-cell max-w-xs truncate" title={row.description}>{row.description || '-'}</td>
                        </>
                      )}
                      <td className={`px-6 py-3 whitespace-nowrap text-right text-sm font-bold ${listType === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                        {listType === 'revenue' ? '+' : '-'}{formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                  {(listType === 'expense' ? expenses : revenues).length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">데이터가 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
