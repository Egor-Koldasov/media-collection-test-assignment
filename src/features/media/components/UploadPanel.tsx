import type { UploadValidationIssue } from "../types";

interface UploadPanelProps {
  activeUploadsCount: number;
  validationIssues: UploadValidationIssue[];
  onUploadClick: () => void;
}

export function UploadPanel({
  activeUploadsCount,
  validationIssues,
  onUploadClick,
}: UploadPanelProps) {
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="inline-flex items-center rounded-full bg-olive px-4 py-2 text-sm font-medium text-shell transition hover:bg-olive/90"
          onClick={onUploadClick}
        >
          Upload
        </button>

        {activeUploadsCount > 0 ? (
          <span className="rounded-full border border-olive/16 bg-olive/8 px-3 py-1 text-xs font-medium text-olive">
            {activeUploadsCount} uploading
            {activeUploadsCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {validationIssues.length > 0 ? (
        <ul className="space-y-2 rounded-[22px] border border-rust/18 bg-rust/7 p-4">
          {validationIssues.map((issue) => (
            <li
              key={issue.id}
              className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start"
            >
              <span className="font-medium text-ink">{issue.name}</span>
              <span className="hidden text-rust/55 sm:inline">•</span>
              <span className="text-rust">{issue.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
