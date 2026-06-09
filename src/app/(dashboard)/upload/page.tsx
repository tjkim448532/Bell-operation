import UploadForm from '@/components/UploadForm';

export default function UploadPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Data Upload</h1>
        <p className="text-gray-500 mt-2">Upload PMS Revenue or Finance Expense Excel files to update the database.</p>
      </div>
      <UploadForm />
    </div>
  );
}
