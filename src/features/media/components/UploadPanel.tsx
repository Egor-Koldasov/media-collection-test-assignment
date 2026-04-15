import { useRef, useState, type DragEvent } from "react";

import { useAppDispatch } from "../../../app/hooks";
import {
  ACCEPTED_UPLOAD_LABEL,
  ACCEPTED_UPLOAD_TYPES,
  MAX_FILES_PER_BATCH,
} from "../constants";
import { filesSelected } from "../mediaSlice";
import type { UploadValidationIssue } from "../types";

interface UploadPanelProps {
  activeUploadsCount: number;
  validationIssues: UploadValidationIssue[];
}

function toFileArray(fileList: FileList | null): File[] {
  return fileList ? Array.from(fileList) : [];
}

export function UploadPanel({
  activeUploadsCount,
  validationIssues,
}: UploadPanelProps) {
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const submitFiles = (incoming: File[] | FileList | null) => {
    const nextFiles = Array.isArray(incoming)
      ? incoming
      : toFileArray(incoming);

    if (nextFiles.length === 0) {
      return;
    }

    dispatch(filesSelected(nextFiles));

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    submitFiles(toFileArray(event.dataTransfer.files));
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (
      event.relatedTarget instanceof Node &&
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return;
    }

    setIsDragActive(false);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_minmax(280px,420px)] lg:items-center">
      <div className="space-y-3">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_UPLOAD_TYPES.join(",")}
          className="hidden"
          onChange={(event) => submitFiles(event.target.files)}
        />

        <div
          className={[
            "group relative overflow-hidden rounded-[28px] border px-5 py-5 transition sm:px-6 sm:py-6",
            isDragActive
              ? "border-olive/45 bg-[#eef7fa] shadow-[0_0_0_1px_rgba(47,115,132,0.16)]"
              : "border-ink/10 bg-white/84 shadow-inset",
          ].join(" ")}
          onClick={() => inputRef.current?.click()}
          onDragEnter={() => setIsDragActive(true)}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <div className="pointer-events-none absolute inset-x-5 top-4 h-px bg-gradient-to-r from-transparent via-ink/12 to-transparent" />
          <div className="relative space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-ink/62">
                Drop files here or choose them from your device. Accepted: JPEG,
                PNG, WEBP, MP4. Up to 5 files, 10 MB each.
              </p>
            </div>

            <button
              type="button"
              className="inline-flex items-center rounded-full bg-olive px-4 py-2 text-sm font-medium text-shell transition hover:bg-olive/90"
              onClick={(event) => {
                event.stopPropagation();
                inputRef.current?.click();
              }}
            >
              Choose files
            </button>
          </div>
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
    </div>
  );
}
