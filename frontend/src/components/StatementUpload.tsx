import { useId, useState } from 'react';

interface StatementUploadProps {
  onFileSelect?: (file: File) => void;
}

function StatementUpload({ onFileSelect }: StatementUploadProps) {
  const [fileName, setFileName] = useState('No file selected');
  const [hasFile, setHasFile] = useState(false);
  const inputId = useId();

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-3 text-sm text-slate-700">Upload bank statement (optional — for visual demo only)</p>
      <label
        htmlFor={inputId}
        className="inline-block cursor-pointer rounded-lg bg-bv-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-bv-blue/90"
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
          if (!file) {
            setFileName('No file selected');
            setHasFile(false);
            return;
          }
          setFileName(file.name);
          setHasFile(true);
          onFileSelect?.(file);
        }}
      />
      <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
        {fileName}
        {hasFile && (
          <span className="inline-flex items-center text-bv-green" aria-label="PDF selected">
            <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.71-9.79a1 1 0 0 0-1.42-1.42l-3.36 3.38-1.22-1.23a1 1 0 0 0-1.42 1.41l1.93 1.95a1 1 0 0 0 1.42 0l4.07-4.1Z" />
            </svg>
          </span>
        )}
      </p>
    </div>
  );
}

export default StatementUpload;
