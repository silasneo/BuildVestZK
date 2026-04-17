import { useId, useState } from 'react';

interface StatementUploadProps {
  onFileSelect?: (file: File) => void;
}

function StatementUpload({ onFileSelect }: StatementUploadProps) {
  const [fileName, setFileName] = useState('No file selected');
  const inputId = useId();

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
      <p className="mb-3 text-sm text-gray-300">Upload bank statement (optional — for visual demo only)</p>
      <label
        htmlFor={inputId}
        className="inline-block cursor-pointer rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-600"
      >
        Choose PDF
      </label>
      <input
        id={inputId}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setFileName(file.name);
          onFileSelect?.(file);
        }}
      />
      <p className="mt-3 text-sm text-gray-400">{fileName}</p>
    </div>
  );
}

export default StatementUpload;
