"use client";

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import ExpenseKanbanBoard from '@/components/ExpenseKanbanBoard';
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
  Columns,
  Trash2,
  Database
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
import { CATEGORY_META } from '@/lib/expenseMeta';

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

  // DB 연동 및 매핑 변경 감지 상태
  const [dbLoadedCount, setDbLoadedCount] = useState<number>(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

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
      } else {
        setParsedRows([]);
        setDbLoadedCount(0);
        setHasUnsavedChanges(false);
        setSaveSuccess(false);
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
    fetchSavedMonthlyExpenses(yearMonth);
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

        const rawHeaderRow = data[headerRowIdx] || [];
        const headers = Array.from(rawHeaderRow).map((h: any) => (h != null ? String(h).trim() : ''));
        const codeIdx = headers.findIndex((h) => (h || '').includes('코드') && !(h || '').includes('거래처'));
        const nameIdx = headers.findIndex((h) => (h || '').includes('과목') || (h || '').includes('계정명') || (h || '').includes('차변계정과목'));
        const macroIdx = headers.findIndex((h) => (h || '').includes('비목') || (h || '').includes('대분류') || (h || '').includes('구분') || (h || '').includes('중분류'));
        const projectIdx = headers.findIndex((h) => (h || '').includes('프로젝트') || (h || '').includes('영업장') || (h || '').includes('업장'));
        const deptIdx = headers.findIndex((h) => (h || '').includes('부서') || (h || '').includes('사용부서') || (h || '').includes('팀'));
        let amountIdx = headers.findIndex((h) => (h || '').includes('금액') || (h || '').includes('차변금액') || (h || '').includes('실적') || (h || '').includes('비용') || (h || '').includes('차변') || (h || '').includes('공급가액'));
        const memoIdx = headers.findIndex((h) => (h || '').includes('적요') || (h || '').includes('내용') || (h || '').includes('비고'));
        const clientIdx = headers.findIndex((h) => (h || '').includes('거래처명') || (h || '').includes('거래처') || (h || '').includes('업체'));
        let dateIdx = headers.findIndex((h) => (h || '').includes('일자') || (h || '').includes('날짜') || (h || '').includes('일시'));

        // 스마트 금액 컬럼 감지: 헤더가 비어있거나 '금액' 명칭이 없는 경우 데이터 행 분석
        if (amountIdx === -1) {
          const colScores: Record<number, { count: number; min: number; max: number; isInteger: boolean }> = {};
          const sampleLimit = Math.min(data.length, headerRowIdx + 50);
          for (let r = headerRowIdx + 1; r < sampleLimit; r++) {
            const row = data[r];
            if (!row || !Array.isArray(row)) continue;
            for (let c = 0; c < row.length; c++) {
              const val = row[c];
              let num: number | null = null;
              if (typeof val === 'number') num = val;
              else if (typeof val === 'string') {
                const clean = val.replace(/,/g, '').trim();
                if (/^-?\d+(\.\d+)?$/.test(clean)) num = parseFloat(clean);
              }
              if (num !== null && !isNaN(num) && num !== 0) {
                if (!colScores[c]) colScores[c] = { count: 0, min: num, max: num, isInteger: true };
                colScores[c].count++;
                colScores[c].min = Math.min(colScores[c].min, num);
                colScores[c].max = Math.max(colScores[c].max, num);
                if (!Number.isInteger(num)) colScores[c].isInteger = false;
              }
            }
          }

          let bestCol = -1;
          let maxScore = 0;
          for (const [colStr, stat] of Object.entries(colScores)) {
            const c = Number(colStr);
            const isDateSerial = !stat.isInteger && stat.min >= 40000 && stat.max <= 55000;
            if (!isDateSerial && stat.count > maxScore) {
              maxScore = stat.count;
              bestCol = c;
            }
          }
          if (bestCol !== -1 && maxScore >= 2) {
            amountIdx = bestCol;
          }
        }

        // 스마트 일자 컬럼 감지
        if (dateIdx === -1) {
          for (let c = 0; c < Math.min(headers.length, 6); c++) {
            if (c === amountIdx || c === nameIdx || c === deptIdx) continue;
            const sampleVal = data[headerRowIdx + 1]?.[c];
            if (typeof sampleVal === 'number' && sampleVal >= 40000 && sampleVal <= 55000) {
              dateIdx = c;
              break;
            } else if (typeof sampleVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sampleVal)) {
              dateIdx = c;
              break;
            }
          }
        }

        // 전사 원장 시트 감지: 사용부서 컬럼에 '골프', '리조트', '경영지원' 등 타 본부가 섞여 있는지 검사
        const hasMultipleDivisions = (() => {
          if (deptIdx === -1) return false;
          let otherDivCount = 0;
          for (let i = headerRowIdx + 1; i < Math.min(data.length, headerRowIdx + 100); i++) {
            const d = String(data[i]?.[deptIdx] || '');
            if (
              d.includes('골프') || d.includes('리조트') || d.includes('경영지원') || 
              d.includes('지원본부') || d.includes('개발') || d.includes('세일즈') ||
              d.includes('콘텐츠') || d === '공통'
            ) {
              otherDivCount++;
            }
          }
          return otherDivCount >= 3;
        })();

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
          const memo = memoIdx !== -1 ? String(row[memoIdx] || '').trim() : '';

          // 소계, 합계, 총계, 누계 등 요약 행 자동 필터링 (중복 뻥튀기 원천 방어)
          const isSummaryRow = 
            rawName.includes('소계') || rawName.includes('합계') || rawName.includes('총계') || rawName.includes('누계') ||
            rawCode.includes('소계') || rawCode.includes('합계') || rawCode.includes('총계') ||
            memo.includes('합계') || memo.includes('월계');
          if (isSummaryRow) continue;

          const rawProject = projectIdx !== -1 ? String(row[projectIdx] || '').trim() : '';
          const rawDept = deptIdx !== -1 ? String(row[deptIdx] || '').trim() : '';
          const rawClient = clientIdx !== -1 ? String(row[clientIdx] || '').trim() : '';

          // 일자 변환
          let date = '';
          if (dateIdx !== -1) {
            const dVal = row[dateIdx];
            if (typeof dVal === 'number' && dVal > 40000 && dVal < 55000) {
              const jsDate = new Date((dVal - 25569) * 86400 * 1000);
              date = jsDate.toISOString().substring(0, 10);
            } else if (typeof dVal === 'string') {
              const m = dVal.match(/\d{4}-\d{2}-\d{2}/);
              if (m) date = m[0];
            }
          }

          // 전사 원장 시트인 경우 레저사업본부 및 레저 업장 데이터만 필터링 (Bell-operation 특수 규칙 절대 준수)
          if (hasMultipleDivisions) {
            const isOtherDivision = 
              rawDept.includes('골프') || rawDept.includes('리조트') || rawDept.includes('경영지원') || 
              rawDept.includes('지원본부') || rawDept.includes('개발') || rawDept.includes('세일즈') || 
              rawDept.includes('콘텐츠') || rawDept.includes('골재') || rawDept === '공통';
            
            const combined = `${rawDept} ${rawProject} ${memo}`.toLowerCase();
            const isLeisureKeyword = 
              rawDept.includes('레저') || 
              combined.includes('목장') || 
              combined.includes('미디어') || 
              combined.includes('카트') || 
              combined.includes('마리나') || 
              combined.includes('썰매') ||
              combined.includes('루지') ||
              combined.includes('얼룩말') ||
              combined.includes('액티비티') ||
              combined.includes('디지털');

            if (isOtherDivision && !isLeisureKeyword) continue;
          }

          const effectiveDept = rawProject || rawDept || '본부공통';
          const { team: assignedTeam, venue: assignedVenue } = linkVenueAndTeam(rawProject, rawDept, memo);
          const assignedCategory = inferAccountCategory(rawCode, rawName);
          const { category: friendlyCategory } = makeFriendlyCategory(rawCode, rawName, memo, rawClient);
          const isDepreciation = rawName === '감가상각비' || rawName.includes('감가상각');

          rows.push({
            date,
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
            isDepreciation,
          });
        }

        // 기존 전표가 있는 경우: 덮어쓰기 vs 추가 병합 선택
        if (parsedRows.length > 0) {
          const replaceChoice = window.confirm(
            `현재 화면에 이미 ${parsedRows.length}건의 전표가 있습니다.\n\n[확인]을 누르면 새 엑셀 데이터로 '전체 교체'합니다.\n[취소]를 누르면 기존 전표 뒤에 '추가 병합'합니다.`
          );
          if (replaceChoice) {
            setParsedRows(rows);
          } else {
            setParsedRows((prev) => [...prev, ...rows]);
          }
        } else {
          setParsedRows(rows);
        }

        setHasUnsavedChanges(true);
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

      const newRows = json.rows || [];

      // 기존 전표가 있는 경우: 덮어쓰기 vs 추가 병합 선택
      if (parsedRows.length > 0) {
        const replaceChoice = window.confirm(
          `현재 화면에 이미 ${parsedRows.length}건의 전표가 있습니다.\n\n[확인]을 누르면 구글 시트 데이터로 '전체 교체'합니다.\n[취소]를 누르면 기존 전표 뒤에 '추가 병합'합니다.`
        );
        if (replaceChoice) {
          setParsedRows(newRows);
        } else {
          setParsedRows((prev) => [...prev, ...newRows]);
        }
      } else {
        setParsedRows(newRows);
      }

      setFile(null);
      setHasUnsavedChanges(true);
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
      return updated;
    });
    setSaveSuccess(false);
    setHasUnsavedChanges(true);
  };

  // 개별 전표 삭제
  const handleDeleteRow = (rowIdx: number) => {
    setParsedRows((prev) => prev.filter((_, idx) => idx !== rowIdx));
    setSaveSuccess(false);
    setHasUnsavedChanges(true);
  };

  // 선택한 정산월의 DB 저장 데이터 전체 삭제
  const handleDeleteMonthFromDB = async () => {
    const confirmed = window.confirm(
      `[${yearMonth}]월의 비용 및 검증 데이터를 DB에서 정말 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며 등록된 전표와 검증 이력이 모두 영구 삭제됩니다.`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/expenses/monthly?yearMonth=${yearMonth}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        alert(`[${yearMonth}]월 데이터가 정상 삭제되었습니다.`);
        setParsedRows([]);
        setFile(null);
        setDbLoadedCount(0);
        setHasUnsavedChanges(false);
        setSaveSuccess(false);
      } else {
        alert(`삭제 실패: ${json.error}`);
      }
    } catch (err: any) {
      alert(`삭제 중 네트워크 오류: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // DB 저장 핸들러 (수정된 매핑을 DB에 즉시 반영)
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
      {/* 1. 상단 히어로 배너 */}
      <div className="w-full bg-[#00AE95] rounded-b-2xl relative overflow-hidden text-white py-4 px-6 sm:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2.5 py-0.5 rounded-md bg-white/20 text-white text-3xs font-bold tracking-wider">
                비용 관리 · 매핑 센터
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>비용 전표 등록 및 4대 부서 매핑</span>
            </h1>
            <p className="text-xs text-white/90 mt-0.5">
              구글 스프레드시트 또는 엑셀 전표를 연동하여 4대 부서 및 친화형 비용 항목으로 정제합니다.
            </p>
          </div>

          {/* Month Selector & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-xs rounded-xl px-3 py-1.5 shadow-xs">
              <span className="text-2xs font-bold text-slate-500 uppercase">정산 월:</span>
              <input 
                type="month"
                value={yearMonth}
                onChange={(e) => setYearMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
              />
            </div>
            <button
              onClick={() => fetchSavedMonthlyExpenses(yearMonth)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              title="저장된 전표 데이터 다시 불러오기"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>DB 재조회</span>
            </button>
            {parsedRows.length > 0 ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleSaveToDB}
                  disabled={saving}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
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
                <button
                  onClick={() => {
                    if (window.confirm('화면의 전표 목록을 모두 비우시겠습니까?')) {
                      setParsedRows([]);
                      setFile(null);
                      setSaveSuccess(false);
                      setHasUnsavedChanges(false);
                    }
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-all cursor-pointer"
                  title="화면 목록 비우기"
                >
                  <Trash2 size={13} />
                  <span>화면 비우기</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleDeleteMonthFromDB}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-rose-500/90 text-white text-2xs font-bold transition-all cursor-pointer border border-white/20"
                title={`${yearMonth}월의 DB 저장 데이터 삭제`}
              >
                <Trash2 size={12} />
                <span>{yearMonth}월 저장 데이터 삭제</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6">
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
                  상단의 <strong>[수정된 매핑 DB 저장]</strong> 버튼을 클릭해야 데이터베이스에 최종 반영되어 손익 분석표에 동기화됩니다.
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
                  (아래 칸반 보드에서 부서 및 항목을 자유롭게 이동·재매핑할 수 있습니다)
                </span>
              </div>
            </div>
            <span className="text-3xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md shrink-0">
              DB 동기화 완료
            </span>
          </div>
        )}
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

        {/* 3. 통합 전표 칸반 보드 및 매핑 관리 컴포넌트 */}
        {parsedRows.length > 0 && (
          <ExpenseKanbanBoard
            yearMonth={yearMonth}
            onYearMonthChange={setYearMonth}
            initialExpenses={parsedRows}
            onExpensesChange={setParsedRows}
            titlePrefix="비용 등록 및 매핑"
          />
        )}
      </div>
    </div>
  );
}
