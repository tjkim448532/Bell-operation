"use client";

import React, { useState } from 'react';
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
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import { formatNumber } from '@/lib/formatters';
import { RawExpenseRow, allocateExpenses, ValidationMasterReport } from '@/lib/financeEngine';

export default function ExpenseUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [yearMonth, setYearMonth] = useState<string>('2026-08');
  const [parsedRows, setParsedRows] = useState<RawExpenseRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<ValidationMasterReport | null>(null);
  const [allocations, setAllocations] = useState<any[]>([]);

  // 엑셀 파싱 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);
    setSaveSuccess(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
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
          const rowStr = data[i].join(' ');
          if (rowStr.includes('계정') || rowStr.includes('금액') || rowStr.includes('부서') || rowStr.includes('비목')) {
            headerRowIdx = i;
            break;
          }
        }

        const headers = data[headerRowIdx].map((h: any) => String(h || '').trim());
        const codeIdx = headers.findIndex((h) => h.includes('코드'));
        const nameIdx = headers.findIndex((h) => h.includes('과목') || h.includes('계정명'));
        const macroIdx = headers.findIndex((h) => h.includes('비목') || h.includes('대분류') || h.includes('구분'));
        const deptIdx = headers.findIndex((h) => h.includes('부서') || h.includes('팀') || h.includes('영업장'));
        const amountIdx = headers.findIndex((h) => h.includes('금액') || h.includes('실적') || h.includes('비용'));
        const memoIdx = headers.findIndex((h) => h.includes('적요') || h.includes('내용') || h.includes('비고'));

        const rows: RawExpenseRow[] = [];

        for (let i = headerRowIdx + 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;

          const rawAmt = row[amountIdx !== -1 ? amountIdx : 4];
          const cleanAmt = typeof rawAmt === 'number' 
            ? rawAmt 
            : parseFloat(String(rawAmt || '0').replace(/[^0-9.-]/g, ''));

          if (isNaN(cleanAmt) || cleanAmt === 0) continue;

          rows.push({
            accountCode: String(row[codeIdx !== -1 ? codeIdx : 0] || '50000').trim(),
            accountName: String(row[nameIdx !== -1 ? nameIdx : 1] || '일반운영비').trim(),
            macroCategory: String(row[macroIdx !== -1 ? macroIdx : 2] || '일반경비').trim(),
            rawDepartment: String(row[deptIdx !== -1 ? deptIdx : 3] || '레저본부공통').trim(),
            amount: Math.round(cleanAmt),
            memo: memoIdx !== -1 ? String(row[memoIdx] || '').trim() : '',
          });
        }

        setParsedRows(rows);

        // 파트별 비용 안분 및 검증마스터 즉시 실행
        const defaultMetrics = [
          { partName: '액티비티', revenue: 120000000, visitors: 6500 },
          { partName: '목장', revenue: 85000000, visitors: 8500 },
          { partName: '마리나', revenue: 60000000, visitors: 2500 },
          { partName: '미디어아트', revenue: 75000000, visitors: 4200 },
          { partName: '모토아레나', revenue: 50000000, visitors: 1800 },
        ];

        const { allocations: allocMap, audit } = allocateExpenses(rows, defaultMetrics);
        const allocList: any[] = [];
        allocMap.forEach((v) => allocList.push(v));

        setAllocations(allocList);
        setAuditResult(audit);
      } catch (err: any) {
        console.error('Parsing error:', err);
        alert(`엑셀 파일 파싱 오류: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(uploadedFile);
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

  const totalExpenseSum = parsedRows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-600" size={24} />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              월별 비용 엑셀 업로드 및 파트별 안분 관리
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ERP/회계 엑셀 전표를 업로드하면 비목별로 정제되고, 레저본부 파트별(액티비티/목장/마리나/미디어아트/모토아레나)로 자동 분배됩니다.
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
              <span>{saveSuccess ? '반영 완료됨' : 'P&L 데이터베이스 저장'}</span>
            </button>
          )}
        </div>
      </div>

      {/* File Upload Dropzone */}
      <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 transition-colors flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 shadow-2xs">
          <Upload size={24} />
        </div>
        <h3 className="text-sm font-bold text-slate-900">
          {file ? file.name : '비용 전표 엑셀 파일(.xlsx, .xls)을 업로드하세요'}
        </h3>
        <p className="text-2xs text-slate-500 mt-1 max-w-sm">
          계정코드, 계정과목, 대분류(인건비/경비 등), 부서명, 금액이 포함된 엑셀 시트를 자동으로 인식하여 정제합니다.
        </p>

        <label className="mt-4 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors">
          <span>{loading ? '파싱 분석 중...' : '파일 선택하기'}</span>
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileUpload} 
            className="hidden" 
          />
        </label>
      </div>

      {/* Validation Master Audit Banner */}
      {auditResult && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          auditResult.isZeroVariance 
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
            : 'bg-rose-50 border-rose-200 text-rose-950'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              auditResult.isZeroVariance ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
            }`}>
              {auditResult.isZeroVariance ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <span>검증마스터 감사 결과:</span>
                <span className={`px-2 py-0.5 rounded-md text-2xs font-extrabold ${
                  auditResult.isZeroVariance ? 'bg-emerald-200/80 text-emerald-800' : 'bg-rose-200 text-rose-800'
                }`}>
                  {auditResult.isZeroVariance ? 'ZERO-VARIANCE 무결성 통과 (Δ = 0)' : '오차 발생 (점검 필요)'}
                </span>
              </div>
              <p className="text-2xs text-slate-600 mt-0.5">
                원천 엑셀 총액: <strong>{formatNumber(auditResult.totalExcelSum)}</strong> | 파트 분배 총액: <strong>{formatNumber(auditResult.totalAllocatedSum)}</strong> | 잔여 단수: <strong>{formatNumber(auditResult.delta)}</strong>
              </p>
            </div>
          </div>
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
              <CheckCircle2 size={14} />
              Firestore 저장 완료
            </span>
          )}
        </div>
      )}

      {/* Live Allocation Preview Cards */}
      {allocations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-slate-700" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              레저 파트별 비용 안분 결과 미리보기 (Allocation Preview)
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {allocations.map((alloc, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{alloc.partName}</span>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {formatNumber(alloc.totalExpense > 0 ? (alloc.totalExpense / totalExpenseSum) * 100 : 0)}%
                  </span>
                </div>
                <div className="text-base font-bold font-mono text-slate-900">
                  {formatNumber(alloc.totalExpense)}
                </div>
                <div className="pt-2 border-t border-slate-100 text-2xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>직과 비용:</span>
                    <span className="font-mono text-slate-700">{formatNumber(alloc.directExpense)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>공통 안분:</span>
                    <span className="font-mono text-slate-700">{formatNumber(alloc.commonExpense)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parsed Raw Table View */}
      {parsedRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <TrendingDown size={16} className="text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                정제된 전표 목록 ({parsedRows.length}건)
              </h3>
            </div>
            <div className="text-xs font-bold text-slate-700">
              비용 총합: <span className="font-mono text-emerald-700">{formatNumber(totalExpenseSum)}</span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 custom-scrollbar">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-2xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4 border-r border-slate-200">계정코드</th>
                  <th className="py-2.5 px-4 border-r border-slate-200">계정과목</th>
                  <th className="py-2.5 px-4 border-r border-slate-200">비목 (대분류)</th>
                  <th className="py-2.5 px-4 border-r border-slate-200">원천 부서명</th>
                  <th className="py-2.5 px-4 text-right border-r border-slate-200">금액</th>
                  <th className="py-2.5 px-4">적요</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-500 border-r border-slate-200">{row.accountCode}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-800 border-r border-slate-200">{row.accountName}</td>
                    <td className="py-2.5 px-4 border-r border-slate-200">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-2xs font-semibold text-slate-600">
                        {row.macroCategory}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-700 border-r border-slate-200">{row.rawDepartment}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                      {formatNumber(row.amount)}
                    </td>
                    <td className="py-2.5 px-4 text-2xs text-slate-500 truncate max-w-xs">{row.memo || '-'}</td>
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
