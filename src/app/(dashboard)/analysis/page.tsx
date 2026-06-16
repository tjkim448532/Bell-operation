'use client';

import { useState, useEffect, useMemo } from 'react';
import { Filter, Loader2, PieChart as PieChartIcon, LineChart as LineChartIcon, List, Activity } from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function AnalysisPage() {
  const [team, setTeam] = useState('all');
  const [activeTab, setActiveTab] = useState<'strategy' | 'team' | 'correlation' | 'list'>('strategy');
  const [listType, setListType] = useState<'expense' | 'revenue'>('expense');
  
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

  const strategyData = useMemo(() => {
    const stats: Record<string, { revenue: number, expense: number, fixedCost: number, variableCost: number }> = {};
    ['미디어아트센터', '엑티비티', '목장', '디지털지원'].forEach(t => {
      stats[t] = { revenue: 0, expense: 0, fixedCost: 0, variableCost: 0 };
    });

    revenues.forEach(r => {
      const t = r.team || '기타';
      if (stats[t]) stats[t].revenue += (r.amount || 0);
    });

    expenses.forEach(e => {
      const t = e.team || '기타';
      if (stats[t]) {
        stats[t].expense += (e.amount || 0);
        const cat = e.mapped_term || '';
        if (cat.startsWith('인건비') || cat.includes('임차료') || cat.includes('보험료') || cat.includes('감가상각비')) {
          stats[t].fixedCost += (e.amount || 0);
        } else {
          stats[t].variableCost += (e.amount || 0);
        }
      }
    });

    return Object.keys(stats).map(t => {
      const s = stats[t];
      const profit = s.revenue - s.expense;
      const margin = s.revenue > 0 ? (profit / s.revenue) * 100 : 0;
      return {
        name: t,
        revenue: s.revenue,
        expense: s.expense,
        profit,
        margin: Number(margin.toFixed(1)),
        fixedCost: s.fixedCost,
        variableCost: s.variableCost,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [revenues, expenses]);

  const teamExpenseData = useMemo(() => {
    const teamGroups: Record<string, any[]> = {};
    expenses.forEach(exp => {
      const t = exp.team || '기타';
      if (!teamGroups[t]) teamGroups[t] = [];
      teamGroups[t].push(exp);
    });

    return Object.keys(teamGroups)
      .filter(t => t !== '기타' && t !== '제외')
      .map(t => {
      const exps = teamGroups[t];
      let total = 0;
      const catMap: Record<string, number> = {};
      exps.forEach(e => {
        let cat = e.mapped_term || '기타';
        if (cat.startsWith('인건비')) {
          cat = '인건비(종합)'; // '인건비(종합)' or just '인건비'
        }
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
        items: finalItems,
        rawExpenses: exps
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
              type="month" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="border-none bg-transparent px-2 py-1.5 text-sm outline-none text-gray-700 font-medium" 
            />
            <span className="text-gray-400 font-medium">~</span>
            <input 
              type="month" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="border-none bg-transparent px-2 py-1.5 text-sm outline-none text-gray-700 font-medium" 
            />
          </div>
        </div>
      </div>

      <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1 w-fit">
        <button 
          onClick={() => setActiveTab('strategy')}
          className={`flex items-center px-6 py-2 rounded-lg font-medium transition-colors ${activeTab === 'strategy' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'}`}
        >
          <PieChartIcon className="w-4 h-4 mr-2" /> 전략적 수익성 분석
        </button>
        <button 
          onClick={() => setActiveTab('team')}
          className={`flex items-center px-6 py-2 rounded-lg font-medium transition-colors ${activeTab === 'team' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'}`}
        >
          <Activity className="w-4 h-4 mr-2" /> 팀별 집중 분석
        </button>
        <button 
          onClick={() => setActiveTab('correlation')}
          className={`flex items-center px-6 py-2 rounded-lg font-medium transition-colors ${activeTab === 'correlation' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'}`}
        >
          <LineChartIcon className="w-4 h-4 mr-2" /> 매출-비용 상관관계
        </button>
        <button 
          onClick={() => setActiveTab('list')}
          className={`flex items-center px-6 py-2 rounded-lg font-medium transition-colors ${activeTab === 'list' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'}`}
        >
          <List className="w-4 h-4 mr-2" /> 세부 내역 목록
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-mint-500" /></div>
      ) : activeTab === 'strategy' ? (
        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-2">
            <h2 className="text-xl font-bold text-gray-900 mb-2">맥킨지식 4대 부서 포트폴리오 매트릭스</h2>
            <p className="text-gray-500 text-sm mb-6">각 부서가 창출하는 매출(막대)과 영업이익률(선)을 비교하여 그룹의 Cash Cow와 Star를 식별합니다.</p>
            {strategyData.length === 0 ? (
              <div className="h-80 flex justify-center items-center text-gray-400">데이터가 없습니다.</div>
            ) : (
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={strategyData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid stroke="#f5f5f5" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{fill: '#6B7280', fontSize: 13, fontWeight: 'bold'}} dy={10} />
                    <YAxis yAxisId="left" tickFormatter={(value) => `₩${(value/100000000).toFixed(0)}억`} tickLine={false} axisLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                    <RechartsTooltip formatter={(value: any, name: any) => name === '영업이익률' ? `${value}%` : formatCurrency(Number(value))} cursor={{fill: '#F3F4F6'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                    <Bar yAxisId="left" dataKey="revenue" name="매출 규모" barSize={50} fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="margin" name="영업이익률" stroke="#EF4444" strokeWidth={3} dot={{r: 6, strokeWidth: 2}} activeDot={{r: 8}} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-2">비용 구조(경직성) 분석</h3>
              <p className="text-sm text-gray-500 mb-6">파란색은 쉽게 줄일 수 없는 고정비(인건비, 임차료 등), 주황색은 변동비입니다.</p>
              {strategyData.length === 0 ? (
                <div className="h-64 flex justify-center items-center text-gray-400">데이터가 없습니다.</div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart layout="vertical" data={strategyData} margin={{ top: 0, right: 0, bottom: 0, left: 40 }}>
                      <CartesianGrid stroke="#f5f5f5" horizontal={true} vertical={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{fill: '#4B5563', fontSize: 12, fontWeight: 'bold'}} />
                      <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" />
                      <Bar dataKey="fixedCost" name="고정비" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} barSize={20} />
                      <Bar dataKey="variableCost" name="변동비" stackId="a" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <h3 className="text-lg font-bold text-gray-800 mb-4">경영 인사이트 요약</h3>
              <div className="space-y-4">
                {strategyData.slice(0, 3).map((s, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-gray-800">{s.name}</span>
                      <span className={`text-sm font-bold ${s.margin > 20 ? 'text-green-600' : s.margin > 0 ? 'text-mint-600' : 'text-red-500'}`}>
                        마진 {s.margin}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {s.margin > 20 
                        ? '고수익 창출 부서입니다. Cash Cow 역할을 수행하고 있으며 확장이 유리합니다.' 
                        : s.margin > 0 
                          ? '안정적인 수익 구조입니다. 변동비를 절감하여 이익률 개선 여지가 있습니다.' 
                          : '적자 상태입니다. 고정비 축소나 매출 증대 등 근본적인 체질 개선이 시급합니다.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'team' ? (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                      let percentage = teamData.total > 0 ? (item.value / teamData.total) * 100 : 0;
                      percentage = Math.max(0, Math.min(100, percentage));
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
            
            {/* Detailed Expense Tables */}
            {teamExpenseData.length > 0 && (
              <div className="mt-8 space-y-8">
                {teamExpenseData.map((teamData) => {
                  // Filter top categories that are not labor and not '기타 비용'
                  const topNonLaborCats = teamData.items
                    .filter(item => item.name !== '기타 비용' && !item.name.startsWith('인건비'))
                    .map(item => item.name);

                  if (topNonLaborCats.length === 0) return null;

                  // Find original expense records matching those categories
                  const detailedExpenses = teamData.rawExpenses
                    .filter((e: any) => {
                      const cat = e.mapped_term || '기타';
                      return topNonLaborCats.includes(cat);
                    })
                    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  if (detailedExpenses.length === 0) return null;

                  return (
                    <div key={`${teamData.team}-table`} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">{teamData.team} - 주요 지출 상세 내역 (인건비 제외)</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                          <thead className="text-xs text-gray-500 bg-gray-50 uppercase border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 font-semibold rounded-tl-lg whitespace-nowrap">발생일자</th>
                              <th className="px-4 py-3 font-semibold whitespace-nowrap">영업장명(프로젝트)</th>
                              <th className="px-4 py-3 font-semibold whitespace-nowrap">카테고리</th>
                              <th className="px-4 py-3 font-semibold whitespace-nowrap">업체명</th>
                              <th className="px-4 py-3 font-semibold whitespace-nowrap w-1/3">상세내역</th>
                              <th className="px-4 py-3 font-semibold text-right rounded-tr-lg whitespace-nowrap">금액</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailedExpenses.map((exp: any, i: number) => (
                              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(exp.date).toLocaleDateString()}</td>
                                <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{exp.branch_name || '-'}</td>
                                <td className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">{exp.mapped_term}</td>
                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{exp.vendor || '-'}</td>
                                <td className="px-4 py-3 text-gray-600 break-keep">{exp.description || '-'}</td>
                                <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">{formatCurrency(exp.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
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
