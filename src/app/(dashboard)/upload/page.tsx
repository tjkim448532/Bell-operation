"use client";

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Save, 
  RefreshCw, 
  Layers, 
  Link as LinkIcon,
  Search,
  Filter,
  TrendingDown,
  Building2,
  PieChart,
  HelpCircle,
  Laptop,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { formatNumber } from '@/lib/formatters';
import { 
  RawExpenseRow, 
  allocateExpenses, 
  ValidationMasterReport,
  LEISURE_OFFICIAL_TEAMS,
  ACCOUNT_MACRO_CATEGORIES,
  FRIENDLY_EXPENSE_CATEGORIES,
  inferTeamFromRawRow,
  inferAccountCategory,
  linkVenueAndTeam,
  makeFriendlyCategory
} from '@/lib/financeEngine';

export default function ExpenseUploadPage() {
  const [activeTab, setActiveTab] = useState<'SHEETS' | 'EXCEL'>('SHEETS');
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>(
    'https://docs.google.com/spreadsheets/d/1MYx45381kpFua8TG_EjLA95nLNCuHMreSTyybF3_ai0/edit?usp=sharing'
  );
  const [file, setFile] = useState<File | null>(null);
  const [yearMonth, setYearMonth] = useState<string>('2026-07');
  const [parsedRows, setParsedRows] = useState<RawExpenseRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [livePartMetrics, setLivePartMetrics] = useState<any[]>([]);

  // 필터 및 검색 상태
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [friendlyFilter, setFriendlyFilter] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 정산 월 변경 시 백엔드 SSOT 파트 실적 동적 조회
  useEffect(() => {
    const fetchLiveMetrics = async () => {
      try {
        const [y, m] = yearMonth.split('-');
        const lastDay = new Date(Number(y), Number(m), 0).getDate();
        const start = `${yearMonth}-01`;
        const end = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
        const res = await fetch(`/api/dashboard/revenue?startDate=${start}&endDate=${end}`);
        const json = await res.json();
        if (json.success && json.parts) {
          setLivePartMetrics(json.parts);
        }
      } catch (err) {
        console.error('Failed to fetch live part metrics:', err);
      }
    };
    fetchLiveMetrics();
  }, [yearMonth]);

  // 실시간 안분 및 검증마스터 연산
  const { allocations, audit } = useMemo(() => {
    return allocateExpenses(parsedRows, livePartMetrics);
  }, [parsedRows, livePartMetrics]);

  // 1. 엑셀 파일 업로드 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);
    setSaveSuccess(false);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (data.length < 2) {
          alert('엑셀 파일에 데이터 행이 부족합니다.');
          setLoading(false);
          return;
        }

        // 헤더 인덱스 자동 탐색
        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(data.length, 10); i++) {
          const rowStr = (data[i] || []).join(' ');
          if (
            rowStr.includes('계정') || 
            rowStr.includes('금액') || 
            rowStr.includes('부서') || 
            rowStr.includes('프로젝트') || 
            rowStr.includes('과목')
          ) {
            headerRowIdx = i;
            break;
          }
        }

        const headers = (data[headerRowIdx] || []).map((h: any) => String(h || '').trim());
        const codeIdx = headers.findIndex((h) => h.includes('코드'));
        const nameIdx = headers.findIndex((h) => h.includes('과목') || h.includes('계정명') || h.includes('차변계정과목'));
        const macroIdx = headers.findIndex((h) => h.includes('비목') || h.includes('대분류') || h.includes('구분'));
        const projectIdx = headers.findIndex((h) => h.includes('프로젝트') || h.includes('영업장'));
        const deptIdx = headers.findIndex((h) => h.includes('부서') || h.includes('사용부서') || h.includes('팀'));
        const amountIdx = headers.findIndex((h) => h.includes('금액') || h.includes('차변금액') || h.includes('실적') || h.includes('비용'));
        const memoIdx = headers.findIndex((h) => h.includes('적요') || h.includes('내용') || h.includes('비고'));

        const rows: RawExpenseRow[] = [];

        for (let i = headerRowIdx + 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;

          const rawAmt = row[amountIdx !== -1 ? amountIdx : 3];
          const cleanAmt = typeof rawAmt === 'number' 
            ? rawAmt 
            : parseFloat(String(rawAmt || '0').replace(/[^0-9.-]/g, ''));

          if (isNaN(cleanAmt) || cleanAmt === 0) continue;

          const rawCode = String(row[codeIdx !== -1 ? codeIdx : 0] || '-').trim();
          const rawName = String(row[nameIdx !== -1 ? nameIdx : 2] || '미분류과목').trim();
          const rawProject = projectIdx !== -1 ? String(row[projectIdx] || '').trim() : '';
          const rawDept = deptIdx !== -1 ? String(row[deptIdx] || '').trim() : '';
          const memo = memoIdx !== -1 ? String(row[memoIdx] || '').trim() : '';

          const effectiveDept = rawProject || rawDept || '본부공통';
          const { team: assignedTeam, venue: assignedVenue } = linkVenueAndTeam(rawProject, rawDept, memo);
          const assignedCategory = inferAccountCategory(rawCode, rawName);
          const { category: friendlyCategory } = makeFriendlyCategory(rawCode, rawName, memo);

          rows.push({
            accountCode: rawCode,
            accountName: rawName,
            macroCategory: macroIdx !== -1 ? String(row[macroIdx] || assignedCategory).trim() : assignedCategory,
            rawDepartment: effectiveDept,
            amount: Math.round(cleanAmt),
            memo,
            assignedTeam,
            assignedVenue,
            assignedCategory,
            friendlyCategory,
          });
        }

        setParsedRows(rows);
      } catch (err: any) {
        console.error('Parsing error:', err);
        alert(`엑셀 파일 파싱 오류: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  // 2. 구글 스프레드시트 링크 연동 핸들러
  const handleFetchGoogleSheets = async () => {
    if (!googleSheetUrl.trim()) {
      alert('구글 스프레드시트 링크(URL)를 입력해 주세요.');
      return;
    }

    setLoading(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/expenses/fetch-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: googleSheetUrl, yearMonth }),
      });

      const json = await res.json();
      if (!json.success) {
        alert(json.error || '구글 시트 연동 실패');
        return;
      }

      setParsedRows(json.rows || []);
      setFile(null);
    } catch (err: any) {
      alert(`구글 시트 요청 오류: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 행별 팀/비목 변경 인터랙션
  const handleUpdateRowTeam = (idx: number, newTeam: string) => {
    setParsedRows((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], assignedTeam: newTeam };
      return updated;
    });
    setSaveSuccess(false);
  };

  const handleUpdateRowCategory = (idx: number, newCategory: string) => {
    setParsedRows((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], assignedCategory: newCategory };
      return updated;
    });
    setSaveSuccess(false);
  };

  const handleUpdateRowFriendly = (idx: number, newFriendly: string) => {
    setParsedRows((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], friendlyCategory: newFriendly };
      return updated;
    });
    setSaveSuccess(false);
  };

  // DB 저장 핸들러
  const handleSaveToDB = async () => {
    if (parsedRows.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/expenses/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearMonth,
          expenses: parsedRows,
          partMetrics: livePartMetrics,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSaveSuccess(true);
      } else {
        alert(`저장 실패: ${json.error}`);
      }
    } catch (e: any) {
      alert(`저장 중 네트워크 오류: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const totalExpenseSum = useMemo(() => {
    return parsedRows.reduce((sum, r) => sum + r.amount, 0);
  }, [parsedRows]);

  // 초등학생도 이해할 수 있는 쉬운 한글 항목별 합계
  const friendlySummary = useMemo(() => {
    const map: Record<string, number> = {};
    FRIENDLY_EXPENSE_CATEGORIES.forEach((c) => { map[c] = 0; });
    parsedRows.forEach((r) => {
      const c = r.friendlyCategory || '기타 운영 지출';
      map[c] = (map[c] || 0) + r.amount;
    });
    return Object.entries(map).filter(([_, amt]) => amt > 0).sort((a, b) => b[1] - a[1]);
  }, [parsedRows]);

  // 필터링된 전표 목록
  const filteredRows = useMemo(() => {
    return parsedRows.map((r, originalIdx) => ({ ...r, originalIdx })).filter((r) => {
      const matchTeam = teamFilter === 'ALL' || r.assignedTeam === teamFilter;
      const matchCategory = categoryFilter === 'ALL' || r.assignedCategory === categoryFilter;
      const matchFriendly = friendlyFilter === 'ALL' || r.friendlyCategory === friendlyFilter;
      const matchKeyword = !searchKeyword || 
        r.accountName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        r.rawDepartment.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (r.assignedVenue && r.assignedVenue.toLowerCase().includes(searchKeyword.toLowerCase())) ||
        (r.memo && r.memo.toLowerCase().includes(searchKeyword.toLowerCase()));
      return matchTeam && matchCategory && matchFriendly && matchKeyword;
    });
  }, [parsedRows, teamFilter, categoryFilter, friendlyFilter, searchKeyword]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="text-emerald-600" size={24} />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              레저본부 4대 부서 비용 전표 맵핑 & P&L 통합 관리
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            재경부서 전표를 업로드하면 <strong>백엔드 영업장과 1:1 연결</strong>되고, <strong>초등학생도 이해하는 쉬운 한글 항목</strong>으로 자동 분류됩니다.
          </p>
        </div>

        {/* Month Selector & Save Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl px-3 py-1.5 border border-slate-200">
            <span className="text-2xs font-bold text-slate-600 uppercase">정산 월:</span>
            <input 
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
            />
          </div>
          {parsedRows.length > 0 && (
            <button
              onClick={handleSaveToDB}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{saveSuccess ? 'P&L 저장 완료' : 'P&L 데이터베이스 저장'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Dual Ingestion Channels (Google Sheets Link vs Excel Upload) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-1 gap-1">
          <button
            onClick={() => setActiveTab('SHEETS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'SHEETS'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LinkIcon size={16} className="text-indigo-600" />
            <span>방법 1: 구글 스프레드시트 링크 연동 (실시간 추천)</span>
          </button>
          <button
            onClick={() => setActiveTab('EXCEL')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'EXCEL'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet size={16} />
            <span>방법 2: 엑셀 파일 직접 업로드 (.xlsx, .csv)</span>
          </button>
        </div>

        {/* Tab 1: Google Sheets URL Input */}
        {activeTab === 'SHEETS' && (
          <div className="p-6 m-4 rounded-2xl bg-indigo-50/20 border border-indigo-100 space-y-4">
            <div className="max-w-3xl mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      재경부서 구글 스프레드시트 실시간 연결
                    </h3>
                    <p className="text-2xs text-slate-500">
                      공유 링크를 넣으면 AI가 프로젝트명을 영업장에 맞추고, 초등학생도 아는 한글 항목으로 바꿉니다.
                    </p>
                  </div>
                </div>
                <a
                  href={googleSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-2xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  <span>구글 시트 열기</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <div className="relative flex-1 w-full">
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:border-indigo-500 font-mono shadow-2xs"
                  />
                </div>
                <button
                  onClick={handleFetchGoogleSheets}
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 transition-colors shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{loading ? 'AI 항목 분석 중...' : '시트 데이터 불러오기'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Excel Dropzone */}
        {activeTab === 'EXCEL' && (
          <div className="p-8 border-2 border-dashed border-slate-300 m-4 rounded-2xl hover:border-emerald-500 transition-colors flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 shadow-2xs">
              <Upload size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {file ? file.name : '재경부서 전표 엑셀 파일(.xlsx, .xls, .csv)을 업로드하세요'}
            </h3>
            <p className="text-2xs text-slate-500 mt-1 max-w-md">
              프로젝트명, 사용부서명, 차변계정과목, 차변금액을 기반으로 4대 팀 및 6대 비목을 100% 자동 정제합니다.
            </p>

            <label className="mt-4 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors">
              <span>{loading ? '전표 분석 및 4대 팀 맵핑 중...' : '엑셀 파일 선택하기'}</span>
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>
          </div>
        )}
      </div>

      {/* Validation Master Audit Banner */}
      {parsedRows.length > 0 && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          audit.isZeroVariance 
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
            : 'bg-rose-50 border-rose-200 text-rose-950'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              audit.isZeroVariance ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
            }`}>
              {audit.isZeroVariance ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <span>검증마스터 감사 결과:</span>
                <span className={`px-2 py-0.5 rounded-md text-2xs font-extrabold ${
                  audit.isZeroVariance ? 'bg-emerald-200/80 text-emerald-800' : 'bg-rose-200 text-rose-800'
                }`}>
                  {audit.isZeroVariance ? 'ZERO-VARIANCE 무결성 통과 (Δ = 0)' : '오차 발생 점검 요망'}
                </span>
              </div>
              <p className="text-2xs text-slate-600 mt-0.5">
                원천 전표 총액: <strong>{formatNumber(audit.totalExcelSum)}</strong> | 4대 팀 배분 총액: <strong>{formatNumber(audit.totalAllocatedSum)}</strong> | 단수 오차: <strong>{formatNumber(audit.delta)}</strong>
              </p>
            </div>
          </div>
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs shrink-0">
              <CheckCircle2 size={14} />
              Firestore 저장 완료
            </span>
          )}
        </div>
      )}

      {/* 4 Official Teams Allocation Preview Cards */}
      {parsedRows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-slate-700" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                레저본부 공식 4대 팀 비용 배분 현황 (Allocation Overview)
              </h2>
            </div>
            <span className="text-2xs text-slate-500">
              ※ 디지털지원은 순수 지원부서로 자체 비용 100% 직과 배정됨
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {LEISURE_OFFICIAL_TEAMS.map((teamName) => {
              const alloc = allocations.get(teamName) || {
                directExpense: 0,
                commonExpense: 0,
                totalExpense: 0,
              };
              const isDigital = teamName === '디지털지원';
              const sharePercent = totalExpenseSum > 0 ? (alloc.totalExpense / totalExpenseSum) * 100 : 0;

              return (
                <div 
                  key={teamName} 
                  className={`bg-white p-4 rounded-xl border shadow-2xs space-y-2 transition-all ${
                    isDigital ? 'border-indigo-200 bg-indigo-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {isDigital ? (
                        <Laptop size={14} className="text-indigo-600" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                      <span className="text-xs font-bold text-slate-900">{teamName}</span>
                    </div>
                    <span className={`text-2xs font-bold px-2 py-0.5 rounded-md ${
                      isDigital ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {sharePercent.toFixed(1)}%
                    </span>
                  </div>

                  <div className="text-lg font-black font-mono text-slate-900">
                    {formatNumber(alloc.totalExpense)}
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-2xs text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>자체 직과 비용:</span>
                      <span className="font-mono font-semibold text-slate-700">{formatNumber(alloc.directExpense)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isDigital ? '지원부서 성격:' : '본부 공통 안분:'}</span>
                      <span className="font-mono text-slate-600">
                        {isDigital ? '매출 0원 (지원 전용)' : formatNumber(alloc.commonExpense)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Inferred Friendly Categories Grid (초등학생도 이해하는 쉬운 한글 항목) */}
      {parsedRows.length > 0 && friendlySummary.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                💡 AI가 변환한 쉬운 한글 항목별 지출 분포 (초등학생도 이해하는 쉬운 분류)
              </h3>
            </div>
            <span className="text-2xs text-slate-500">
              * 전표의 적요 및 계정과목을 분석하여 실제 어디에 쓴 돈인지 바로 알 수 있게 변환했습니다.
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {friendlySummary.map(([cat, amt]) => {
              const pct = totalExpenseSum > 0 ? (amt / totalExpenseSum) * 100 : 0;
              return (
                <div 
                  key={cat} 
                  onClick={() => setFriendlyFilter(friendlyFilter === cat ? 'ALL' : cat)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
                    friendlyFilter === cat 
                      ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/50' 
                      : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="text-2xs font-bold text-slate-700 truncate" title={cat}>
                    🏷️ {cat}
                  </div>
                  <div className="text-sm font-bold font-mono text-slate-900">
                    {formatNumber(amt)}
                  </div>
                  <div className="text-2xs font-bold text-amber-700">
                    {pct.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Parsed Ledger Table */}
      {parsedRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3">
          {/* Table Header & Controls */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <TrendingDown size={16} className="text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                지출 전표 원장 ({filteredRows.length}건 / 전체 {parsedRows.length}건)
              </h3>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:w-44">
                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="적요 / 영업장 검색"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Team Filter */}
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">전체 팀</option>
                {LEISURE_OFFICIAL_TEAMS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                <option value="본부공통">본부공통</option>
              </select>

              {/* Friendly Category Filter */}
              <select
                value={friendlyFilter}
                onChange={(e) => setFriendlyFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-amber-800 focus:outline-none"
              >
                <option value="ALL">전체 쉬운 한글 항목</option>
                {FRIENDLY_EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Reset filter */}
              {(teamFilter !== 'ALL' || friendlyFilter !== 'ALL' || searchKeyword) && (
                <button
                  onClick={() => { setTeamFilter('ALL'); setFriendlyFilter('ALL'); setSearchKeyword(''); }}
                  className="text-2xs text-slate-500 hover:text-slate-900 underline px-1"
                >
                  필터 초기화
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[520px] custom-scrollbar">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-2xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-200">No</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">소속 팀 (부서)</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">연결 영업장 (Venue)</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">💡 쉬운 한글 항목</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">회계 계정과목</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-200">금액</th>
                  <th className="py-2.5 px-3">적요 (지출 상세내용)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row.originalIdx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3 font-mono text-slate-400 border-r border-slate-200 text-2xs">
                      {row.originalIdx + 1}
                    </td>

                    {/* Interactive Team Selector */}
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <select
                        value={row.assignedTeam || '본부공통'}
                        onChange={(e) => handleUpdateRowTeam(row.originalIdx, e.target.value)}
                        className={`text-2xs font-bold px-2 py-1 rounded-md border outline-none cursor-pointer ${
                          row.assignedTeam === '디지털지원'
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : row.assignedTeam === '본부공통'
                            ? 'bg-slate-100 border-slate-300 text-slate-600'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        }`}
                      >
                        {LEISURE_OFFICIAL_TEAMS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                        <option value="본부공통">본부공통</option>
                      </select>
                    </td>

                    {/* Assigned Venue (백엔드 영업장 연결) */}
                    <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200 text-2xs">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span>{row.assignedVenue || row.rawDepartment}</span>
                      </div>
                      <div className="font-mono text-3xs text-slate-400 pl-2.5">
                        원천: {row.rawDepartment}
                      </div>
                    </td>

                    {/* Friendly Category Selector */}
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <select
                        value={row.friendlyCategory || '기타 운영 지출'}
                        onChange={(e) => handleUpdateRowFriendly(row.originalIdx, e.target.value)}
                        className="text-2xs font-bold px-2 py-1 rounded-md border border-amber-200 bg-amber-50/70 text-amber-900 outline-none cursor-pointer max-w-[170px] truncate"
                      >
                        {FRIENDLY_EXPENSE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>🏷️ {c}</option>
                        ))}
                      </select>
                    </td>

                    {/* Account Subject */}
                    <td className="py-2 px-3 font-medium text-slate-800 border-r border-slate-200">
                      <div className="font-semibold text-slate-800">{row.accountName}</div>
                      <div className="font-mono text-3xs text-slate-400">{row.accountCode}</div>
                    </td>

                    {/* Amount */}
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                      {formatNumber(row.amount)}
                    </td>

                    {/* Memo */}
                    <td className="py-2 px-3 text-2xs text-slate-600 max-w-sm truncate" title={row.memo}>
                      {row.memo || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
