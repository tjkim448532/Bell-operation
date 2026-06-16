import UploadForm from '@/components/UploadForm';

export default function UploadPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">비용/매출 데이터 업로드</h1>
        <p className="text-gray-500 mt-2">추후 AWS 연동을 통한 완전 자동화 전까지 사용하는 수동 데이터 업로드 화면입니다.</p>
      </div>
      <UploadForm />
    </div>
  );
}
