import UploadForm from '@/components/UploadForm';

export default function UploadPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">엑셀 데이터 업로드</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5">전사 비용 및 목표 실적 엑셀 파일을 업로드하여 대시보드에 최신 실적을 반영합니다.</p>
      </div>
      <UploadForm />
    </div>
  );
}
