'use client';

import { useState } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Loader2, Upload, Link as LinkIcon, RefreshCw } from 'lucide-react';

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<'revenue' | 'expense'>('revenue');
  const [uploadMethod, setUploadMethod] = useState<'googlesheet' | 'file'>('googlesheet');
  const [sheetUrl, setSheetUrl] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleFileUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setMessage('');

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
        setMessage(data.error || 'Upload failed');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong');
    }
  };

  const handleGoogleSync = async () => {
    if (!sheetUrl) return;
    setStatus('uploading');
    setMessage('');

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
        setMessage(data.error || 'Sync failed');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong');
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">데이터 가져오기</h2>
      
      <div className="space-y-6">
        
        {/* Upload Method Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">데이터 연동 방식</label>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-md transition-colors ${uploadMethod === 'googlesheet' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setUploadMethod('googlesheet'); setStatus('idle'); setMessage(''); }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              구글 시트 자동 동기화
            </button>
            <button
              type="button"
              className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-md transition-colors ${uploadMethod === 'file' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setUploadMethod('file'); setStatus('idle'); setMessage(''); }}
            >
              <Upload className="w-4 h-4 mr-2" />
              엑셀 수동 업로드
            </button>
          </div>
        </div>

        {/* Data Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">데이터 종류</label>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${type === 'revenue' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setType('revenue')}
            >
              PMS 매출 데이터
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${type === 'expense' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setType('expense')}
            >
              재경 비용 데이터
            </button>
          </div>
        </div>

        {/* Dynamic Input Area */}
        {uploadMethod === 'googlesheet' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">구글 스프레드시트 공유 링크</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LinkIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              ※ 주의: 해당 시트는 반드시 <strong>"링크가 있는 모든 사용자에게 공개"</strong> 상태여야 합니다.
            </p>
            
            <button
              disabled={!sheetUrl || status === 'uploading'}
              onClick={handleGoogleSync}
              className="mt-6 w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {status === 'uploading' ? (
                <span className="flex items-center"><Loader2 className="animate-spin w-5 h-5 mr-2" /> 동기화 중...</span>
              ) : (
                <span className="flex items-center"><RefreshCw className="w-5 h-5 mr-2" /> 클릭하여 즉시 동기화</span>
              )}
            </button>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">엑셀 파일 (.xlsx)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-10 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors relative">
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
              <UploadCloud className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium">{file ? file.name : '파일을 드래그하거나 클릭하여 선택하세요'}</p>
              <p className="text-sm text-gray-400 mt-1">엑셀 파일만 가능</p>
            </div>
            
            <button
              disabled={!file || status === 'uploading'}
              onClick={handleFileUpload}
              className="mt-6 w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {status === 'uploading' ? (
                <span className="flex items-center"><Loader2 className="animate-spin w-5 h-5 mr-2" /> 처리 중...</span>
              ) : (
                <span className="flex items-center"><Upload className="w-5 h-5 mr-2" /> 데이터 업로드</span>
              )}
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="p-4 bg-green-50 text-green-700 rounded-xl flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
