import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent
} from 'react';

import { useAppDispatch } from '../../../app/hooks';
import {
  MAX_FILES_PER_BATCH,
} from '../constants';
import { requestNextPage } from '../mediaSlice';
import type { MediaEntity } from '../types';
import { InfiniteSentinel } from './InfiniteSentinel';
import { MediaCard } from './MediaCard';
import {
  isFileDrag,
  type CollectionDropTargetHandlers,
} from './useCollectionFileDrop';

interface MediaGridProps {
  items: MediaEntity[];
  isInitialLoading: boolean;
  isPageLoading: boolean;
  fetchError: string | null;
  showEmpty: boolean;
  emptyMessage: string;
  hasMore: boolean;
  showEndOfList: boolean;
  isCollectionDragActive: boolean;
  dropTargetHandlers: CollectionDropTargetHandlers;
}

function SkeletonCard() {
  return (
    <div className="flex w-full max-w-[232px] flex-col gap-4 rounded-[28px] border border-ink/8 bg-white/75 p-4 shadow-card">
      <div className="mx-auto h-[200px] w-[200px] animate-pulse rounded-[22px] bg-[#edf4f8]" />
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="h-4 w-4/5 animate-pulse rounded-full bg-[#e7eef3]" />
          <div className="flex items-center gap-2">
            <div className="h-6 w-16 animate-pulse rounded-full bg-[#edf3f7]" />
            <div className="h-4 w-12 animate-pulse rounded-full bg-[#edf3f7]" />
          </div>
        </div>
        <div className="h-1.5 w-full animate-pulse rounded-full bg-[#edf3f7]" />
      </div>
    </div>
  );
}

interface OverlayRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function MediaGrid({
  items,
  isInitialLoading,
  isPageLoading,
  fetchError,
  showEmpty,
  emptyMessage,
  hasMore,
  showEndOfList,
  isCollectionDragActive,
  dropTargetHandlers
}: MediaGridProps) {
  const dispatch = useAppDispatch();
  const collectionRef = useRef<HTMLDivElement | null>(null);
  const [overlayRect, setOverlayRect] = useState<OverlayRect | null>(null);
  const [isDropZoneHovered, setIsDropZoneHovered] = useState(false);
  const gridClassName =
    "grid justify-start gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),232px))]";

  useEffect(() => {
    if (!isCollectionDragActive) {
      setOverlayRect(null);
      setIsDropZoneHovered(false);
      return;
    }

    const updateOverlayRect = () => {
      const node = collectionRef.current;

      if (!node) {
        setOverlayRect(null);
        return;
      }

      const rect = node.getBoundingClientRect();
      const top = Math.max(rect.top, 0);
      const left = Math.max(rect.left, 0);
      const right = Math.min(rect.right, window.innerWidth);
      const bottom = Math.min(rect.bottom, window.innerHeight);
      const width = Math.max(0, right - left);
      const height = Math.max(0, bottom - top);

      if (width === 0 || height === 0) {
        setOverlayRect(null);
        return;
      }

      setOverlayRect({ top, left, width, height });
    };

    updateOverlayRect();

    document.addEventListener('scroll', updateOverlayRect, true);
    window.addEventListener('resize', updateOverlayRect);

    return () => {
      document.removeEventListener('scroll', updateOverlayRect, true);
      window.removeEventListener('resize', updateOverlayRect);
    };
  }, [isCollectionDragActive]);

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    dropTargetHandlers.onDragEnter(event);

    if (isFileDrag(event.dataTransfer)) {
      setIsDropZoneHovered(true);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    dropTargetHandlers.onDragOver(event);

    if (isFileDrag(event.dataTransfer) && !isDropZoneHovered) {
      setIsDropZoneHovered(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event.dataTransfer)) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const isStillInside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!isStillInside) {
      setIsDropZoneHovered(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    setIsDropZoneHovered(false);
    dropTargetHandlers.onDrop(event);
  };

  // TODO: move to a separate React component
  const collectionContent = isInitialLoading ? (
    <div className={gridClassName}>
      {Array.from({ length: 8 }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  ) : showEmpty ? (
    <div className="rounded-[26px] border border-dashed border-ink/12 bg-[#f4f8fb] px-6 py-10 text-center text-sm text-ink/58">
      {emptyMessage}
    </div>
  ) : (
    <div className={gridClassName}>
      {items.map((item) => (
        <MediaCard key={item.id} item={item} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6 pt-5">
      <div
        ref={collectionRef}
        className="relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className={[
            "transition duration-200",
            isCollectionDragActive
              ? "scale-[0.985] blur-[2px] saturate-[0.82]"
              : "",
          ].join(" ")}
        >
          {collectionContent}
        </div>

        {isCollectionDragActive && overlayRect ? (
          <div
            className={[
              "pointer-events-none fixed z-20 flex items-center justify-center border transition duration-200 backdrop-blur-sm",
              isDropZoneHovered
                ? "border-dashed border-olive/30 bg-[linear-gradient(180deg,rgba(243,250,252,0.9),rgba(232,244,247,0.96))]"
                : "border-dashed border-ink/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(252,253,254,0.98))]",
            ].join(" ")}
            style={
              {
                top: overlayRect.top,
                left: overlayRect.left,
                width: overlayRect.width,
                height: overlayRect.height,
                borderRadius: Math.min(30, overlayRect.height / 6, overlayRect.width / 6),
              } satisfies CSSProperties
            }
          >
            <div
              className={[
                "flex max-w-md flex-col items-center gap-4 rounded-[28px] border px-8 py-7 text-center shadow-card border-white/85 bg-white/86",
              ].join(" ")}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-olive/10 text-olive shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 48 48"
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6.5 17.5c0-2.76 2.24-5 5-5h8.5l3.5 4.5H36.5c2.76 0 5 2.24 5 5v12c0 2.76-2.24 5-5 5h-25c-2.76 0-5-2.24-5-5v-16.5Z" />
                  <path d="M24 20v12" />
                  <path d="M18 26h12" />
                </svg>
              </span>
              <div className="space-y-2">
                <p className="text-base font-medium text-ink">Drop into collection</p>
                <p className="text-sm text-ink/58">
                  Release your files to place them directly into this content folder.
                </p>
              </div>
              <p className="text-xs text-ink/46">
                Supported media types: JPEG, PNG, WEBP, MP4.
                Up to {MAX_FILES_PER_BATCH} files, 10 MB each.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {fetchError ? (
        <div className="flex flex-col items-center gap-3 rounded-[24px] border border-rust/16 bg-rust/6 px-5 py-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-rust">{fetchError}</p>
          <button
            type="button"
            onClick={() => dispatch(requestNextPage())}
            className="rounded-full border border-rust/20 bg-white px-3.5 py-2 text-sm font-medium text-rust transition hover:border-rust/30"
          >
            Retry
          </button>
        </div>
      ) : null}

      {isPageLoading ? (
        <div className="flex items-center justify-center gap-3 py-2 text-sm text-ink/55">
          <span className="h-2 w-2 animate-pulse rounded-full bg-olive" />
          <span>Loading more</span>
        </div>
      ) : null}

      {showEndOfList ? (
        <div className="py-1 text-center text-xs font-medium uppercase tracking-[0.28em] text-ink/38">
          End of collection
        </div>
      ) : null}

      {hasMore && !fetchError ? (
        <InfiniteSentinel
          disabled={isPageLoading || isInitialLoading}
          onEnter={() => dispatch(requestNextPage())}
        />
      ) : null}
    </div>
  );
}
