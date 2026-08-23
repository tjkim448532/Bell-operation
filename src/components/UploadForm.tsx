'use client';

import { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Loader2, Upload, Link as LinkIcon, RefreshCw, Info, ArrowRight, ShieldCheck, Trash2 } from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';

export default function UploadForm() {
  const { startMonth, setStartMonth, endMonth, setEndMonth } = useDateFilter();
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<'revenue' | 'expense' | 'common_expense' | 'goals' | 'room_data' | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'googlesheet' | 'file'>('googlesheet');
  const [sheetUrl, setSheetUrl] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [lastGoalsSync, setLastGoalsSync] = useState<string | null>(null);
  const [uploadMeta, setUploadMeta] = useState<{
    months?: string[];
    deletedCount?: number;
    insertedCount?: number;
    totalAmount?: number;
  } | null>(null);

  const [resetMonthInput, setResetMonthInput] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resetMessage, setResetMessage] = useState('');

  useEffect(() => {
    fetch('/api/goals')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.lastSyncedAt) {
          setLastGoalsSync(new Date(data.lastSyncedAt).toLocaleString('ko-KR'));
        }
      })
      .catch(console.error);
  }, []);

  const handleFileUpload = async () => {
    if (!file || !type) return;
    setStatus('uploading');
    setMessage('수동 엑셀 파일을 업로드하고 안전 교체(Overwrite) 작업을 진행 중입니다...');
    setUploadMeta(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(data.message);
        setUploadMeta({
          months: data.months,
          deletedCount: data.deletedCount,
          insertedCount: data.insertedCount,
          totalAmount: data.totalAmount
        });
        if (data.months && Array.isArray(data.months) && data.months.length > 0) {
          const sorted = [...data.months].sort();
          const latestMonth = sorted[sorted.length - 1];
          if (!endMonth || latestMonth > endMonth) {
            setEndMonth(latestMonth);
          }
        }
      } else {
        setStatus('error');
        setMessage(data.error || '업로드 실패');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || '오류가 발생했습니다');
    }
  };

  const handleGoogleSync = async () => {
    if (!sheetUrl || !type) return;
    setStatus('uploading');
    setMessage('구글 시트에서 최신 데이터를 가져오고 기존 데이터 안전 교체 및 팀별 분류 작업을 진행 중입니다...');
    setUploadMeta(null);

    try {
      const endpoint = type === 'goals' ? '/api/upload/google-sheet-goals' : '/api/upload/google-sheet';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sheetUrl, type }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(data.message);
        setUploadMeta({
          months: data.months,
          deletedCount: data.deletedCount,
          insertedCount: data.insertedCount,
          totalAmount: data.totalAmount
        });
        if (type === 'goals' && data.lastSyncedAt) {
          setLastGoalsSync(new Date(data.lastSyncedAt).toLocaleString('ko-KR'));
        }
      } else {
        setStatus('error');
        setMessage(data.error || '동기화 실패');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || '오류가 발생했습니다');
    }
  };

  const handleMonthlyReset = async () => {
    if (!resetMonthInput || !/^\d{4}-\d{2}$/.test(resetMonthInput)) {
      alert('초기화할 연월을 YYYY-MM 형식으로 입력해주세요.');
      return;
    }
    if (!confirm(`정말로 ${resetMonthInput}월의 비용 데이터를 모두 삭제하시겠습니까? (이 작업은 되돌릴 수 없으며, 필요 시 재업로드해야 합니다)`)) {
      return;
    }
    setResetStatus('loading');
    setResetMessage(`${resetMonthInput}월 비용 데이터 초기화 중...`);
    try {
      const res = await fetch(`/api/admin/reset-expenses?month=${resetMonthInput}`);
      const data = await res.json();
      if (data.success) {
        setResetStatus('success');
        setResetMessage(data.message || `${resetMonthInput}월 초기화 완료`);
      } else {
        setResetStatus('error');
        setResetMessage(data.error || '초기화 실패');
      }
    } catch (e: any) {
      setResetStatus('error');
      setResetMessage(e.message || '네트워크 오류');
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">데이터 가져오기</h1>
        <p className="text-gray-500 mt-2">구글 시트의 최신 데이터를 시스템 DB로 불러와 업데이트하는 곳입니다.</p>
      </div>

      {/* 안내 문구 및 중복 방지 보장 뱃지 */}
      <div className="bg-mint-50 border border-mint-200 rounded-2xl p-6 mb-8 shadow-sm space-y-4">
        <div className="flex items-start space-x-4">
          <Info className="w-6 h-6 text-mint-600 shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-mint-900 mb-2">동기화는 언제 필요한가요?</h3>
            <ul className="text-sm text-mint-800 space-y-1 list-disc list-inside">
              <li><strong>필요할 때:</strong> 구글 시트에 새로운 비용 내역을 추가했을 때, 기존 내역의 금액이나 글자를 수정했을 때.</li>
              <li><strong>필요 없을 때:</strong> 단지 리포트나 대시보드를 조회하기만 할 때는 누르실 필요가 없습니다.</li>
            </ul>
          </div>
        </div>

        <div className="pt-3 border-t border-mint-200/60 flex items-center gap-3 text-xs text-mint-900 bg-white/80 p-3 rounded-xl">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <strong>🛡️ 중복 업로드 원천 차단(Idempotency) 보장:</strong> 동일한 월의 시트/파일을 여러 번 업로드해도 기존 데이터를 100% 최신 파일로 자동 교체(Overwrite)하여 금액이 2배로 불어나는 왜곡을 방지합니다.
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-10 relative">
        
        {/* Step 1 */}
        <div className="relative">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm">1</div>
            <h2 className="text-xl font-bold text-gray-800">어떤 데이터를 가져올까요?</h2>
          </div>
          <div className="pl-11">
            <div className="flex flex-col md:flex-row gap-4 flex-wrap">
              <button
                type="button"
                className={`flex-1 py-4 px-6 text-base font-bold rounded-xl border-2 transition-all min-w-[200px] ${type === 'expense' ? 'border-red-600 bg-red-50 text-red-700 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                onClick={() => { setType('expense'); setStatus('idle'); setUploadMeta(null); }}
              >
                🔴 일반 비용 (영업장별)
              </button>
              <button
                type="button"
                className={`flex-1 py-4 px-6 text-base font-bold rounded-xl border-2 transition-all min-w-[200px] ${type === 'common_expense' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                onClick={() => { setType('common_expense'); setStatus('idle'); setUploadMeta(null); }}
              >
                🔵 전사 공통비용
              </button>
              <button
                type="button"
                className={`flex-1 py-4 px-6 text-base font-bold rounded-xl border-2 transition-all min-w-[200px] ${type === 'goals' ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                onClick={() => { setType('goals'); setStatus('idle'); setUploadMeta(null); }}
              >
                🟣 목표/이용률 데이터
                {lastGoalsSync && <div className="text-xs font-normal mt-1 opacity-70">최근 동기화: {lastGoalsSync}</div>}
              </button>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className={`relative transition-opacity duration-300 ${!type ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center space-x-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${type ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-400'}`}>2</div>
            <h2 className="text-xl font-bold text-gray-800">구글 시트 주소를 입력해주세요</h2>
          </div>
          <div className="pl-11">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">공유 링크</label>
              <button 
                className="text-xs text-gray-400 underline hover:text-gray-600"
                onClick={() => setUploadMethod(uploadMethod === 'googlesheet' ? 'file' : 'googlesheet')}
              >
                {uploadMethod === 'googlesheet' ? '직접 엑셀 파일 업로드하기' : '구글 시트 연동으로 돌아가기'}
              </button>
            </div>

            {uploadMethod === 'googlesheet' ? (
              <>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-4 border-2 border-gray-200 focus:border-gray-900 rounded-xl outline-none transition-colors text-base"
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    value={sheetUrl}
                    onChange={(e) => { setSheetUrl(e.target.value); setStatus('idle'); setUploadMeta(null); }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  ※ 시트의 우측 상단 공유 설정이 <strong>"링크가 있는 모든 사용자에게 공개(뷰어)"</strong>인지 꼭 확인하세요.
                </p>
              </>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors relative">
                <input 
                  type="file" 
                  accept=".xlsx,.xls" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setFile(e.target.files[0]);
                      setStatus('idle');
                      setMessage('');
                      setUploadMeta(null);
                    }
                  }}
                />
                <UploadCloud className="w-10 h-10 text-gray-400 mb-2" />
                <p className="text-gray-600 font-medium">{file ? file.name : '파일을 드래그하거나 클릭하여 선택하세요'}</p>
                <p className="text-xs text-gray-400 mt-1">엑셀 파일(.xlsx)만 가능</p>
              </div>
            )}
          </div>
        </div>

        {/* Step 3 */}
        <div className={`relative transition-opacity duration-300 ${(!type || (uploadMethod === 'googlesheet' && !sheetUrl) || (uploadMethod === 'file' && !file)) ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center space-x-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${(!type || (!sheetUrl && !file)) ? 'bg-gray-200 text-gray-400' : 'bg-gray-900 text-white'}`}>3</div>
            <h2 className="text-xl font-bold text-gray-800">동기화 실행하기</h2>
          </div>
          <div className="pl-11">
            <button
              disabled={status === 'uploading'}
              onClick={uploadMethod === 'googlesheet' ? handleGoogleSync : handleFileUpload}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center ${
                status === 'uploading' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 
                type === 'revenue' ? 'bg-mint-600 hover:bg-mint-700 text-white shadow-md' :
                type === 'goals' ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md' :
                type === 'room_data' ? 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-md' :
                'bg-red-600 hover:bg-red-700 text-white shadow-md'
              }`}
            >
              {status === 'uploading' ? (
                <><Loader2 className="animate-spin w-6 h-6 mr-3" /> 안전 교체 및 동기화 처리 중...</>
              ) : (
                <><RefreshCw className="w-6 h-6 mr-3" /> {type === 'revenue' ? '매출' : type === 'goals' ? '목표/이용률' : type === 'room_data' ? '객실' : '지출'} 데이터 동기화 시작</>
              )}
            </button>
            
            {/* Status Messages */}
            <div className="mt-4">
              {status === 'uploading' && (
                <div className="p-4 bg-gray-50 text-gray-600 rounded-xl border border-gray-200 text-sm flex items-start space-x-3 animate-pulse">
                  <Loader2 className="w-5 h-5 shrink-0 animate-spin mt-0.5 text-gray-400" />
                  <div>
                    <p className="font-bold mb-1">진행 상황</p>
                    <p>{message}</p>
                  </div>
                </div>
              )}

              {status === 'success' && (
                <div className="p-5 bg-green-50 text-green-900 rounded-xl border border-green-200 text-sm flex flex-col space-y-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-6 h-6 shrink-0 mt-0.5 text-green-600" />
                    <div>
                      <p className="font-bold text-base mb-1 text-green-950">성공적으로 완료되었습니다!</p>
                      <p className="text-green-800">{message}</p>
                    </div>
                  </div>

                  {/* Audit Metric Badges */}
                  {uploadMeta && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-green-200 text-xs">
                      <div className="bg-white p-2.5 rounded-lg border border-green-100 text-center">
                        <span className="text-gray-500 block">대상 귀속월</span>
                        <span className="font-bold text-green-800 text-sm">{uploadMeta.months?.join(', ') || '-'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-green-100 text-center">
                        <span className="text-gray-500 block">교체(삭제)된 기존 건수</span>
                        <span className="font-bold text-orange-600 text-sm">{uploadMeta.deletedCount ?? 0}건</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-green-100 text-center">
                        <span className="text-gray-500 block">신규 반영 건수</span>
                        <span className="font-bold text-emerald-700 text-sm">{uploadMeta.insertedCount ?? 0}건</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-green-100 text-center">
                        <span className="text-gray-500 block">총 반영 금액</span>
                        <span className="font-bold text-blue-700 text-sm">₩{Math.round(uploadMeta.totalAmount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-lg p-3 border border-green-100 shadow-sm flex items-center justify-between">
                    <span className="font-medium text-green-900">다음 할 일: {type === 'expense' ? '전사 공통비용' : '일반 비용'} 데이터도 업데이트 하시겠습니까?</span>
                    <button 
                      onClick={() => {
                        setType(type === 'expense' ? 'common_expense' : 'expense');
                        setStatus('idle');
                        setUploadMeta(null);
                      }}
                      className="text-sm bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1.5 rounded-md font-bold transition-colors flex items-center"
                    >
                      {type === 'expense' ? '전사 공통비용' : '일반 비용'} 선택하기 <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 text-sm flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                  <div>
                    <p className="font-bold mb-1">문제가 발생했습니다</p>
                    <p>{message}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Data Care: Self-Healing Auto-Repair & Monthly Targeted Reset */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          {/* 1. Self-Healing Auto-Repair Box */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-emerald-950 text-base flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-emerald-600" />
                기존 지출 데이터 월별 자동 정렬 및 복구 (One-Click Auto-Repair)
              </h3>
              <p className="text-xs text-emerald-800 mt-1">
                Firestore에 이미 저장되어 있는 전표들의 날짜 정보를 기반으로 1월~7월 각 월별 발생액으로 즉시 자동 재배치합니다.
              </p>
            </div>
            <button
              onClick={async () => {
                setStatus('uploading');
                setMessage('기존 지출 데이터의 월별 귀속을 자동 분석 및 복구 중입니다...');
                try {
                  const res = await fetch('/api/admin/repair-expense-months');
                  const data = await res.json();
                  if (data.success) {
                    setStatus('success');
                    setMessage(data.message || '지출 데이터 월별 자동 복구가 성공적으로 완료되었습니다!');
                  } else {
                    setStatus('error');
                    setMessage(data.error || '자동 복구 중 오류가 발생했습니다.');
                  }
                } catch (e: any) {
                  setStatus('error');
                  setMessage(e.message || '네트워크 오류가 발생했습니다.');
                }
              }}
              className="shrink-0 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              원클릭 자동 복구 실행
            </button>
          </div>

          {/* 2. Monthly Targeted Reset Box */}
          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-amber-950 text-base flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-amber-600" />
                특정 월 비용 데이터 완전 초기화 (Targeted Month Reset)
              </h3>
              <p className="text-xs text-amber-800 mt-1">
                잘못된 파일이 올라갔을 경우, 해당 월의 지출 데이터만 완전히 비우고 다시 깨끗하게 업로드할 수 있습니다.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="text"
                placeholder="YYYY-MM"
                maxLength={7}
                value={resetMonthInput}
                onChange={(e) => setResetMonthInput(e.target.value)}
                className="w-28 px-3 py-2 border border-amber-300 rounded-lg text-sm font-bold bg-white text-center focus:outline-none focus:border-amber-600"
              />
              <button
                disabled={resetStatus === 'loading'}
                onClick={handleMonthlyReset}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {resetStatus === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                해당 월 비우기
              </button>
            </div>
          </div>
          {resetMessage && (
            <p className={`text-xs px-2 ${resetStatus === 'success' ? 'text-green-700 font-bold' : 'text-red-600'}`}>
              {resetMessage}
            </p>
          )}
        </div>
        
      </div>
    </div>
  );
}
