"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  RefreshCw, 
  Search,
  Building2,
  Laptop,
  Kanban,
  Table as TableIcon,
  Columns,
  Trash2,
  Database,
  Calendar,
  Layers,
  ArrowRight,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  SlidersHorizontal,
  CheckSquare,
  Square
} from 'lucide-react';
import { formatNumber } from '@/lib/formatters';
import { 
  RawExpenseRow, 
  allocateExpenses, 
  isDepreciationExpense,
  LEISURE_OFFICIAL_TEAMS, 
  FRIENDLY_EXPENSE_CATEGORIES, 
  FriendlyExpenseCategory,
  getFriendlyCategoryGroup,
  isOutsourcedExpense,
  classifyLaborLiving,
  detectOneOffExpense
} from '@/lib/financeEngine';
import { CATEGORY_META } from '@/lib/expenseMeta';

interface ExpenseKanbanBoardProps {
  yearMonth: string;
  onYearMonthChange?: (yearMonth: string) => void;
  availableMonths?: string[];
  onSaved?: () => void;
  titlePrefix?: string;
  initialExpenses?: RawExpenseRow[];
  onExpensesChange?: (expenses: RawExpenseRow[]) => void;
}

export default function ExpenseKanbanBoard({
  yearMonth,
  onYearMonthChange,
  availableMonths = [],
  onSaved,
  titlePrefix = "데이터 검증센터",
  initialExpenses,
  onExpensesChange,
}: ExpenseKanbanBoardProps) {
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

  // [신규] 원클릭 빠른 이동 모달 상태
  const [movingCardIdx, setMovingCardIdx] = useState<number | null>(null);

  // [신규] 다중 선택 및 일괄 이동 상태
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [batchTargetTeam, setBatchTargetTeam] = useState<string>('');
  const [batchTargetCategory, setBatchTargetCategory] = useState<string>('');

  // [신규] 칸반 보드 검색 및 파트 필터링 상태
  const [kanbanSearchKeyword, setKanbanSearchKeyword] = useState<string>('');
  const [kanbanPartFilter, setKanbanPartFilter] = useState<string>('ALL');

  // [신규] 가로 스크롤 컨테이너 Ref (항목별 칸반 16칼럼 탐색용)
  const categoryScrollRef = useRef<HTMLDivElement | null>(null);

  // [신규] 사용자 피드백 알림 토스트
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 표 필터 및 검색 상태
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [friendlyFilter, setFriendlyFilter] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // DB 연동 및 매핑 변경 감지 상태
  const [dbLoadedCount, setDbLoadedCount] = useState<number>(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // initialExpenses prop 변경 시 자동 반영
  useEffect(() => {
    if (initialExpenses && initialExpenses.length > 0) {
      setParsedRows(initialExpenses);
      setDbLoadedCount(initialExpenses.length);
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
    }
  }, [initialExpenses]);

  // DB에 저장된 해당 월의 비용 전표를 자동으로 불러오는 함수
  const fetchSavedMonthlyExpenses = async (ym: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses/monthly?yearMonth=${ym}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.expenses) && json.expenses.length > 0) {
        setParsedRows(json.expenses);
        setDbLoadedCount(json.expenses.length);
        setHasUnsavedChanges(false);
        setSaveSuccess(true);
        if (onExpensesChange) onExpensesChange(json.expenses);
      } else {
        setParsedRows([]);
        setDbLoadedCount(0);
        setHasUnsavedChanges(false);
        setSaveSuccess(false);
        if (onExpensesChange) onExpensesChange([]);
      }
    } catch (err) {
      console.error('Failed to load saved expenses from DB:', err);
    } finally {
      setLoading(false);
    }
  };

  // 정산 월 변경 시: 백엔드 SSOT 파트 실적 및 DB 기저장 전표 자동 동시 조회
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
    // initialExpenses가 명시적으로 없을 때만 DB에서 fetch
    if (!initialExpenses || initialExpenses.length === 0) {
      fetchSavedMonthlyExpenses(yearMonth);
    }
  }, [yearMonth]);

  // 실시간 안분 및 검증마스터 연산
  const { allocations, audit } = useMemo(() => {
    return allocateExpenses(parsedRows, livePartMetrics);
  }, [parsedRows, livePartMetrics]);

  // 1회성 특별 비용(선급금, 연간일시납 등) 감사 통계
  const oneOffStats = useMemo(() => {
    let count = 0;
    let sum = 0;
    parsedRows.forEach((r) => {
      if (r.isDepreciation || r.accountName === '감가상각비') return;
      if (isOutsourcedExpense(r)) return;
      const detected = detectOneOffExpense(r);
      if (detected) {
        count++;
        sum += (r.amount || 0);
      }
    });
    return {
      count,
      sum,
      normalizedAllocated: Math.max(0, (audit?.totalAllocatedSum || 0) - sum),
    };
  }, [parsedRows, audit]);

  // 파트 목록 자동 추출 (SSOT: partName || projectName)
  const availableParts = useMemo(() => {
    const partMap = new Map<string, number>();
    parsedRows.forEach((r) => {
      const p = (r.partName || r.projectName || '').trim();
      if (p) partMap.set(p, (partMap.get(p) || 0) + 1);
    });
    return Array.from(partMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [parsedRows]);

  // 칸반 보드 검색 및 파트 필터 검사기
  const matchesKanbanFilter = (r: RawExpenseRow) => {
    if (kanbanPartFilter !== 'ALL') {
      const p = (r.partName || r.projectName || '').trim();
      if (p !== kanbanPartFilter) return false;
    }
    if (kanbanSearchKeyword.trim()) {
      const kw = kanbanSearchKeyword.toLowerCase().trim();
      const match = 
        (r.accountName && r.accountName.toLowerCase().includes(kw)) ||
        (r.rawDepartment && r.rawDepartment.toLowerCase().includes(kw)) ||
        (r.clientName && r.clientName.toLowerCase().includes(kw)) ||
        (r.assignedVenue && r.assignedVenue.toLowerCase().includes(kw)) ||
        (r.memo && r.memo.toLowerCase().includes(kw)) ||
        (r.partName && r.partName.toLowerCase().includes(kw)) ||
        (r.projectName && r.projectName.toLowerCase().includes(kw)) ||
        (String(r.amount).includes(kw));
      if (!match) return false;
    }
    return true;
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
      if (onExpensesChange) onExpensesChange(updated);
      return updated;
    });
    showToast(`전표 항목이 [${newCategory}](으)로 변경되었습니다.`);
    setSaveSuccess(false);
    setHasUnsavedChanges(true);
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
      if (onExpensesChange) onExpensesChange(updated);
      return updated;
    });
    showToast(`전표가 [${newTeam}] 팀으로 이동되었습니다.`);
    setSaveSuccess(false);
    setHasUnsavedChanges(true);
  };

  // 개별 전표 삭제
  const handleDeleteRow = (rowIdx: number) => {
    if (!window.confirm('이 전표를 목록에서 삭제하시겠습니까?')) return;
    setParsedRows((prev) => {
      const next = prev.filter((_, idx) => idx !== rowIdx);
      if (onExpensesChange) onExpensesChange(next);
      return next;
    });
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      next.delete(rowIdx);
      return next;
    });
    showToast('전표가 삭제되었습니다.');
    setSaveSuccess(false);
    setHasUnsavedChanges(true);
  };

  // 다중 선택 토글
  const toggleSelectRow = (originalIdx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(originalIdx)) next.delete(originalIdx);
      else next.add(originalIdx);
      return next;
    });
  };

  // 현재 화면에 표시된 전표 전체 선택 / 해제
  const handleSelectAllVisible = (visibleIndices: number[]) => {
    if (visibleIndices.length === 0) return;
    if (visibleIndices.every((idx) => selectedIndices.has(idx))) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(visibleIndices));
    }
  };

  // 부서 일괄 이동
  const handleBatchMoveToTeam = () => {
    if (!batchTargetTeam || selectedIndices.size === 0) return;
    const count = selectedIndices.size;
    setParsedRows((prev) => {
      const updated = [...prev];
      selectedIndices.forEach((idx) => {
        if (updated[idx]) {
          updated[idx] = {
            ...updated[idx],
            assignedTeam: batchTargetTeam,
          };
        }
      });
      if (onExpensesChange) onExpensesChange(updated);
      return updated;
    });
    showToast(`${count}건의 전표가 [${batchTargetTeam}] 팀으로 일괄 이동되었습니다.`);
    setSelectedIndices(new Set());
    setBatchTargetTeam('');
    setSaveSuccess(false);
    setHasUnsavedChanges(true);
  };

  // 항목 일괄 이동
  const handleBatchMoveToCategory = () => {
    if (!batchTargetCategory || selectedIndices.size === 0) return;
    const count = selectedIndices.size;
    setParsedRows((prev) => {
      const updated = [...prev];
      selectedIndices.forEach((idx) => {
        if (updated[idx]) {
          let newMacro = updated[idx].assignedCategory;
          if (batchTargetCategory === '정규직 직원 급여' || batchTargetCategory === '아르바이트비 (알바비)') {
            newMacro = '인건비';
          } else if (batchTargetCategory === '직원 4대보험과 국민연금 (직원비용)' || batchTargetCategory === '직원 밥값과 간식비') {
            newMacro = '복리후생비';
          } else if (batchTargetCategory === '현수막·배너 만들기와 홍보비') {
            newMacro = '마케팅/판촉비';
          } else if (batchTargetCategory === '카드단말기·서비스 수수료' || batchTargetCategory === '정수기와 차량 빌린 돈') {
            newMacro = '지급수수료/임차료';
          }
          updated[idx] = {
            ...updated[idx],
            friendlyCategory: batchTargetCategory,
            assignedCategory: newMacro,
          };
        }
      });
      if (onExpensesChange) onExpensesChange(updated);
      return updated;
    });
    showToast(`${count}건의 전표가 [${batchTargetCategory}] 항목으로 일괄 이동되었습니다.`);
    setSelectedIndices(new Set());
    setBatchTargetCategory('');
    setSaveSuccess(false);
    setHasUnsavedChanges(true);
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
        setHasUnsavedChanges(false);
        setDbLoadedCount(parsedRows.length);
        showToast(`[${yearMonth}]월 데이터가 DB에 정상 저장되었습니다.`);
        if (onSaved) onSaved();
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

  const selectedSum = useMemo(() => {
    return Array.from(selectedIndices).reduce((sum, idx) => sum + (parsedRows[idx]?.amount || 0), 0);
  }, [selectedIndices, parsedRows]);

  // 항목별 칸반 컬럼 데이터 계산 (필터 연동)
  const categoryKanbanColumns = useMemo(() => {
    const cols = FRIENDLY_EXPENSE_CATEGORIES.map((cat) => {
      const items = parsedRows
        .map((r, originalIdx) => ({ ...r, originalIdx }))
        .filter((r) => {
          if (isDepreciationExpense(r)) return false;
          return (r.friendlyCategory || '기타 운영 지출') === cat && matchesKanbanFilter(r);
        });
      const subtotal = items.reduce((sum, r) => sum + r.amount, 0);
      const group = getFriendlyCategoryGroup(cat);
      return { category: cat, items, subtotal, group };
    });

    if (kanbanGroupFilter === 'ALL') return cols;
    return cols.filter((c) => c.group === kanbanGroupFilter);
  }, [parsedRows, kanbanGroupFilter, kanbanSearchKeyword, kanbanPartFilter]);

  // 부서별 칸반 컬럼 데이터 계산 (외주 위탁업체 분리 칼럼 + 감가상각 분리 칼럼 + 필터 연동)
  const teamKanbanColumns = useMemo(() => {
    const hasDepreciation = parsedRows.some((r) => isDepreciationExpense(r));
    const teams = hasDepreciation 
      ? [...LEISURE_OFFICIAL_TEAMS, '본부공통', '외주', '감가상각'] 
      : [...LEISURE_OFFICIAL_TEAMS, '본부공통', '외주'];

    return teams.map((teamName) => {
      const items = parsedRows
        .map((r, originalIdx) => ({ ...r, originalIdx }))
        .filter((r) => {
          if (!matchesKanbanFilter(r)) return false;
          const isDepr = isDepreciationExpense(r);
          
          if (teamName === '감가상각') {
            return isDepr;
          }
          // 감가상각비는 4대 직영팀/공통/외주 칼럼에 혼입되지 않도록 원천 차단
          if (isDepr) return false;

          if (teamName === '외주') {
            return r.assignedTeam === '외주' || r.assignedTeam === '외주위탁' || isOutsourcedExpense(r);
          }
          if (r.assignedTeam === '외주' || r.assignedTeam === '외주위탁' || isOutsourcedExpense(r)) {
            return false;
          }
          return (r.assignedTeam || '본부공통') === teamName;
        });
      const subtotal = items.reduce((sum, r) => sum + r.amount, 0);
      return { teamName, items, subtotal };
    });
  }, [parsedRows, kanbanSearchKeyword, kanbanPartFilter]);

  // 표 필터링된 전표 목록
  const filteredRows = useMemo(() => {
    return parsedRows.map((r, originalIdx) => ({ ...r, originalIdx }))
      .filter((r) => {
        const isOut = r.assignedTeam === '외주' || r.assignedTeam === '외주위탁' || isOutsourcedExpense(r);
        const matchTeam = teamFilter === 'ALL' || 
          (teamFilter === '외주' ? isOut : (!isOut && (r.assignedTeam || '본부공통') === teamFilter));
        const matchFriendly = friendlyFilter === 'ALL' || r.friendlyCategory === friendlyFilter;
        const matchKeyword = !searchKeyword || 
          (r.accountName && r.accountName.toLowerCase().includes(searchKeyword.toLowerCase())) ||
          (r.rawDepartment && r.rawDepartment.toLowerCase().includes(searchKeyword.toLowerCase())) ||
          (r.clientName && r.clientName.toLowerCase().includes(searchKeyword.toLowerCase())) ||
          (r.assignedVenue && r.assignedVenue.toLowerCase().includes(searchKeyword.toLowerCase())) ||
          (r.partName && r.partName.toLowerCase().includes(searchKeyword.toLowerCase())) ||
          (r.memo && r.memo.toLowerCase().includes(searchKeyword.toLowerCase()));
        return matchTeam && matchFriendly && matchKeyword;
      });
  }, [parsedRows, teamFilter, friendlyFilter, searchKeyword]);

  // 현재 모달에서 이동 작업 중인 단일 카드
  const activeMovingCard = movingCardIdx !== null && parsedRows[movingCardIdx] ? parsedRows[movingCardIdx] : null;

  return (
    <div id="expense-kanban-section" className="space-y-6 relative">
      {/* 토스트 알림 메시지 */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 size={16} className="text-[#00AE95]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. 상단 컨트롤 및 정산 월 바 */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00AE95]" />
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>{titlePrefix} 전표 칸반 보드 및 매핑 관리</span>
              <span className="text-xs font-mono font-bold text-[#00AE95] bg-[#E6F7F4] px-2 py-0.5 rounded-md">
                {yearMonth}
              </span>
            </h3>
          </div>
          <p className="text-2xs text-slate-500">
            카드 우측 상단의 <strong>[이동]</strong> 버튼 또는 <strong>드래그 & 드롭</strong>, <strong>체크박스 일괄 이동</strong>으로 부서와 항목을 손쉽게 변경할 수 있습니다.
          </p>
        </div>

        {/* 빠른 월 선택 및 저장/새로고침 버튼 */}
        <div className="flex flex-wrap items-center gap-2">
          {availableMonths.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
              <span className="text-3xs font-bold text-slate-400 px-1.5 uppercase">등록 월:</span>
              {availableMonths.slice(0, 4).map((ym) => (
                <button
                  key={ym}
                  onClick={() => onYearMonthChange && onYearMonthChange(ym)}
                  className={`px-2 py-1 rounded-lg text-2xs font-mono font-bold transition-all cursor-pointer ${
                    yearMonth === ym
                      ? 'bg-[#00AE95] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  {ym}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Calendar size={13} className="text-slate-400" />
            <input 
              type="month"
              value={yearMonth}
              onChange={(e) => onYearMonthChange && onYearMonthChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer font-mono"
            />
          </div>

          <button
            onClick={() => fetchSavedMonthlyExpenses(yearMonth)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            title="저장된 전표 데이터 다시 불러오기"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>DB 재조회</span>
          </button>

          {parsedRows.length > 0 && (
            <button
              onClick={handleSaveToDB}
              disabled={saving}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
                hasUnsavedChanges
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-900 ring-2 ring-amber-300 shadow-md animate-pulse'
                  : saveSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
              <span>
                {hasUnsavedChanges
                  ? '수정된 매핑 DB 저장'
                  : saveSuccess
                  ? '손익 데이터 저장 완료'
                  : '손익 데이터 저장'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 매핑 변경 알림 배너 */}
      {hasUnsavedChanges && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <AlertCircle size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                칸반 보드에서 부서/항목 매핑이 변경되었습니다.
              </h4>
              <p className="text-2xs text-amber-700 mt-0.5">
                우측 상단의 <strong>[수정된 매핑 DB 저장]</strong> 버튼을 클릭해야 데이터베이스에 최종 반영되어 검증 센터 및 손익 분석표에 동기화됩니다.
              </p>
            </div>
          </div>
          <button
            onClick={handleSaveToDB}
            disabled={saving}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs rounded-xl shadow-xs shrink-0 transition-all cursor-pointer"
          >
            {saving ? '저장 중...' : '지금 즉시 저장'}
          </button>
        </div>
      )}

      {/* DB 기저장 전표 로드 알림 배너 */}
      {!hasUnsavedChanges && dbLoadedCount > 0 && parsedRows.length > 0 && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Database size={15} />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-900">
                DB에 저장된 {yearMonth}월 전표 {dbLoadedCount.toLocaleString()}건이 정상 로드되었습니다.
              </span>
              <span className="text-2xs text-emerald-700 ml-2 hidden sm:inline">
                (카드 우측 상단의 [이동] 버튼 또는 드래그를 통해 부서 및 항목을 자유롭게 재매핑할 수 있습니다)
              </span>
            </div>
          </div>
          <span className="text-3xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md shrink-0">
            DB 동기화 완료
          </span>
        </div>
      )}

      {/* 전표 부재 시 Empty State */}
      {parsedRows.length === 0 && !loading && (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Database size={24} />
          </div>
          <h4 className="text-sm font-bold text-slate-700">
            [{yearMonth}]월에 저장된 전표 데이터가 없습니다.
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            상단에서 등록 이력이 있는 다른 정산 월을 선택하거나, 좌측 사이드바의 <strong>[비용 엑셀 등록]</strong> 메뉴에서 새 전표를 업로드해 주세요.
          </p>
        </div>
      )}

      {/* 2. 검증마스터 감사 리포트 배너 */}
      {parsedRows.length > 0 && (
        <div className={`p-4 rounded-2xl shadow-xs border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
          audit.isZeroVariance 
            ? 'bg-white border-l-4 border-l-[#00AE95] border-slate-200/80' 
            : 'bg-rose-50/80 border-l-4 border-l-rose-500 border-rose-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              audit.isZeroVariance ? 'bg-[#E6F7F4] text-[#00AE95]' : 'bg-rose-100 text-rose-600'
            }`}>
              {audit.isZeroVariance ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-2 text-slate-800">
                <span>정산 대조 결과:</span>
                <span className={`px-2 py-0.5 rounded-full text-2xs font-extrabold ${
                  audit.isZeroVariance ? 'bg-[#E6F7F4] text-[#00AE95]' : 'bg-rose-200 text-rose-800'
                }`}>
                  {audit.isZeroVariance ? '정상 일치 (오차 0원)' : '오차 발생 점검 요망'}
                </span>
              </div>
              <p className="text-2xs text-slate-500 mt-0.5">
                원천 전표 총액: <strong className="text-slate-800 font-mono">{formatNumber(audit.rawExcelSum || audit.totalExcelSum)}</strong>원
                {audit.depreciationSum && audit.depreciationSum > 0 ? (
                  <>
                    {' | '}감가상각 제외: <strong className="text-zinc-600 font-mono">{formatNumber(audit.depreciationSum)}</strong>원
                  </>
                ) : null}
                {audit.outsourcedSum !== 0 && (
                  <>
                    {' | '}외주 제외: <strong className="text-amber-600 font-mono">{formatNumber(audit.outsourcedSum)}</strong>원
                  </>
                )}
                {oneOffStats.count > 0 && (
                  <>
                    {' | '}✨ 1회성 특수 제외: <strong className="text-purple-700 font-mono">{formatNumber(oneOffStats.sum)}</strong>원 ({oneOffStats.count}건)
                    {' | '}정상 경상비: <strong className="text-emerald-700 font-mono">{formatNumber(oneOffStats.normalizedAllocated)}</strong>원
                  </>
                )}
                {' | '}직영 4대 부서 배부: <strong className="text-slate-800 font-mono">{formatNumber(audit.totalAllocatedSum)}</strong>원
                {' | '}단수 오차: <strong className="font-mono text-[#00AE95]">{formatNumber(audit.delta)}</strong>원
              </p>
            </div>
          </div>
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-2xs font-bold text-[#00AE95] bg-[#E6F7F4] px-3 py-1.5 rounded-lg shrink-0">
              <CheckCircle2 size={14} />
              데이터 저장 완료
            </span>
          )}
        </div>
      )}

      {/* 3. 레져본부 4대 부서 비용 배분 카드 */}
      {parsedRows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#00AE95]" />
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                레져본부 4대 부서 비용 배분 현황 ({yearMonth})
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
              const totalAllocated = audit?.totalAllocatedSum || 0;
              const sharePercent = totalAllocated > 0 ? (alloc.totalExpense / totalAllocated) * 100 : 0;

              return (
                <div 
                  key={teamName} 
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 relative overflow-hidden group space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isDigital ? (
                        <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                          <Laptop size={13} />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-[#E6F7F4] text-[#00AE95] flex items-center justify-center">
                          <Building2 size={13} />
                        </div>
                      )}
                      <span className="text-xs font-bold text-slate-800">{teamName}</span>
                    </div>
                    <span className={`text-3xs font-bold px-2 py-0.5 rounded-full ${
                      isDigital ? 'bg-indigo-100 text-indigo-700' : 'bg-[#E6F7F4] text-[#00AE95]'
                    }`}>
                      {sharePercent.toFixed(1)}%
                    </span>
                  </div>

                  <div className="text-xl font-bold font-mono text-slate-800">
                    {formatNumber(alloc.totalExpense)}
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-2xs text-slate-500 space-y-0.5">
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

      {/* 4. 메인 작업 영역: 칸반 보드 & 표 뷰어 */}
      {parsedRows.length > 0 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs relative overflow-hidden space-y-4">
          {/* 상단 컨트롤 바: 뷰어 전환 & 그룹 필터 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            {/* 뷰 모드 토글 버튼 */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('KANBAN_CATEGORY')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'KANBAN_CATEGORY'
                    ? 'bg-[#00AE95] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Kanban size={13} />
                <span>항목별 칸반 보드 (16대 비목)</span>
              </button>
              <button
                onClick={() => setViewMode('KANBAN_TEAM')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'KANBAN_TEAM'
                    ? 'bg-[#00AE95] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Columns size={13} />
                <span>부서별 칸반 보드 (4대팀 + 공통/외주)</span>
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'TABLE'
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon size={13} />
                <span>전표 원장 표</span>
              </button>
            </div>

            {/* 항목별 칸반 그룹 집중 필터 및 가로 스크롤 버튼 */}
            {viewMode === 'KANBAN_CATEGORY' && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-2xs font-bold text-slate-400 mr-1">항목 그룹:</span>
                  {(['ALL', '직원비용', '시설/운영비', '수수료/세금', '기타'] as const).map((grp) => (
                    <button
                      key={grp}
                      onClick={() => setKanbanGroupFilter(grp)}
                      className={`px-2.5 py-1 rounded-lg text-2xs font-semibold transition-all cursor-pointer ${
                        kanbanGroupFilter === grp
                          ? 'bg-[#00AE95] text-white shadow-xs font-bold'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {grp === 'ALL' ? '전체' : grp}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                  <button
                    type="button"
                    onClick={() => categoryScrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                    className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                    title="이전 칼럼 보기"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => categoryScrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                    className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                    title="다음 칼럼 보기"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* [핵심 개선] 칸반 전용 빠른 검색 & 파트별 집중 필터링 바 */}
          {viewMode !== 'TABLE' && (
            <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* 검색 인풋 */}
                <div className="relative flex-1 max-w-md">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="적요, 거래처, 업장명, 계정과목, 금액으로 카드 검색..."
                    value={kanbanSearchKeyword}
                    onChange={(e) => setKanbanSearchKeyword(e.target.value)}
                    className="w-full pl-9 pr-8 py-1.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00AE95] focus:ring-1 focus:ring-[#00AE95] transition-all"
                  />
                  {kanbanSearchKeyword && (
                    <button
                      onClick={() => setKanbanSearchKeyword('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* 다중 선택 일괄 작업 컨트롤 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const visibleIdxs = viewMode === 'KANBAN_CATEGORY' 
                        ? categoryKanbanColumns.flatMap(c => c.items.map(i => i.originalIdx))
                        : teamKanbanColumns.flatMap(t => t.items.map(i => i.originalIdx));
                      handleSelectAllVisible(visibleIdxs);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <CheckSquare size={13} className="text-[#00AE95]" />
                    <span>현재 보이는 전표 전체 선택</span>
                  </button>

                  {selectedIndices.size > 0 && (
                    <button
                      onClick={() => setSelectedIndices(new Set())}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                    >
                      선택 취소 ({selectedIndices.size})
                    </button>
                  )}
                </div>
              </div>

              {/* 파트(프로젝트명)별 원클릭 필터 칩 */}
              {availableParts.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-2xs">
                  <span className="font-bold text-slate-400 shrink-0 flex items-center gap-1">
                    <SlidersHorizontal size={12} />
                    <span>파트별 모아보기:</span>
                  </span>
                  <button
                    onClick={() => setKanbanPartFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                      kanbanPartFilter === 'ALL'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    전체 ({parsedRows.length})
                  </button>
                  {availableParts.map(([part, count]) => (
                    <button
                      key={part}
                      onClick={() => setKanbanPartFilter(part)}
                      className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                        kanbanPartFilter === part
                          ? 'bg-[#00AE95] text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {part} ({count})
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 1: 항목별 칸반 보드 (16대 비목 칼럼) */}
          {viewMode === 'KANBAN_CATEGORY' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-2xs text-slate-500 px-1">
                <span>
                  💡 <strong>쉬운 이동 팁:</strong> 카드의 <strong>[이동]</strong> 버튼을 누르면 팝업에서 원클릭으로 이동할 수 있으며, 상단 점선 영역으로 <strong>드래그 & 드롭</strong>도 가능합니다.
                </span>
                <span className="font-semibold">
                  칼럼: {categoryKanbanColumns.length}개 | 표시 중 전표: {categoryKanbanColumns.reduce((s, c) => s + c.items.length, 0)}건
                </span>
              </div>

              {/* 가로 스크롤 칸반 보드 */}
              <div 
                ref={categoryScrollRef}
                className="flex gap-3 overflow-x-auto pb-4 pt-1 custom-scrollbar min-h-[540px]"
              >
                {categoryKanbanColumns.map(({ category, items, subtotal }) => {
                  const meta = CATEGORY_META[category] || { icon: '🏷️', color: 'text-slate-700', bg: 'bg-slate-50', badgeBg: 'bg-slate-100 text-slate-800' };
                  const isDropTarget = dropTargetCategory === category;
                  const pct = totalExpenseSum > 0 ? (subtotal / totalExpenseSum) * 100 : 0;

                  return (
                    <div
                      key={category}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        setDropTargetCategory(category);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dropTargetCategory !== category) setDropTargetCategory(category);
                      }}
                      onDragLeave={(e) => {
                        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
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
                      className={`flex-shrink-0 w-64 sm:w-72 rounded-2xl transition-all flex flex-col max-h-[640px] border ${
                        isDropTarget 
                          ? 'bg-[#E6F7F4]/90 border-[#00AE95] shadow-md ring-2 ring-[#00AE95]/30' 
                          : 'bg-slate-50/70 border-slate-200/70 shadow-xs'
                      }`}
                    >
                      {/* 칼럼 헤더 */}
                      <div className="p-3 bg-white rounded-t-2xl border-b border-slate-100 space-y-1 sticky top-0 z-10 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-sm">{meta.icon}</span>
                            <h4 className={`text-xs font-bold truncate ${meta.color}`} title={category}>
                              {category}
                            </h4>
                          </div>
                          <span className={`text-3xs font-bold px-1.5 py-0.5 rounded-full shrink-0 ${meta.badgeBg}`}>
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
                      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
                        {/* [개선] 드래그 중일 때 최상단 전용 원클릭 드롭 존 */}
                        {draggedIdx !== null && (
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              setDropTargetCategory(category);
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
                            className={`p-2.5 rounded-xl border-2 border-dashed flex items-center justify-center gap-1.5 text-2xs font-bold transition-all ${
                              isDropTarget 
                                ? 'border-[#00AE95] bg-[#E6F7F4] text-[#00AE95] shadow-xs' 
                                : 'border-slate-300 bg-white/80 text-slate-500 hover:border-[#00AE95] hover:text-[#00AE95]'
                            }`}
                          >
                            <ArrowRight size={13} className="rotate-90 text-[#00AE95]" />
                            <span>여기로 놓아서 [{category}] 이동</span>
                          </div>
                        )}

                        {items.length === 0 ? (
                          <div className="h-28 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-center p-3 text-2xs text-slate-400">
                            {draggedIdx !== null ? '여기로 드롭하여 배치하세요' : '해당 항목의 전표가 없습니다'}
                          </div>
                        ) : (
                          items.map((item) => {
                            const isSelected = selectedIndices.has(item.originalIdx);
                            return (
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
                                className={`p-3 bg-white rounded-xl shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing space-y-1.5 border relative overflow-hidden group ${
                                  isSelected 
                                    ? 'border-[#00AE95] ring-2 ring-[#00AE95]/30 bg-[#E6F7F4]/20' 
                                    : 'border-slate-200/80'
                                } ${draggedIdx === item.originalIdx ? 'opacity-40 ring-2 ring-[#00AE95]' : ''}`}
                              >
                                {/* Card Header: Checkbox + Amount + Quick Move Button */}
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        toggleSelectRow(item.originalIdx);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-[#00AE95] focus:ring-[#00AE95] cursor-pointer"
                                      title="일괄 이동을 위해 선택"
                                    />
                                    <div className="text-xs font-bold font-mono text-slate-900">
                                      {formatNumber(item.amount)}
                                    </div>
                                  </div>

                                  {/* 원클릭 빠른 이동 모달 트리거 */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMovingCardIdx(item.originalIdx);
                                    }}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#E6F7F4] hover:bg-[#00AE95] text-[#00AE95] hover:text-white text-3xs font-bold transition-all cursor-pointer shadow-2xs shrink-0"
                                    title="다른 부서 또는 항목으로 원클릭 이동"
                                  >
                                    <ArrowRightLeft size={11} />
                                    <span>이동</span>
                                  </button>
                                </div>

                                {/* Part & Team Tag & Labor/Living Badge */}
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-3xs font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 truncate max-w-[90px]" title={item.partName || item.projectName}>
                                    🏷️ {item.partName || item.projectName || '미지정'}
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {(() => {
                                      const lc = classifyLaborLiving(item);
                                      const oneOff = detectOneOffExpense(item);
                                      return (
                                        <div className="flex items-center gap-1">
                                          {oneOff && (
                                            <span className={`text-3xs font-extrabold px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 ${oneOff.badgeColor}`}>
                                              <span>✨</span>
                                              <span>{oneOff.oneOffLabel}</span>
                                            </span>
                                          )}
                                          <span className={`text-3xs font-semibold px-1.5 py-0.5 rounded-full border ${lc.badgeColor}`}>
                                            {lc.badgeLabel}
                                          </span>
                                        </div>
                                      );
                                    })()}
                                    <span className={`text-3xs font-bold px-1.5 py-0.5 rounded-full ${
                                      item.assignedTeam === '디지털지원'
                                        ? 'bg-indigo-100 text-indigo-700'
                                        : item.assignedTeam === '본부공통'
                                        ? 'bg-slate-100 text-slate-600'
                                        : item.assignedTeam === '외주'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-[#E6F7F4] text-[#00AE95]'
                                    }`}>
                                      {item.assignedTeam}
                                    </span>
                                  </div>
                                </div>

                                {/* Client / Dept */}
                                <div className="text-xs font-medium text-slate-800 truncate" title={item.clientName || item.rawDepartment}>
                                  🏢 {item.clientName ? `${item.clientName} (${item.rawDepartment})` : item.rawDepartment}
                                </div>

                                {/* Account & Venue */}
                                <div className="flex items-center justify-between text-3xs text-slate-500 pt-1 border-t border-slate-100">
                                  <span className="font-mono text-slate-600 truncate max-w-[120px]" title={item.accountName}>
                                    {item.accountName}
                                  </span>
                                  <span className="text-slate-400 truncate max-w-[90px]" title={item.assignedVenue}>
                                    📍 {item.assignedVenue || '공통'}
                                  </span>
                                </div>

                                {/* Memo */}
                                {item.memo && (
                                  <div className="text-3xs text-slate-600 bg-slate-50 px-2 py-1.5 rounded-lg whitespace-normal break-words leading-snug" title={item.memo}>
                                    📝 {item.memo}
                                  </div>
                                )}

                                {/* Bottom Delete & Approval No */}
                                <div className="pt-0.5 flex items-center justify-between text-3xs text-slate-400">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRow(item.originalIdx)}
                                    className="text-slate-300 hover:text-rose-600 p-0.5 rounded hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                                    title="이 전표 삭제"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                  <span className="text-slate-400 font-mono text-3xs">
                                    #{item.approvalNo || item.originalIdx + 1}
                                  </span>
                                </div>
                              </div>
                            );
                          })
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
                  💡 <strong>부서 이동:</strong> 카드의 <strong>[이동]</strong> 버튼을 누르면 팝업에서 원하는 부서로 바로 이동되며, 원하는 팀 칼럼으로 <strong>드래그 & 드롭</strong>도 가능합니다.
                </span>
                <span className="font-semibold">
                  4대 팀 + 본부 공통 + 외주 위탁
                </span>
              </div>

              {/* 6~7-Column Grid for Teams (4대 직영팀 + 본부공통 + 외주 + 감가상각) */}
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${teamKanbanColumns.length > 6 ? 'xl:grid-cols-4 2xl:grid-cols-7' : 'xl:grid-cols-6'} gap-3.5 min-h-[500px]`}>
                {teamKanbanColumns.map(({ teamName, items, subtotal }) => {
                  const isDigital = teamName === '디지털지원';
                  const isCommon = teamName === '본부공통';
                  const isOutsourced = teamName === '외주';
                  const isDepreciation = teamName === '감가상각';
                  const isDropTarget = dropTargetTeam === teamName;

                  return (
                    <div
                      key={teamName}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        setDropTargetTeam(teamName);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dropTargetTeam !== teamName) setDropTargetTeam(teamName);
                      }}
                      onDragLeave={(e) => {
                        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
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
                      className={`rounded-2xl transition-all flex flex-col max-h-[640px] border ${
                        isDropTarget 
                          ? 'bg-[#E6F7F4]/90 border-[#00AE95] shadow-md ring-2 ring-[#00AE95]/30' 
                          : isOutsourced
                          ? 'bg-amber-50/50 border-amber-200/80 shadow-xs'
                          : isDepreciation
                          ? 'bg-zinc-100/60 border-zinc-300/80 shadow-xs'
                          : 'bg-slate-50/70 border-slate-200/80 shadow-xs'
                      }`}
                    >
                      {/* Column Header */}
                      <div className="p-3 bg-white rounded-t-2xl shadow-xs space-y-1 sticky top-0 z-10 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            {isDigital ? (
                              <Laptop size={14} className="text-indigo-600" />
                            ) : isOutsourced ? (
                              <Layers size={14} className="text-amber-600" />
                            ) : isDepreciation ? (
                              <Landmark size={14} className="text-zinc-500" />
                            ) : (
                              <Building2 size={14} className="text-[#00AE95]" />
                            )}
                            <span>{teamName}</span>
                          </h4>
                          <span className={`text-3xs font-bold px-1.5 py-0.5 rounded-md ${
                            isOutsourced 
                              ? 'bg-amber-100 text-amber-800' 
                              : isDepreciation 
                              ? 'bg-zinc-200 text-zinc-700' 
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {items.length}건
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-2xs pt-1 border-t border-slate-100">
                          <span className={`font-mono font-bold text-xs ${
                            isOutsourced ? 'text-amber-700' : isDepreciation ? 'text-zinc-600' : 'text-slate-900'
                          }`}>
                            {formatNumber(subtotal)}
                          </span>
                          <span className="text-3xs text-slate-400 font-medium">
                            {isDigital ? '자체 100%' : isCommon ? '공통 안분' : isOutsourced ? '손익 제외' : isDepreciation ? '자산 제외' : '직과'}
                          </span>
                        </div>
                      </div>

                      {/* Cards List */}
                      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
                        {/* 드래그 중일 때 최상단 전용 드롭 존 */}
                        {draggedIdx !== null && (
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              setDropTargetTeam(teamName);
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
                            className={`p-2.5 rounded-xl border-2 border-dashed flex items-center justify-center gap-1.5 text-2xs font-bold transition-all ${
                              isDropTarget 
                                ? 'border-[#00AE95] bg-[#E6F7F4] text-[#00AE95] shadow-xs' 
                                : 'border-slate-300 bg-white/80 text-slate-500 hover:border-[#00AE95] hover:text-[#00AE95]'
                            }`}
                          >
                            <ArrowRight size={13} className="rotate-90 text-[#00AE95]" />
                            <span>여기로 놓아서 [{teamName}] 이동</span>
                          </div>
                        )}

                        {items.length === 0 ? (
                          <div className="h-24 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-center p-3 text-2xs text-slate-400">
                            {draggedIdx !== null ? '여기로 드롭하여 배치하세요' : '배정된 전표가 없습니다'}
                          </div>
                        ) : (
                          items.map((item) => {
                            const isSelected = selectedIndices.has(item.originalIdx);
                            return (
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
                                className={`p-3 bg-white rounded-xl shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-1.5 border relative ${
                                  isSelected 
                                    ? 'border-[#00AE95] ring-2 ring-[#00AE95]/30 bg-[#E6F7F4]/20' 
                                    : 'border-slate-200/80'
                                } ${draggedIdx === item.originalIdx ? 'opacity-40 ring-2 ring-[#00AE95]' : ''}`}
                              >
                                {/* Card Header: Checkbox + Amount + Quick Move Button */}
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        toggleSelectRow(item.originalIdx);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-[#00AE95] focus:ring-[#00AE95] cursor-pointer"
                                      title="일괄 이동을 위해 선택"
                                    />
                                    <div className="text-xs font-bold font-mono text-slate-900">
                                      {formatNumber(item.amount)}
                                    </div>
                                  </div>

                                  {/* 원클릭 빠른 이동 모달 트리거 */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMovingCardIdx(item.originalIdx);
                                    }}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#E6F7F4] hover:bg-[#00AE95] text-[#00AE95] hover:text-white text-3xs font-bold transition-all cursor-pointer shadow-2xs shrink-0"
                                    title="다른 부서 또는 항목으로 원클릭 이동"
                                  >
                                    <ArrowRightLeft size={11} />
                                    <span>이동</span>
                                  </button>
                                </div>

                                {/* Part & Category & Labor/Living Badge */}
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-3xs font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 truncate max-w-[90px]" title={item.partName || item.projectName}>
                                    🏷️ {item.partName || item.projectName || '미지정'}
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {(() => {
                                      const lc = classifyLaborLiving(item);
                                      const oneOff = detectOneOffExpense(item);
                                      return (
                                        <div className="flex items-center gap-1">
                                          {oneOff && (
                                            <span className={`text-3xs font-extrabold px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 ${oneOff.badgeColor}`}>
                                              <span>✨</span>
                                              <span>{oneOff.oneOffLabel}</span>
                                            </span>
                                          )}
                                          <span className={`text-3xs font-semibold px-1.5 py-0.5 rounded-full border ${lc.badgeColor}`}>
                                            {lc.badgeLabel}
                                          </span>
                                        </div>
                                      );
                                    })()}
                                    <span className="text-3xs font-semibold text-[#00AE95] bg-[#E6F7F4] px-1.5 py-0.5 rounded-md truncate max-w-[90px]">
                                      {item.friendlyCategory || '기타'}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-xs font-medium text-slate-800 truncate" title={item.clientName || item.rawDepartment}>
                                  🏢 {item.clientName ? `${item.clientName} (${item.rawDepartment})` : item.rawDepartment}
                                </div>

                                {/* Memo / Account */}
                                <div className="text-3xs text-slate-600 bg-slate-50 px-2 py-1.5 rounded-lg whitespace-normal break-words leading-snug" title={item.memo || item.accountName}>
                                  📝 {item.memo || item.accountName}
                                </div>

                                {/* Bottom Row */}
                                <div className="pt-0.5 flex items-center justify-between text-3xs text-slate-400">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRow(item.originalIdx)}
                                    className="text-slate-300 hover:text-rose-600 p-0.5 rounded hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                                    title="이 전표 삭제"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                  <span className="text-slate-400 font-mono text-3xs">
                                    #{item.approvalNo || item.originalIdx + 1}
                                  </span>
                                </div>
                              </div>
                            );
                          })
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
                  <TableIcon size={16} className="text-[#00AE95]" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    전표 세부 원장 ({filteredRows.length}건 / {formatNumber(totalExpenseSum)}원)
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  {/* Team Filter */}
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="text-2xs font-medium px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="ALL">전체 부서</option>
                    {LEISURE_OFFICIAL_TEAMS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    <option value="본부공통">본부공통</option>
                    <option value="외주">외주 (손익제외)</option>
                  </select>

                  {/* Category Filter */}
                  <select
                    value={friendlyFilter}
                    onChange={(e) => setFriendlyFilter(e.target.value)}
                    className="text-2xs font-medium px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="ALL">전체 친화형 항목</option>
                    {FRIENDLY_EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  {/* Search Input */}
                  <div className="relative flex-1 md:w-64">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="적요, 거래처, 계정 검색..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00AE95]"
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-2xs">
                <table className="w-full text-left border-collapse text-2xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-2.5 px-3 w-10 text-center">선택</th>
                      <th className="py-2.5 px-3">결재번호</th>
                      <th className="py-2.5 px-3 text-right">차변금액</th>
                      <th className="py-2.5 px-3">계정과목</th>
                      <th className="py-2.5 px-3">친화형 비용 항목</th>
                      <th className="py-2.5 px-3">배정 부서 (팀)</th>
                      <th className="py-2.5 px-3">파트(프로젝트)</th>
                      <th className="py-2.5 px-3">거래처 / 사용부서</th>
                      <th className="py-2.5 px-4">적요</th>
                      <th className="py-2.5 px-3 text-center">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                          조건에 일치하는 전표 데이터가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((r) => {
                        const isSelected = selectedIndices.has(r.originalIdx);
                        return (
                          <tr key={r.originalIdx} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-[#E6F7F4]/20' : ''}`}>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectRow(r.originalIdx)}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-[#00AE95] focus:ring-[#00AE95] cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              {r.approvalNo || `#${r.originalIdx + 1}`}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                              {formatNumber(r.amount)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {r.accountName}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              <div className="flex flex-col gap-1">
                                <span>{r.friendlyCategory || '기타 운영 지출'}</span>
                                {(() => {
                                  const lc = classifyLaborLiving(r);
                                  const oneOff = detectOneOffExpense(r);
                                  return (
                                    <div className="flex flex-wrap items-center gap-1">
                                      <span className={`text-3xs font-semibold px-1.5 py-0.5 rounded-full border w-fit ${lc.badgeColor}`}>
                                        {lc.badgeLabel}
                                      </span>
                                      {oneOff && (
                                        <span className={`text-3xs font-extrabold px-1.5 py-0.5 rounded-full border w-fit flex items-center gap-0.5 ${oneOff.badgeColor}`}>
                                          <span>✨</span>
                                          <span>{oneOff.oneOffLabel}</span>
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-3xs ${
                                r.assignedTeam === '디지털지원'
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : r.assignedTeam === '본부공통'
                                  ? 'bg-slate-100 text-slate-600'
                                  : r.assignedTeam === '외주'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-[#E6F7F4] text-[#00AE95]'
                              }`}>
                                {r.assignedTeam}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-700">
                              {r.partName || r.projectName || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              {r.clientName ? `${r.clientName} (${r.rawDepartment})` : r.rawDepartment}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate" title={r.memo}>
                              {r.memo || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setMovingCardIdx(r.originalIdx)}
                                  className="p-1 text-[#00AE95] hover:bg-[#E6F7F4] rounded transition-colors cursor-pointer"
                                  title="빠른 이동"
                                >
                                  <ArrowRightLeft size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(r.originalIdx)}
                                  className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                  title="전표 삭제"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* [핵심 기능 1] 다중 선택 일괄 이동 플로팅 도크 */}
      {selectedIndices.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-4 max-w-4xl w-[95%] animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#00AE95] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {selectedIndices.size}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>선택된 전표 {selectedIndices.size}건</span>
                <span className="text-[#00AE95] font-mono">({formatNumber(selectedSum)}원)</span>
              </div>
              <p className="text-3xs text-slate-400">선택한 전표들을 다른 부서나 항목으로 한 번에 이동합니다.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 부서 일괄 이동 */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <select
                value={batchTargetTeam}
                onChange={(e) => setBatchTargetTeam(e.target.value)}
                className="text-xs bg-transparent text-slate-200 outline-none px-2 py-1 cursor-pointer font-medium"
              >
                <option value="" className="bg-slate-800 text-slate-400">부서 선택...</option>
                {LEISURE_OFFICIAL_TEAMS.map(t => <option key={t} value={t} className="bg-slate-800 text-white">{t}</option>)}
                <option value="본부공통" className="bg-slate-800 text-white">본부공통</option>
                <option value="외주" className="bg-slate-800 text-white">외주 (손익제외)</option>
              </select>
              <button
                onClick={handleBatchMoveToTeam}
                disabled={!batchTargetTeam}
                className="px-3 py-1 bg-[#00AE95] hover:bg-[#009681] text-white text-xs font-bold rounded-lg disabled:opacity-40 transition-all cursor-pointer shadow-xs"
              >
                부서 일괄 이동
              </button>
            </div>

            {/* 항목 일괄 이동 */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <select
                value={batchTargetCategory}
                onChange={(e) => setBatchTargetCategory(e.target.value)}
                className="text-xs bg-transparent text-slate-200 outline-none px-2 py-1 cursor-pointer max-w-[150px] truncate font-medium"
              >
                <option value="" className="bg-slate-800 text-slate-400">항목 선택...</option>
                {FRIENDLY_EXPENSE_CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-800 text-white">{c}</option>)}
              </select>
              <button
                onClick={handleBatchMoveToCategory}
                disabled={!batchTargetCategory}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg disabled:opacity-40 transition-all cursor-pointer shadow-xs"
              >
                항목 일괄 이동
              </button>
            </div>

            <button
              onClick={() => setSelectedIndices(new Set())}
              className="px-2.5 py-1 text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
            >
              선택 해제
            </button>
          </div>
        </div>
      )}

      {/* [핵심 기능 2] 원클릭 빠른 이동 모달 (팝업 다이얼로그) */}
      {activeMovingCard && movingCardIdx !== null && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setMovingCardIdx(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00AE95]" />
                  <h3 className="text-sm font-bold text-slate-900">전표 원클릭 즉시 이동</h3>
                </div>
                <p className="text-2xs text-slate-500">원하는 부서나 항목을 클릭하면 즉시 재배부됩니다.</p>
              </div>
              <button
                onClick={() => setMovingCardIdx(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Card Information */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold font-mono text-slate-900">
                  {formatNumber(activeMovingCard.amount)}원
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-3xs font-bold px-2 py-0.5 rounded-md bg-[#E6F7F4] text-[#00AE95]">
                    {activeMovingCard.assignedTeam}
                  </span>
                  <span className="text-3xs font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                    {activeMovingCard.friendlyCategory}
                  </span>
                </div>
              </div>
              <div className="text-xs font-semibold text-slate-800">
                🏢 {activeMovingCard.clientName ? `${activeMovingCard.clientName} (${activeMovingCard.rawDepartment})` : activeMovingCard.rawDepartment}
              </div>
              <div className="flex items-center justify-between text-2xs text-slate-500">
                <span>파트: <strong>{activeMovingCard.partName || activeMovingCard.projectName || '미지정'}</strong></span>
                <span>계정: <strong className="font-mono">{activeMovingCard.accountName}</strong></span>
              </div>
              {activeMovingCard.memo && (
                <div className="text-2xs text-slate-600 bg-white p-2 rounded-xl border border-slate-200/60 break-words">
                  📝 {activeMovingCard.memo}
                </div>
              )}
            </div>

            {/* 1. 부서(팀) 이동 버튼들 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 size={14} className="text-[#00AE95]" />
                <span>1. 소속 부서(팀) 변경 (원클릭)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { name: '액티비티', icon: '🏄', desc: '카트/썸머랜드/썰매' },
                  { name: '목장', icon: '🐑', desc: '목장체험/얼룩말카페' },
                  { name: '미디어아트센터', icon: '🎨', desc: '전시관/벨포레홀' },
                  { name: '디지털지원', icon: '💻', desc: '순수지원부서' },
                  { name: '본부공통', icon: '🏛️', desc: '본부 공통 경비' },
                  { name: '외주', icon: '🎪', desc: '놀이동산 등 (손익제외)' },
                  { name: '감가상각', icon: '🏢', desc: '비현금성 자산 (손익제외)' },
                ].map(({ name, icon, desc }) => {
                  const isCurrent = activeMovingCard.assignedTeam === name;
                  return (
                    <button
                      key={name}
                      onClick={() => {
                        handleMoveItemToTeam(movingCardIdx, name);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isCurrent
                          ? 'border-[#00AE95] bg-[#E6F7F4] ring-2 ring-[#00AE95]/30'
                          : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <span>{icon}</span>
                          <span>{name}</span>
                        </span>
                        {isCurrent && <Check size={13} className="text-[#00AE95]" />}
                      </div>
                      <span className="text-3xs text-slate-400 mt-1">{desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. 비용 항목(16대 친화형 비목) 이동 버튼들 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-600" />
                <span>2. 비용 항목(비목) 변경 (원클릭)</span>
              </label>
              
              {/* 그룹별 칩 */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {[
                  {
                    groupName: '👥 직원 관련 비용',
                    items: ['정규직 직원 급여', '아르바이트비 (알바비)', '직원 4대보험과 국민연금 (직원비용)', '직원 밥값과 간식비'],
                  },
                  {
                    groupName: '🛠️ 시설 / 운영 비용',
                    items: [
                      '고장난 시설과 기구 고치기',
                      '영업장에 필요한 물건 사기',
                      '전기세와 물·가스 요금',
                      '인터넷과 전화 요금',
                      '정수기와 차량 빌린 돈',
                      '리조트 차량 기름값과 정비',
                      '손님과 시설 안전 보험료',
                    ],
                  },
                  {
                    groupName: '💳 수수료 및 공과금',
                    items: ['카드단말기·서비스 수수료', '나라와 지자체에 낸 세금'],
                  },
                  {
                    groupName: '📢 홍보 및 기타',
                    items: ['현수막·배너 만들기와 홍보비', '좋은 일 돕기 (기부금)', '기타 운영 지출'],
                  },
                ].map(({ groupName, items }) => (
                  <div key={groupName} className="space-y-1">
                    <span className="text-3xs font-bold text-slate-400">{groupName}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((cat) => {
                        const isCurrent = activeMovingCard.friendlyCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => {
                              handleMoveItemToCategory(movingCardIdx, cat);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-2xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                              isCurrent
                                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {isCurrent && <Check size={11} />}
                            <span>{cat}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setMovingCardIdx(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
              >
                닫기 / 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
