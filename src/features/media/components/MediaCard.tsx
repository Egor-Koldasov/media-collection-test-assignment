import { useAppDispatch } from "../../../app/hooks";
import {
  cancelUploadRequested,
  removeMediaRequested,
  retryUploadRequested,
} from "../mediaSlice";
import type { MediaEntity } from "../types";
import { formatFileSize, formatMediaType } from "../../../utils/formatters";
import { CloseIcon } from "./icons/CloseIcon";

interface MediaCardProps {
  item: MediaEntity;
}

function PreviewPlaceholder({ item }: { item: MediaEntity }) {
  const message =
    item.previewStatus.status === "loading"
      ? "Generating preview"
      : item.previewStatus.status === "error"
        ? "Preview unavailable"
        : "No preview available";

  const toneClass =
    item.previewStatus.status === "error"
      ? "border-rust/15 bg-rust/6 text-rust"
      : "border-ink/10 bg-[radial-gradient(circle_at_top,_rgba(124,163,85,0.16),_transparent_58%),linear-gradient(180deg,_rgba(255,255,255,0.94),_rgba(237,244,247,0.98))] text-ink/58";

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-2 rounded-[22px] border px-6 text-center ${toneClass}`}
    >
      <span className="text-[11px] font-medium uppercase tracking-[0.16em]">
        {formatMediaType(item.type)}
      </span>
      <span className="text-sm leading-snug">{message}</span>
    </div>
  );
}

function StatusBadge({ item }: { item: MediaEntity }) {
  if (item.uploadState.status === "uploading") {
    return (
      <span className="rounded-full bg-olive/12 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-olive">
        Uploading
      </span>
    );
  }

  if (item.uploadState.status === "done") {
    return (
      <span className="rounded-full bg-ink/8 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-ink/72">
        Done
      </span>
    );
  }

  if (item.uploadState.status === "error") {
    return (
      <span className="rounded-full bg-rust/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-rust">
        Error
      </span>
    );
  }

  return null;
}

export function MediaCard({ item }: MediaCardProps) {
  const dispatch = useAppDispatch();
  const uploadProgress =
    item.uploadState.status === "uploading" ? item.uploadState.progress : 0;

  return (
    <article className="group relative flex w-full max-w-[232px] flex-col gap-4 rounded-[28px] border border-ink/8 bg-white/90 p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(22,36,45,0.11)]">
      <button
        type="button"
        aria-label={`Remove ${item.name}`}
        className="pointer-events-none absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(12,22,30,0.58)] text-white/92 opacity-0 backdrop-blur-xs transition duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 hover:scale-105 hover:bg-[rgba(12,22,30,0.74)] text-gray-300 hover:text-white focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85 focus-visible:ring-offset-2 focus-visible:ring-offset-ink/20"
        onClick={() => dispatch(removeMediaRequested(item.id))}
      >
        <CloseIcon className="h-4 w-4" />
      </button>

      <div className="relative mx-auto h-[200px] w-[200px] overflow-hidden rounded-[22px] bg-[#edf4f7]">
        {item.previewUrl ? (
          <img
            src={item.previewUrl}
            alt={`${item.name} preview`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <PreviewPlaceholder item={item} />
        )}

        {item.previewStatus.status === "loading" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/16 backdrop-blur-[1px]">
            <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/60 border-t-white" />
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-[15px] font-semibold leading-snug text-ink">
              <span className="line-clamp-2 break-words">{item.name}</span>
            </p>
            <StatusBadge item={item} />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-ink/58">
            <span className="rounded-full border border-ink/9 px-2.5 py-1">
              {formatMediaType(item.type)}
            </span>
            <span>{formatFileSize(item.size)}</span>
          </div>
        </div>

        {item.uploadState.status === "uploading" ? (
          <div className="space-y-2.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-ink/8">
              <div
                className="h-full rounded-full bg-olive transition-[width]"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium uppercase tracking-[0.16em] text-olive">
                {uploadProgress}%
              </span>
              <button
                type="button"
                className="rounded-full border border-ink/10 px-3 py-1.5 text-ink/70 transition hover:border-ink/18 hover:text-ink"
                onClick={() => dispatch(cancelUploadRequested(item.id))}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {item.uploadState.status === "error" ? (
          <div className="space-y-2 rounded-[18px] border border-rust/15 bg-rust/6 p-3">
            <p className="text-sm leading-snug text-rust">
              {item.uploadState.message}
            </p>
            <button
              type="button"
              className="rounded-full border border-rust/15 bg-white px-3 py-1.5 text-sm font-medium text-rust transition hover:border-rust/28"
              onClick={() => dispatch(retryUploadRequested(item.id))}
            >
              Retry upload
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
