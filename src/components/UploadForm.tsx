'use client';

import { useState } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Loader2, Upload } from 'lucide-react';

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<'revenue' | 'expense'>('revenue');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleUpload = async () => {
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

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">데이터 가져오기</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">파일 유형 선택</label>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${type === 'revenue' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setType('revenue')}
            >
              PMS 매출 엑셀
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${type === 'expense' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setType('expense')}
            >
              재경 비용 엑셀
            </button>
          </div>
        </div>

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
        </div>

        <button
          disabled={!file || status === 'uploading'}
          onClick={handleUpload}
          className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {status === 'uploading' ? (
            <span className="flex items-center"><Loader2 className="animate-spin w-5 h-5 mr-2" /> 처리 중...</span>
          ) : (
            <span className="flex items-center"><Upload className="w-5 h-5 mr-2" /> 데이터 업로드</span>
          )}
        </button>

        {status === 'success' && (
          <div className="p-4 bg-green-50 text-green-700 rounded-xl flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-medium text-sm">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="font-medium text-sm">{message}</p>
          </div>
        )}
      </div>

      <div className="mt-12 pt-8 border-t border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-2">구글 스프레드시트 연동 (비용)</h2>
        <p className="text-sm text-gray-500 mb-6">시트 링크를 입력하시면 1월부터 모든 월별 시트 데이터를 자동으로 일괄 파싱하여 동기화합니다.</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">공유 링크 (URL)</label>
            <input 
              type="text" 
              placeholder="https://docs.google.com/spreadsheets/d/..." 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              id="google-sheet-url"
            />
          </div>
          <button
            onClick={async () => {
              const urlInput = document.getElementById('google-sheet-url') as HTMLInputElement;
              const url = urlInput?.value;
              if (!url) {
                alert('링크를 입력해주세요.');
                return;
              }
              
              setStatus('uploading');
              setMessage('');
              
              try {
                const res = await fetch('/api/upload/google-sheet', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url }),
                });
                const data = await res.json();
                
                if (res.ok && data.success) {
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
            }}
            disabled={status === 'uploading'}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {status === 'uploading' ? (
              <span className="flex items-center"><Loader2 className="animate-spin w-5 h-5 mr-2" /> 동기화 중...</span>
            ) : (
              <span className="flex items-center"><UploadCloud className="w-5 h-5 mr-2" /> 시트 전체 일괄 동기화</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
