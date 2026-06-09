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
            <CheckCircle className="w-5 h-5" />
            <span>{message}</span>
          </div>
        )}

        {status === 'error' && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center space-x-3">
            <AlertCircle className="w-5 h-5" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
