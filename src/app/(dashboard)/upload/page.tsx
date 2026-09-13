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
  ExternalLink,
  Kanban,
  Table as TableIcon,
  GripVertical,
  Columns
} from 'lucide-react';
import { formatNumber } from '@/lib/formatters';
import { 
  RawExpenseRow, 
  allocateExpenses, 
  ValidationMasterReport,
  LEISURE_OFFICIAL_TEAMS,
  ACCOUNT_MACRO_CATEGORIES,
  FRIENDLY_EXPENSE_CATEGORIES,
  FriendlyExpenseCategory,
  inferTeamFromRawRow,
  inferAccountCategory,
  linkVenueAndTeam,
  makeFriendlyCategory,
  getFriendlyCategoryGroup
} from '@/lib/financeEngine';

// 16대 친화형 카테고리 메타 (아이콘, 색상 테마)
const CATEGORY_META: Record<string, { icon: string; color: string; bg: string; badgeBg: string }> = {
  '정규직 직원 급여': { icon: '👔', color: 'text-blue-700', bg: 'bg-blue-50/40', badgeBg: 'bg-blue-100 text-blue-800' },
  '아르바이트비 (알바비)': { icon: '⏱️', color: 'text-teal-700', bg: 'bg-teal-50/40', badgeBg: 'bg-teal-100 text-teal-800' },
  '직원 4대보험과 국민연금 (직원비용)': { icon: '🛡️', color: 'text-indigo-700', bg: 'bg-indigo-50/40', badgeBg: 'bg-indigo-100 text-indigo-800' },
  '직원 밥값과 간식비': { icon: '🍚', color: 'text-orange-700', bg: 'bg-orange-50/40', badgeBg: 'bg-orange-100 text-orange-800' },
  '손님과 시설 안전 보험료': { icon: '🏢', color: 'text-purple-700', bg: 'bg-purple-50/40', badgeBg: 'bg-purple-100 text-purple-800' },
  '전기세와 물·가스 요금': { icon: '⚡', color: 'text-amber-700', bg: 'bg-amber-50/40', badgeBg: 'bg-amber-100 text-amber-800' },
  '인터넷과 전화 요금': { icon: '📶', color: 'text-cyan-700', bg: 'bg-cyan-50/40', badgeBg: 'bg-cyan-100 text-cyan-800' },
  '영업장에 필요한 물건 사기': { icon: '🛍️', color: 'text-pink-700', bg: 'bg-pink-50/40', badgeBg: 'bg-pink-100 text-pink-800' },
  '정수기와 차량 빌린 돈': { icon: '🚗', color: 'text-sky-700', bg: 'bg-sky-50/40', badgeBg: 'bg-sky-100 text-sky-800' },
  '현수막·배너 만들기와 홍보비': { icon: '🎨', color: 'text-emerald-700', bg: 'bg-emerald-50/40', badgeBg: 'bg-emerald-100 text-emerald-800' },
  '고장난 시설과 기구 고치기': { icon: '🔧', color: 'text-red-700', bg: 'bg-red-50/40', badgeBg: 'bg-red-100 text-red-800' },
  '리조트 차량 기름값과 정비': { icon: '⛽', color: 'text-stone-700', bg: 'bg-stone-50/40', badgeBg: 'bg-stone-100 text-stone-800' },
  '카드단말기·서비스 수수료': { icon: '💳', color: 'text-rose-700', bg: 'bg-rose-50/40', badgeBg: 'bg-rose-100 text-rose-800' },
  '나라와 지자체에 낸 세금': { icon: '🏛️', color: 'text-slate-700', bg: 'bg-slate-50/40', badgeBg: 'bg-slate-100 text-slate-800' },
  '좋은 일 돕기 (기부금)': { icon: '🤝', color: 'text-green-700', bg: 'bg-green-50/40', badgeBg: 'bg-green-100 text-green-800' },
  '기타 운영 지출': { icon: '📦', color: 'text-gray-700', bg: 'bg-gray-50/40', badgeBg: 'bg-gray-100 text-gray-800' },
};

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

  // 뷰 모드: 칸반(항목별), 칸반(부서별), 표 보기
  const [viewMode, setViewMode] = useState<'KANBAN_CATEGORY' | 'KANBAN_TEAM' | 'TABLE'>('KANBAN_CATEGORY');
  const [kanbanGroupFilter, setKanbanGroupFilter] = useState<'ALL' | '직원비용' | '시설/운영비' | '수수료/세금' | '기타'>('ALL');

  // 드래그 앤 드롭 상태
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dropTargetCategory, setDropTargetCategory] = useState<string | null>(null);
  const [dropTargetTeam, setDropTargetTeam] = useState<string | null>(null);

  // 표 필터 및 검색 상태
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
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
        const codeIdx = headers.findIndex((h) => h.includes('코드') && !h.includes('거래처'));
        const nameIdx = headers.findIndex((h) => h.includes('과목') || h.includes('계정명') || h.includes('차변계정과목'));
        const macroIdx = headers.findIndex((h) => h.includes('비목') || h.includes('대분류') || h.includes('구분'));
        const projectIdx = headers.findIndex((h) => h.includes('프로젝트') || h.includes('영업장'));
        const deptIdx = headers.findIndex((h) => h.includes('부서') || h.includes('사용부서') || h.includes('팀'));
        const amountIdx = headers.findIndex((h) => h.includes('금액') || h.includes('차변금액') || h.includes('실적') || h.includes('비용'));
        const memoIdx = headers.findIndex((h) => h.includes('적요') || h.includes('내용') || h.includes('비고'));
        const clientIdx = headers.findIndex((h) => h.includes('거래처명') || h.includes('거래처'));

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
          const rawClient = clientIdx !== -1 ? String(row[clientIdx] || '').trim() : '';

          const effectiveDept = rawProject || rawDept || '본부공통';
          const { team: assignedTeam, venue: assignedVenue } = linkVenueAndTeam(rawProject, rawDept, memo);
          const assignedCategory = inferAccountCategory(rawCode, rawName);
          const { category: friendlyCategory } = makeFriendlyCategory(rawCode, rawName, memo, rawClient);

          rows.push({
            accountCode: rawCode,
            accountName: rawName,
            macroCategory: macroIdx !== -1 ? String(row[macroIdx] || assignedCategory).trim() : assignedCategory,
            rawDepartment: effectiveDept,
            amount: Math.round(cleanAmt),
            memo,
            clientName: rawClient,
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

  // 칸반 및 테이블 공용: 항목 변경
  const handleMoveItemToCategory = (rowIdx: number, newCategory: FriendlyExpenseCategory | string) => {
    setParsedRows((prev) => {
      const updated = [...prev];
      const current = updated[rowIdx];
      if (!current) return prev;

      let newMacro = current.assignedCategory;
      if (newCategory === '정규직 직원 급여' || newCategory === '아르바이트비 (알바비)') {
        newMacro = '인건비';
      } else if (newCategory === '직원 4대보험과 국민연금 (직원비용)' || newCategory === '직원 밥값과 간식비') {
        newMacro = '복리후생비';
      } else if (newCategory === '현수막·배너 만들기와 홍보비') {
        newMacro = '마케팅/판촉비';
      } else if (newCategory === '카드단말기·서비스 수수료' || newCategory === '정수기와 차량 빌린 돈') {
        newMacro = '지급수수료/임차료';
      }

      updated[rowIdx] = {
        ...current,
        friendlyCategory: newCategory,
        assignedCategory: newMacro,
      };
      return updated;
    });
    setSaveSuccess(false);
  };

  // 칸반 및 테이블 공용: 팀 변경
  const handleMoveItemToTeam = (rowIdx: number, newTeam: string) => {
    setParsedRows((prev) => {
      const updated = [...prev];
      const current = updated[rowIdx];
      if (!current) return prev;
      updated[rowIdx] = {
        ...current,
        assignedTeam: newTeam,
      };
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

  // 항목별 칸반 컬럼 데이터 계산
  const categoryKanbanColumns = useMemo(() => {
    const cols = FRIENDLY_EXPENSE_CATEGORIES.map((cat) => {
      const items = parsedRows
        .map((r, originalIdx) => ({ ...r, originalIdx }))
        .filter((r) => (r.friendlyCategory || '기타 운영 지출') === cat);
      const subtotal = items.reduce((sum, r) => sum + r.amount, 0);
      const group = getFriendlyCategoryGroup(cat);
      return { category: cat, items, subtotal, group };
    });

    if (kanbanGroupFilter === 'ALL') return cols;
    return cols.filter((c) => c.group === kanbanGroupFilter);
  }, [parsedRows, kanbanGroupFilter]);

  // 부서별 칸반 컬럼 데이터 계산
  const teamKanbanColumns = useMemo(() => {
    const teams = [...LEISURE_OFFICIAL_TEAMS, '본부공통'];
    return teams.map((teamName) => {
      const items = parsedRows
        .map((r, originalIdx) => ({ ...r, originalIdx }))
        .filter((r) => (r.assignedTeam || '본부공통') === teamName);
      const subtotal = items.reduce((sum, r) => sum + r.amount, 0);
      return { teamName, items, subtotal };
    });
  }, [parsedRows]);

  // 표 필터링된 전표 목록
  const filteredRows = useMemo(() => {
    return parsedRows.map((r, originalIdx) => ({ ...r, originalIdx }))
      .filter((r) => {
        const matchTeam = teamFilter === 'ALL' || r.assignedTeam === teamFilter;
        const matchFriendly = friendlyFilter === 'ALL' || r.friendlyCategory === friendlyFilter;
        const matchKeyword = !searchKeyword || 
          r.accountName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          r.rawDepartment.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          (r.clientName && r.clientName.toLowerCase().includes(searchKeyword.toLowerCase())) ||
          (r.assignedVenue && r.assignedVenue.toLowerCase().includes(searchKeyword.toLowerCase())) ||
          (r.memo && r.memo.toLowerCase().includes(searchKeyword.toLowerCase()));
        return matchTeam && matchFriendly && matchKeyword;
      });
  }, [parsedRows, teamFilter, friendlyFilter, searchKeyword]);

  return (
    <div className="space-y-8 pb-12">
      {/* 1. 상단 히어로 배너 (Hero Section - #00AE95 & rounded-b-[40px]) */}
      <div className="w-full bg-[#00AE95] rounded-b-[40px] relative overflow-hidden text-white pt-8 pb-10 px-6 sm:px-10 shadow-[0_10px_30px_rgba(0,174,149,0.18)]">
        {/* 기하학적 데코레이션 */}
        <div className="absolute top-6 right-10 w-36 h-36 bg-white/20 rounded-[50%_50%_0_0] pointer-events-none" />
        <div className="absolute -bottom-10 right-36 w-32 h-32 bg-white/10 rounded-[50%_0_50%_0] pointer-events-none" />
        <div className="absolute top-2 left-1/3 w-20 h-20 bg-white/10 rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-0.5 rounded-full bg-white/25 text-white text-3xs font-extrabold tracking-wider uppercase backdrop-blur-xs">
                FINANCE & P&L CONTROLLER
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>레저본부 4대 부서 비용 전표 맵핑 & P&L 관리</span>
            </h1>
            <p className="text-xs sm:text-sm text-white/90 mt-1">
              정규직 급여와 알바비가 분리되며, 직원보험·국민연금은 직원비용으로 통합 집계됩니다.
            </p>
          </div>

          {/* Month Selector & Save Button */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-xs rounded-xl px-3 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
              <span className="text-2xs font-bold text-slate-500 uppercase">정산 월:</span>
              <input 
                type="month"
                value={yearMonth}
                onChange={(e) => setYearMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
              />
            </div>
            {parsedRows.length > 0 && (
              <button
                onClick={handleSaveToDB}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{saveSuccess ? 'P&L 저장 완료' : 'P&L 데이터베이스 저장'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-8">
        {/* 2. 전표 연동 채널 카드 (Google Sheets vs Excel Upload) */}
        <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 relative overflow-hidden group">
          {/* 마이크로 인터랙션 민트 서클 */}
          <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-[#00AE95]/5 rounded-full pointer-events-none transition-transform duration-500 ease-out group-hover:scale-[1.8]" />

          {/* Tab Switcher */}
          <div className="flex border-b border-slate-100 bg-slate-50/80 p-1.5 rounded-2xl gap-1.5 mb-6 max-w-xl">
            <button
              onClick={() => setActiveTab('SHEETS')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'SHEETS'
                  ? 'bg-white text-[#00AE95] shadow-[0_4px_12px_rgba(0,0,0,0.05)]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LinkIcon size={15} />
              <span>구글 스프레드시트 링크 연동 (추천)</span>
            </button>
            <button
              onClick={() => setActiveTab('EXCEL')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'EXCEL'
                  ? 'bg-white text-[#00AE95] shadow-[0_4px_12px_rgba(0,0,0,0.05)]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet size={15} />
              <span>엑셀 파일 직접 업로드</span>
            </button>
          </div>

          {/* Tab 1: Google Sheets URL Input */}
          {activeTab === 'SHEETS' && (
            <div className="p-6 rounded-2xl bg-[#E6F7F4]/50 border border-[#00AE95]/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#00AE95] text-white flex items-center justify-center font-bold shadow-xs">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      재경부서 구글 스프레드시트 실시간 연결
                    </h3>
                    <p className="text-2xs text-slate-500">
                      링크를 넣으면 급여/알바비/직원보험/국민연금이 자동 분리·매핑되며 칸반 보드에서 자유롭게 변경할 수 있습니다.
                    </p>
                  </div>
                </div>
                <a
                  href={googleSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-2xs text-[#00AE95] hover:text-[#00826F] font-bold"
                >
                  <span>구글 시트 원본 열기</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                <div className="relative flex-1 w-full">
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:border-[#00AE95] font-mono shadow-2xs"
                  />
                </div>
                <button
                  onClick={handleFetchGoogleSheets}
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#00AE95] hover:bg-[#009681] text-white text-xs font-bold shrink-0 transition-all shadow-[0_4px_14px_rgba(0,174,149,0.3)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{loading ? 'AI 항목 분석 중...' : '시트 데이터 불러오기'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Excel Dropzone */}
          {activeTab === 'EXCEL' && (
            <div className="p-8 border-2 border-dashed border-slate-200 rounded-[24px] hover:border-[#00AE95] transition-colors flex flex-col items-center justify-center text-center bg-slate-50/50">
              <div className="w-12 h-12 rounded-2xl bg-[#E6F7F4] text-[#00AE95] flex items-center justify-center mb-3 shadow-2xs">
                <Upload size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {file ? file.name : '재경부서 전표 엑셀 파일(.xlsx, .xls, .csv)을 업로드하세요'}
              </h3>
              <p className="text-2xs text-slate-500 mt-1 max-w-md">
                프로젝트명, 거래처명, 차변계정과목, 차변금액을 기반으로 4대 팀 및 16대 친화형 항목을 100% 자동 정제합니다.
              </p>

              <label className="mt-4 px-6 py-2.5 rounded-xl bg-[#00AE95] hover:bg-[#009681] text-white text-xs font-bold cursor-pointer shadow-[0_4px_14px_rgba(0,174,149,0.3)] transition-all">
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

        {/* 3. 검증마스터 감사 리포트 배너 */}
        {parsedRows.length > 0 && (
          <div className={`p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
            audit.isZeroVariance 
              ? 'bg-white border-l-6 border-l-[#00AE95]' 
              : 'bg-rose-50/80 border-l-6 border-l-rose-500'
          }`}>
            <div className="flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                audit.isZeroVariance ? 'bg-[#E6F7F4] text-[#00AE95]' : 'bg-rose-100 text-rose-600'
              }`}>
                {audit.isZeroVariance ? <ShieldCheck size={22} /> : <AlertCircle size={22} />}
              </div>
              <div>
                <div className="text-xs font-bold flex items-center gap-2 text-slate-800">
                  <span>검증마스터 감사 결과:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-2xs font-extrabold ${
                    audit.isZeroVariance ? 'bg-[#E6F7F4] text-[#00AE95]' : 'bg-rose-200 text-rose-800'
                  }`}>
                    {audit.isZeroVariance ? 'ZERO-VARIANCE 무결성 통과 (Δ = 0)' : '오차 발생 점검 요망'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  원천 전표 총액: <strong className="text-slate-800 font-mono">{formatNumber(audit.totalExcelSum)}</strong> | 4대 팀 배분 총액: <strong className="text-slate-800 font-mono">{formatNumber(audit.totalAllocatedSum)}</strong> | 단수 오차: <strong className="font-mono text-[#00AE95]">{formatNumber(audit.delta)}</strong>
                </p>
              </div>
            </div>
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-[#00AE95] bg-[#E6F7F4] px-4 py-2 rounded-xl shadow-2xs shrink-0">
                <CheckCircle2 size={15} />
                Firestore 저장 완료
              </span>
            )}
          </div>
        )}

        {/* 4. 레저본부 공식 4대 팀 비용 배분 카드 */}
        {parsedRows.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00AE95]" />
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  레저본부 공식 4대 팀 비용 배분 현황 (Allocation Overview)
                </h2>
              </div>
              <span className="text-2xs text-slate-400">
                ※ 디지털지원은 순수 지원부서로 자체 비용 100% 직과 배정됨
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 relative overflow-hidden group space-y-3"
                  >
                    <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-[#00AE95]/5 rounded-full pointer-events-none transition-transform duration-500 ease-out group-hover:scale-[1.8]" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isDigital ? (
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                            <Laptop size={14} />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-[#E6F7F4] text-[#00AE95] flex items-center justify-center">
                            <Building2 size={14} />
                          </div>
                        )}
                        <span className="text-sm font-bold text-slate-800">{teamName}</span>
                      </div>
                      <span className={`text-2xs font-extrabold px-2.5 py-0.5 rounded-full ${
                        isDigital ? 'bg-indigo-100 text-indigo-700' : 'bg-[#E6F7F4] text-[#00AE95]'
                      }`}>
                        {sharePercent.toFixed(1)}%
                      </span>
                    </div>

                    <div className="text-2xl font-black font-mono text-slate-800">
                      {formatNumber(alloc.totalExpense)}
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 text-2xs text-slate-500 space-y-1">
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

        {/* 5. 메인 작업 영역: 칸반 보드 & 표 뷰어 */}
        {parsedRows.length > 0 && (
          <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden space-y-6">
            {/* 상단 컨트롤 바: 뷰어 전환 & 그룹 필터 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              {/* 뷰 모드 토글 버튼 */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
                <button
                  onClick={() => setViewMode('KANBAN_CATEGORY')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'KANBAN_CATEGORY'
                      ? 'bg-[#00AE95] text-white shadow-[0_4px_12px_rgba(0,174,149,0.25)]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Kanban size={14} />
                  <span>항목별 칸반 보드 (드래그 분류)</span>
                </button>
                <button
                  onClick={() => setViewMode('KANBAN_TEAM')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'KANBAN_TEAM'
                      ? 'bg-[#00AE95] text-white shadow-[0_4px_12px_rgba(0,174,149,0.25)]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Columns size={14} />
                  <span>부서별 칸반 보드 (팀 이동)</span>
                </button>
                <button
                  onClick={() => setViewMode('TABLE')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'TABLE'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TableIcon size={14} />
                  <span>전표 원장 표 (Table)</span>
                </button>
              </div>

              {/* 항목별 칸반 그룹 집중 필터 */}
              {viewMode === 'KANBAN_CATEGORY' && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-2xs font-bold text-slate-400 mr-1">항목 필터:</span>
                  {(['ALL', '직원비용', '시설/운영비', '수수료/세금', '기타'] as const).map((grp) => (
                    <button
                      key={grp}
                      onClick={() => setKanbanGroupFilter(grp)}
                      className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all cursor-pointer ${
                        kanbanGroupFilter === grp
                          ? 'bg-[#00AE95] text-white shadow-[0_2px_8px_rgba(0,174,149,0.25)]'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {grp === 'ALL' ? '전체 (16개)' : grp === '직원비용' ? '👔 직원비용 (급여/알바/보험/연금/식대)' : grp}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* VIEW 1: 항목별 칸반 보드 (드래그 앤 드롭) */}
            {viewMode === 'KANBAN_CATEGORY' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-2xs text-slate-500 px-1">
                  <span>
                    💡 <strong>사용 방법:</strong> 전표 카드를 원하는 항목 칼럼으로 <strong>드래그 & 드롭</strong>하거나 카드 내 선택기로 변경하면 즉시 재집계됩니다.
                  </span>
                  <span className="font-semibold">
                    칼럼: {categoryKanbanColumns.length}개 | 총 전표: {parsedRows.length}건 ({formatNumber(totalExpenseSum)}원)
                  </span>
                </div>

                {/* 가로 스크롤 칸반 보드 */}
                <div className="flex gap-4 overflow-x-auto pb-6 pt-1 custom-scrollbar min-h-[580px]">
                  {categoryKanbanColumns.map(({ category, items, subtotal }) => {
                    const meta = CATEGORY_META[category] || { icon: '🏷️', color: 'text-slate-700', bg: 'bg-slate-50', badgeBg: 'bg-slate-100 text-slate-800' };
                    const isDropTarget = dropTargetCategory === category;
                    const pct = totalExpenseSum > 0 ? (subtotal / totalExpenseSum) * 100 : 0;

                    return (
                      <div
                        key={category}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dropTargetCategory !== category) setDropTargetCategory(category);
                        }}
                        onDragLeave={() => {
                          if (dropTargetCategory === category) setDropTargetCategory(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const rowIdx = Number(e.dataTransfer.getData('text/plain'));
                          if (!isNaN(rowIdx)) {
                            handleMoveItemToCategory(rowIdx, category);
                          }
                          setDropTargetCategory(null);
                          setDraggedIdx(null);
                        }}
                        className={`flex-shrink-0 w-80 rounded-[28px] transition-all flex flex-col max-h-[700px] border-2 ${
                          isDropTarget 
                            ? 'bg-[#E6F7F4]/80 border-[#00AE95] shadow-lg scale-[1.01]' 
                            : 'bg-slate-50/70 border-transparent shadow-[0_4px_20px_rgba(0,0,0,0.02)]'
                        }`}
                      >
                        {/* 칼럼 헤더 */}
                        <div className="p-4 bg-white rounded-t-[26px] shadow-2xs space-y-1.5 sticky top-0 z-10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-base">{meta.icon}</span>
                              <h4 className={`text-xs font-bold truncate ${meta.color}`} title={category}>
                                {category}
                              </h4>
                            </div>
                            <span className={`text-3xs font-extrabold px-2 py-0.5 rounded-full shrink-0 ${meta.badgeBg}`}>
                              {items.length}건
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-2xs pt-1 border-t border-slate-100">
                            <span className="font-mono font-bold text-slate-800 text-xs">
                              {formatNumber(subtotal)}
                            </span>
                            <span className="font-semibold text-slate-500">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* 드롭 영역 & 카드 리스트 */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                          {items.length === 0 ? (
                            <div className="h-32 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-center p-3 text-2xs text-slate-400">
                              이 항목으로 전표 카드를 드래그하여 배치하세요
                            </div>
                          ) : (
                            items.map((item) => (
                              <div
                                key={item.originalIdx}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('text/plain', String(item.originalIdx));
                                  setDraggedIdx(item.originalIdx);
                                }}
                                onDragEnd={() => {
                                  setDraggedIdx(null);
                                  setDropTargetCategory(null);
                                }}
                                className={`p-4 bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-grab active:cursor-grabbing space-y-2.5 border-0 ring-1 ring-slate-100 relative overflow-hidden group ${
                                  draggedIdx === item.originalIdx ? 'opacity-40 ring-2 ring-[#00AE95]' : ''
                                }`}
                              >
                                <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-[#00AE95]/5 rounded-full pointer-events-none transition-transform duration-300 group-hover:scale-[1.8]" />

                                {/* Card Header: Amount & Team */}
                                <div className="flex items-center justify-between gap-1">
                                  <div className="text-sm font-black font-mono text-slate-800">
                                    {formatNumber(item.amount)}
                                  </div>
                                  <span className={`text-3xs font-bold px-2 py-0.5 rounded-full ${
                                    item.assignedTeam === '디지털지원'
                                      ? 'bg-indigo-100 text-indigo-700'
                                      : item.assignedTeam === '본부공통'
                                      ? 'bg-slate-100 text-slate-600'
                                      : 'bg-[#E6F7F4] text-[#00AE95]'
                                  }`}>
                                    {item.assignedTeam}
                                  </span>
                                </div>

                                {/* Card Details: Client / Project */}
                                <div className="text-2xs font-semibold text-slate-800 line-clamp-1" title={item.clientName || item.rawDepartment}>
                                  🏢 {item.clientName ? `${item.clientName} (${item.rawDepartment})` : item.rawDepartment}
                                </div>

                                {/* Account & Venue */}
                                <div className="flex items-center justify-between text-3xs text-slate-500 pt-1 border-t border-slate-50">
                                  <span className="font-mono text-slate-600 truncate max-w-[140px]" title={item.accountName}>
                                    {item.accountName}
                                  </span>
                                  <span className="text-slate-400 truncate max-w-[100px]" title={item.assignedVenue}>
                                    📍 {item.assignedVenue || '공통'}
                                  </span>
                                </div>

                                {/* Memo */}
                                {item.memo && (
                                  <div className="text-3xs text-slate-500 bg-slate-50 p-2 rounded-xl line-clamp-2" title={item.memo}>
                                    📝 {item.memo}
                                  </div>
                                )}

                                {/* Quick Move Dropdown */}
                                <div className="pt-1 flex items-center justify-between gap-1">
                                  <span className="text-3xs text-slate-400 flex items-center gap-0.5">
                                    <GripVertical size={11} className="text-slate-300" />
                                    이동
                                  </span>
                                  <select
                                    value={item.friendlyCategory || category}
                                    onChange={(e) => handleMoveItemToCategory(item.originalIdx, e.target.value)}
                                    className="text-3xs font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer max-w-[150px] truncate hover:border-[#00AE95]"
                                  >
                                    {FRIENDLY_EXPENSE_CATEGORIES.map((c) => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW 2: 부서별 칸반 보드 (팀 간 전표 이동) */}
            {viewMode === 'KANBAN_TEAM' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-2xs text-slate-500 px-1">
                  <span>
                    💡 <strong>부서 이동:</strong> 전표 카드를 원하는 팀(부서) 칼럼으로 드래그하면 해당 팀의 직과 비용으로 즉시 변경됩니다.
                  </span>
                  <span>4대 팀 + 본부 공통</span>
                </div>

                {/* 5-Column Grid for Teams */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 min-h-[580px]">
                  {teamKanbanColumns.map(({ teamName, items, subtotal }) => {
                    const isDigital = teamName === '디지털지원';
                    const isCommon = teamName === '본부공통';
                    const isDropTarget = dropTargetTeam === teamName;

                    return (
                      <div
                        key={teamName}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dropTargetTeam !== teamName) setDropTargetTeam(teamName);
                        }}
                        onDragLeave={() => {
                          if (dropTargetTeam === teamName) setDropTargetTeam(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const rowIdx = Number(e.dataTransfer.getData('text/plain'));
                          if (!isNaN(rowIdx)) {
                            handleMoveItemToTeam(rowIdx, teamName);
                          }
                          setDropTargetTeam(null);
                          setDraggedIdx(null);
                        }}
                        className={`rounded-[28px] transition-all flex flex-col max-h-[700px] border-2 ${
                          isDropTarget 
                            ? 'bg-[#E6F7F4]/80 border-[#00AE95] shadow-lg scale-[1.01]' 
                            : 'bg-slate-50/70 border-transparent shadow-[0_4px_20px_rgba(0,0,0,0.02)]'
                        }`}
                      >
                        {/* Column Header */}
                        <div className="p-4 bg-white rounded-t-[26px] shadow-2xs space-y-1.5 sticky top-0 z-10">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                              {isDigital ? <Laptop size={15} className="text-indigo-600" /> : <Building2 size={15} className="text-[#00AE95]" />}
                              <span>{teamName}</span>
                            </h4>
                            <span className="text-3xs font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {items.length}건
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-2xs pt-1 border-t border-slate-100">
                            <span className="font-mono font-bold text-slate-800 text-xs">
                              {formatNumber(subtotal)}
                            </span>
                            <span className="text-3xs text-slate-400 font-medium">
                              {isDigital ? '자체 100%' : isCommon ? '공통 안분' : '직과'}
                            </span>
                          </div>
                        </div>

                        {/* Cards List */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                          {items.length === 0 ? (
                            <div className="h-32 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-center p-3 text-2xs text-slate-400">
                              배정된 전표가 없습니다
                            </div>
                          ) : (
                            items.map((item) => (
                              <div
                                key={item.originalIdx}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('text/plain', String(item.originalIdx));
                                  setDraggedIdx(item.originalIdx);
                                }}
                                onDragEnd={() => {
                                  setDraggedIdx(null);
                                  setDropTargetTeam(null);
                                }}
                                className="p-4 bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-grab active:cursor-grabbing space-y-2 border-0 ring-1 ring-slate-100"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-black font-mono text-slate-800">
                                    {formatNumber(item.amount)}
                                  </div>
                                  <span className="text-3xs font-bold text-[#00AE95] bg-[#E6F7F4] px-2 py-0.5 rounded-full truncate max-w-[120px]">
                                    {item.friendlyCategory || '기타'}
                                  </span>
                                </div>

                                <div className="text-2xs font-semibold text-slate-800 line-clamp-1">
                                  {item.clientName || item.rawDepartment}
                                </div>

                                <div className="text-3xs text-slate-500 line-clamp-1">
                                  📝 {item.memo || item.accountName}
                                </div>

                                <div className="pt-1 flex items-center justify-end">
                                  <select
                                    value={item.assignedTeam || teamName}
                                    onChange={(e) => handleMoveItemToTeam(item.originalIdx, e.target.value)}
                                    className="text-3xs font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer hover:border-[#00AE95]"
                                  >
                                    {LEISURE_OFFICIAL_TEAMS.map((t) => (
                                      <option key={t} value={t}>이동: {t}</option>
                                    ))}
                                    <option value="본부공통">이동: 본부공통</option>
                                  </select>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW 3: 전표 원장 표 목록 */}
            {viewMode === 'TABLE' && (
              <div className="space-y-4">
                {/* Table Filter Bar */}
                <div className="p-4 rounded-2xl bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <TrendingDown size={16} className="text-[#00AE95]" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      전표 원장 ({filteredRows.length}건 / 전체 {parsedRows.length}건)
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:w-48">
                      <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="적요 / 거래처 / 영업장 검색"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00AE95]"
                      />
                    </div>

                    {/* Team Filter */}
                    <select
                      value={teamFilter}
                      onChange={(e) => setTeamFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
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
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">전체 항목</option>
                      {FRIENDLY_EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    {/* Reset filter */}
                    {(teamFilter !== 'ALL' || friendlyFilter !== 'ALL' || searchKeyword) && (
                      <button
                        onClick={() => { setTeamFilter('ALL'); setFriendlyFilter('ALL'); setSearchKeyword(''); }}
                        className="text-2xs text-slate-500 hover:text-slate-800 underline px-1 cursor-pointer"
                      >
                        초기화
                      </button>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-[540px] custom-scrollbar rounded-2xl border border-slate-100">
                  <table className="w-full text-left text-xs text-slate-600 border-collapse">
                    <thead className="bg-slate-50 text-2xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 sticky top-0 z-10">
                      <tr>
                        <th className="py-3 px-3.5">No</th>
                        <th className="py-3 px-3.5">소속 팀 (부서)</th>
                        <th className="py-3 px-3.5">거래처 및 프로젝트</th>
                        <th className="py-3 px-3.5">💡 쉬운 한글 항목</th>
                        <th className="py-3 px-3.5">회계 계정과목</th>
                        <th className="py-3 px-3.5 text-right">금액</th>
                        <th className="py-3 px-3.5">적요 (상세내용)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map((row) => (
                        <tr key={row.originalIdx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3.5 font-mono text-slate-400 text-2xs">
                            {row.originalIdx + 1}
                          </td>

                          {/* Team Selector */}
                          <td className="py-2 px-3">
                            <select
                              value={row.assignedTeam || '본부공통'}
                              onChange={(e) => handleMoveItemToTeam(row.originalIdx, e.target.value)}
                              className={`text-2xs font-bold px-2.5 py-1 rounded-full border-0 outline-none cursor-pointer ${
                                row.assignedTeam === '디지털지원'
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : row.assignedTeam === '본부공통'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-[#E6F7F4] text-[#00AE95]'
                              }`}
                            >
                              {LEISURE_OFFICIAL_TEAMS.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                              <option value="본부공통">본부공통</option>
                            </select>
                          </td>

                          {/* Client / Venue */}
                          <td className="py-2.5 px-3.5 font-semibold text-slate-800 text-2xs">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00AE95]" />
                              <span>{row.clientName || row.assignedVenue || row.rawDepartment}</span>
                            </div>
                            <div className="font-mono text-3xs text-slate-400 pl-3">
                              {row.assignedVenue} ({row.rawDepartment})
                            </div>
                          </td>

                          {/* Friendly Category */}
                          <td className="py-2 px-3">
                            <select
                              value={row.friendlyCategory || '기타 운영 지출'}
                              onChange={(e) => handleMoveItemToCategory(row.originalIdx, e.target.value)}
                              className="text-2xs font-bold px-2.5 py-1 rounded-xl border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer max-w-[190px] truncate hover:border-[#00AE95]"
                            >
                              {FRIENDLY_EXPENSE_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {CATEGORY_META[c]?.icon || '🏷️'} {c}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Account */}
                          <td className="py-2.5 px-3.5 font-medium text-slate-800">
                            <div className="font-semibold text-slate-800">{row.accountName}</div>
                            <div className="font-mono text-3xs text-slate-400">{row.accountCode}</div>
                          </td>

                          {/* Amount */}
                          <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-800">
                            {formatNumber(row.amount)}
                          </td>

                          {/* Memo */}
                          <td className="py-2.5 px-3.5 text-2xs text-slate-500 max-w-sm truncate" title={row.memo}>
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
        )}
      </div>
    </div>
  );
}
