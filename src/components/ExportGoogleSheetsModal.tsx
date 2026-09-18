"use client";

import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  Calendar, 
  Layers, 
  Sparkles,
  Info,
  Table as TableIcon
} from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

interface MonthSummary {
  yearMonth: string;
  monthLabel: string;
  count: number;
  totalAmount: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultMonth?: string; // e.g. '2026-08'
}

export default function ExportGoogleSheetsModal({ isOpen, onClose, defaultMonth }: Props) {
  const [loading, setLoading] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [summaryList, setSummaryList] = useState<MonthSummary[]>([]);
  const [groupedExpenses, setGroupedExpenses] = useState<Record<string, any[]>>({});
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
  const [copiedMonth, setCopiedMonth] = useState<string | null>(null);

  // 모달이 열릴 때 데이터 로드
  useEffect(() => {
    if (!isOpen) return;

    if (defaultMonth) {
      setSelectedMonth(defaultMonth);
    }

    const loadExportData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/expenses/export?format=json');
        const json = await res.json();
        if (json.success) {
          setSummaryList(json.summary || []);
          setGroupedExpenses(json.groupedExpenses || {});
          if (json.months && json.months.length > 0 && !defaultMonth) {
            setSelectedMonth(json.months[json.months.length - 1]);
          }
        }
      } catch (err) {
        console.error('Failed to load export data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadExportData();
  }, [isOpen, defaultMonth]);

  if (!isOpen) return null;

  // 1. 전체 통합 엑셀/구글시트 다운로드 핸들러
  const handleDownloadFullWorkbook = () => {
    setDownloading(true);
    try {
      const downloadUrl = '/api/expenses/export?format=xlsx';
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = '벨포레_레져본부_월별_비용전표_정리(1월-8월).xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setTimeout(() => setDownloading(false), 1500);
    }
  };

  // 2. 선택한 월 클립보드 TSV 복사 핸들러 (구글 시트 셀에 Ctrl+V 즉시 반영)
  const handleCopyMonthToClipboard = (ym: string) => {
    const rows = ym === 'ALL' 
      ? Object.values(groupedExpenses).flat() 
      : (groupedExpenses[ym] || []);

    if (!rows || rows.length === 0) {
      alert('복사할 전표 데이터가 없습니다.');
      return;
    }

    // TSV 헤더
    const headers = [
      '일자',
      '정산월',
      '4대부서',
      '배정영업장',
      '회계계정코드',
      '회계계정과목',
      '대분류비목',
      '쉬운비용항목',
      '금액',
      '거래처명',
      '적요 / 내용',
      '전표구분',
      '안분기간',
      '특이사항',
    ];

    const lines: string[] = [headers.join('\t')];

    let totalAmt = 0;
    rows.forEach((r) => {
      const amt = Number(r.amount) || 0;
      totalAmt += amt;

      const oneOffText = r.isOneOff ? (r.oneOffLabel || '1회성특별비용') : '정기운영비';
      const periodText = (r.periodStart && r.periodEnd) ? `${r.periodStart} ~ ${r.periodEnd}` : '-';
      const noteText = r.isDepreciation ? '감가상각비(손익제외)' : r.isOutsourced ? '외주위탁' : '일반직과';

      const line = [
        r.date || '-',
        r.yearMonth || ym,
        r.assignedTeam || '본부공통',
        r.assignedVenue || '-',
        r.accountCode || '-',
        r.accountName || '미분류',
        r.macroCategory || r.assignedCategory || '기타',
        r.friendlyCategory || '미분류항목',
        amt,
        (r.clientName || '-').replace(/\t|\r?\n/g, ' '),
        (r.memo || '-').replace(/\t|\r?\n/g, ' '),
        oneOffText,
        periodText,
        noteText,
      ];
      lines.push(line.join('\t'));
    });

    // 최하단 합계 행
    const label = ym === 'ALL' ? '[전체 총 합계]' : `[${Number(ym.split('-')[1])}월 총 합계]`;
    lines.push([
      label,
      `${rows.length}건`,
      '-',
      '-',
      '-',
      '-',
      '-',
      '총 합계',
      totalAmt,
      '-',
      '-',
      '-',
      '-',
      '-',
    ].join('\t'));

    const tsvContent = lines.join('\r\n');

    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopiedMonth(ym);
      setTimeout(() => setCopiedMonth(null), 3000);
    }).catch((err) => {
      console.error('Clipboard copy error:', err);
      alert('클립보드 복사 권한을 확인해주세요.');
    });
  };

  const totalAllCount = summaryList.reduce((s, m) => s + m.count, 0);
  const totalAllAmount = summaryList.reduce((s, m) => s + m.totalAmount, 0);
  const selectedInfo = summaryList.find((m) => m.yearMonth === selectedMonth);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-[#00AE95] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-xs">
              <FileSpreadsheet size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                비용 전표 구글 스프레드시트 · 엑셀 내보내기
              </h2>
              <p className="text-xs text-white/90">
                달별 탭(1월, 2월, 3월...)으로 분리된 스프레드시트를 생성하거나 클립보드로 복사합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
            title="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Main Action 1: 전체 워크북 다운로드 */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-3xs font-extrabold tracking-wider">
                <Sparkles size={11} />
                <span>추천 방식 (가장 간편함)</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                월별 탭 통합 파일 다운로드 (.xlsx)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-lg">
                구글 드라이브나 <strong className="text-emerald-700 font-semibold">구글 스프레드시트(sheets.new)</strong>에서 열면 <span className="font-mono font-bold text-slate-800">[연간 총괄 요약]</span> 및 <span className="font-mono font-bold text-slate-800">[1월] ~ [8월]</span> 탭이 완벽히 분리되어 즉시 생성됩니다.
              </p>
              <div className="flex items-center gap-3 pt-1 text-2xs text-slate-500 font-medium font-mono">
                <span>총 8개 시트 탭</span>
                <span>•</span>
                <span>총 {formatNumber(totalAllCount)}건 전표</span>
                <span>•</span>
                <span className="text-emerald-700 font-bold">{formatNumber(totalAllAmount)}원</span>
              </div>
            </div>

            <button
              onClick={handleDownloadFullWorkbook}
              disabled={downloading || loading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0 disabled:opacity-50 active:scale-95"
            >
              <Download size={16} className={downloading ? 'animate-bounce' : ''} />
              <span>{downloading ? '파일 생성 중...' : '통합 파일 다운로드'}</span>
            </button>
          </div>

          {/* Main Action 2: 달별 클립보드 원클릭 복사 (구글 시트에 바로 붙여넣기용) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Copy size={15} className="text-[#00AE95]" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  구글 시트 직접 붙여넣기용 클립보드 복사 (Ctrl+V)
                </h3>
              </div>
              <span className="text-3xs text-slate-400">
                구글 시트 시트 탭의 A1 셀에 바로 붙여넣을 수 있습니다.
              </span>
            </div>

            {/* Month Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-slate-100 border border-slate-200">
              {summaryList.map((m) => {
                const isSelected = selectedMonth === m.yearMonth;
                return (
                  <button
                    key={m.yearMonth}
                    onClick={() => setSelectedMonth(m.yearMonth)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-[#00AE95] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <span>{m.monthLabel}</span>
                    <span className={`text-3xs font-mono px-1 rounded ${
                      isSelected ? 'bg-[#E6F7F4] text-[#00AE95]' : 'text-slate-400'
                    }`}>
                      {m.count}건
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => setSelectedMonth('ALL')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedMonth === 'ALL'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>전체(누계)</span>
                <span className="text-3xs font-mono px-1 text-slate-300">
                  {totalAllCount}건
                </span>
              </button>
            </div>

            {/* Selected Month Action Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {selectedMonth === 'ALL' ? '전체 기간 (1월~8월 누계)' : `${selectedInfo?.monthLabel || selectedMonth} 정산 전표`}
                  </span>
                  <span className="text-2xs font-mono font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">
                    {selectedMonth === 'ALL' ? totalAllCount : selectedInfo?.count || 0}건
                  </span>
                </div>
                <div className="text-sm font-mono font-black text-[#00AE95]">
                  {formatNumber(selectedMonth === 'ALL' ? totalAllAmount : selectedInfo?.totalAmount || 0)}원
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopyMonthToClipboard(selectedMonth)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 ${
                    copiedMonth === selectedMonth
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {copiedMonth === selectedMonth ? (
                    <>
                      <Check size={14} className="text-white" />
                      <span>복사 완료! (Ctrl+V)</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>{selectedMonth === 'ALL' ? '전체 데이터 복사' : `${selectedInfo?.monthLabel || ''} 데이터 복사`}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts: 구글 스프레드시트 바로가기 링크 */}
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <ExternalLink size={13} className="text-[#00AE95]" />
              <span>구글 스프레드시트 바로가기</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <a
                href="https://sheets.new"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors font-medium group"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>새 구글 스프레드시트 열기 (sheets.new)</span>
                </div>
                <ExternalLink size={13} className="text-slate-400 group-hover:text-slate-700" />
              </a>

              <a
                href="https://docs.google.com/spreadsheets/d/1MYx45381kpFua8TG_EjLA95nLNCuHMreSTyybF3_ai0/edit?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors font-medium group"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                  <span>기존 벨포레 비용 관리 구글 시트</span>
                </div>
                <ExternalLink size={13} className="text-slate-400 group-hover:text-slate-700" />
              </a>
            </div>
          </div>

          {/* Guide Alert */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs leading-relaxed">
            <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>구글 시트 이용 팁:</strong> 다운로드하신 <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-3xs">.xlsx</code> 파일을 구글 드라이브에 드래그하거나, 새 구글 시트에서 <strong>[파일] → [열기] → [업로드]</strong>로 열면 1월부터 8월까지의 시트 탭이 그대로 보존되어 편리하게 조회·편집하실 수 있습니다.
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>벨포레 레져본부 경영관리 데이터 통제 시스템</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
}
