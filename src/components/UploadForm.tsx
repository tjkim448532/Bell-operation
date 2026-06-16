'use client';

import { useState } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Loader2, Upload, Link as LinkIcon, RefreshCw, Info, ArrowRight } from 'lucide-react';

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<'revenue' | 'expense' | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'googlesheet' | 'file'>('googlesheet');
  const [sheetUrl, setSheetUrl] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleFileUpload = async () => {
    if (!file || !type) return;
    setStatus('uploading');
    setMessage('수동 엑셀 파일을 업로드하고 분석 중입니다...');

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
    setMessage('구글 시트에서 최신 데이터를 가져오고 자동으로 팀별 분류 작업을 진행하고 있습니다. 수십 초 정도 소요될 수 있습니다...');

    try {
      const res = await fetch('/api/upload/google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sheetUrl, type }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.error || '동기화 실패');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || '오류가 발생했습니다');
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">데이터 가져오기</h1>
        <p className="text-gray-500 mt-2">구글 시트의 최신 데이터를 시스템 DB로 불러와 업데이트하는 곳입니다.</p>
      </div>

      {/* 안내 문구 */}
      <div className="bg-mint-50 border border-mint-200 rounded-2xl p-6 mb-8 flex items-start space-x-4 shadow-sm">
        <Info className="w-6 h-6 text-mint-600 shrink-0 mt-1" />
        <div>
          <h3 className="font-bold text-mint-900 mb-2">동기화는 언제 필요한가요?</h3>
          <ul className="text-sm text-mint-800 space-y-1 list-disc list-inside">
            <li><strong>필요할 때:</strong> 구글 시트에 새로운 비용/매출 내역을 추가했을 때, 기존 내역의 금액이나 글자를 수정했을 때, 또는 새로운 파싱 규칙이 업데이트 되었다고 안내받았을 때.</li>
            <li><strong>필요 없을 때:</strong> 단지 리포트나 대시보드를 조회하기만 할 때는 누르실 필요가 없습니다. (데이터는 한 번 동기화하면 DB에 안전하게 저장됩니다)</li>
          </ul>
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
            <div className="flex gap-4">
              <button
                type="button"
                className={`flex-1 py-4 px-6 text-base font-bold rounded-xl border-2 transition-all ${type === 'revenue' ? 'border-mint-600 bg-mint-50 text-mint-700 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                onClick={() => { setType('revenue'); setStatus('idle'); }}
              >
                🔵 PMS 매출 데이터
              </button>
              <button
                type="button"
                className={`flex-1 py-4 px-6 text-base font-bold rounded-xl border-2 transition-all ${type === 'expense' ? 'border-red-600 bg-red-50 text-red-700 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                onClick={() => { setType('expense'); setStatus('idle'); }}
              >
                🔴 재경 비용 데이터
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
                    onChange={(e) => { setSheetUrl(e.target.value); setStatus('idle'); }}
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
                'bg-red-600 hover:bg-red-700 text-white shadow-md'
              }`}
            >
              {status === 'uploading' ? (
                <><Loader2 className="animate-spin w-6 h-6 mr-3" /> 데이터 처리 중...</>
              ) : (
                <><RefreshCw className="w-6 h-6 mr-3" /> {type === 'revenue' ? '매출' : '지출'} 데이터 동기화 시작</>
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
                <div className="p-4 bg-green-50 text-green-800 rounded-xl border border-green-200 text-sm flex flex-col space-y-3">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-green-600" />
                    <div>
                      <p className="font-bold mb-1">성공적으로 완료되었습니다!</p>
                      <p>{message}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-green-100 shadow-sm flex items-center justify-between mt-2">
                    <span className="font-medium text-green-900">다음 할 일: {type === 'revenue' ? '지출' : '매출'} 데이터도 업데이트 하시겠습니까?</span>
                    <button 
                      onClick={() => {
                        setType(type === 'revenue' ? 'expense' : 'revenue');
                        setStatus('idle');
                      }}
                      className="text-sm bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1.5 rounded-md font-bold transition-colors flex items-center"
                    >
                      {type === 'revenue' ? '지출' : '매출'} 선택하기 <ArrowRight className="w-4 h-4 ml-1" />
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
        
      </div>
    </div>
  );
}
