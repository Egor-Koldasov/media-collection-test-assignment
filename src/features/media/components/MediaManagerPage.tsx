import { useEffect, useRef, useState, type DragEvent } from "react";

import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { filesSelected, requestNextPage } from "../mediaSlice";
import {
  selectActiveUploadsCount,
  selectGalleryViewModel,
  selectSearchInput,
  selectSortBy,
  selectTypeFilter,
  selectValidationIssues,
} from "../selectors";
import { MediaControls } from "./MediaControls";
import { MediaGrid } from "./MediaGrid";
import { UploadPanel } from "./UploadPanel";

function toFileArray(fileList: FileList | null): File[] {
  return fileList ? Array.from(fileList) : [];
}

function isFileDrag(dataTransfer: DataTransfer | null): boolean {
  return dataTransfer
    ? Array.from(dataTransfer.types).includes("Files")
    : false;
}

export function MediaManagerPage() {
  const dispatch = useAppDispatch();
  const galleryViewModel = useAppSelector(selectGalleryViewModel);
  const searchInput = useAppSelector(selectSearchInput);
  const sortBy = useAppSelector(selectSortBy);
  const typeFilter = useAppSelector(selectTypeFilter);
  const validationIssues = useAppSelector(selectValidationIssues);
  const activeUploadsCount = useAppSelector(selectActiveUploadsCount);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pageDragDepthRef = useRef(0);
  const [isCollectionDragActive, setIsCollectionDragActive] = useState(false);

  useEffect(() => {
    dispatch(requestNextPage());
  }, [dispatch]);

  useEffect(() => {
    const resetCollectionDrag = () => {
      pageDragDepthRef.current = 0;
      setIsCollectionDragActive(false);
    };

    const handleWindowDragEnter = (event: globalThis.DragEvent) => {
      const { dataTransfer } = event;

      if (!dataTransfer || !isFileDrag(dataTransfer)) {
        return;
      }

      pageDragDepthRef.current += 1;
      setIsCollectionDragActive(true);
    };

    const handleWindowDragOver = (event: globalThis.DragEvent) => {
      const { dataTransfer } = event;

      if (!dataTransfer || !isFileDrag(dataTransfer)) {
        return;
      }

      event.preventDefault();
      dataTransfer.dropEffect = "copy";
      setIsCollectionDragActive(true);
    };

    const handleWindowDragLeave = (event: globalThis.DragEvent) => {
      const { dataTransfer } = event;

      if (!dataTransfer || !isFileDrag(dataTransfer)) {
        return;
      }

      pageDragDepthRef.current = Math.max(0, pageDragDepthRef.current - 1);

      if (pageDragDepthRef.current === 0) {
        setIsCollectionDragActive(false);
      }
    };

    const handleWindowDrop = (event: globalThis.DragEvent) => {
      const { dataTransfer } = event;

      if (!dataTransfer || !isFileDrag(dataTransfer)) {
        return;
      }

      event.preventDefault();
      resetCollectionDrag();
    };

    window.addEventListener("dragenter", handleWindowDragEnter);
    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("dragleave", handleWindowDragLeave);
    window.addEventListener("dragend", resetCollectionDrag);
    window.addEventListener("drop", handleWindowDrop);

    return () => {
      window.removeEventListener("dragenter", handleWindowDragEnter);
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("dragleave", handleWindowDragLeave);
      window.removeEventListener("dragend", resetCollectionDrag);
      window.removeEventListener("drop", handleWindowDrop);
    };
  }, []);

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

  const handleCollectionDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    setIsCollectionDragActive(true);
  };

  const handleCollectionDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";

    if (!isCollectionDragActive) {
      setIsCollectionDragActive(true);
    }
  };

  const handleCollectionDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event.dataTransfer)) {
      return;
    }
  };

  const handleCollectionDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    pageDragDepthRef.current = 0;
    setIsCollectionDragActive(false);
    submitFiles(event.dataTransfer.files);
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 text-ink sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-14 h-64 w-64 rounded-full bg-[#b9d8e1]/24 blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 animate-drift rounded-full bg-olive/10 blur-3xl" />
        <div className="absolute bottom-24 left-1/3 h-52 w-52 rounded-full bg-white/24 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-6">
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => submitFiles(event.target.files)}
        />

        <section className="rounded-[32px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,252,0.96))] p-5 shadow-card sm:p-6">
          <div className="flex border-b border-ink/8 pb-5 items-end gap-8 justify-between">
            <UploadPanel
              activeUploadsCount={activeUploadsCount}
              validationIssues={validationIssues}
              onUploadClick={() => inputRef.current?.click()}
            />
            <MediaControls
              searchInput={searchInput}
              sortBy={sortBy}
              typeFilter={typeFilter}
            />
          </div>
          <MediaGrid
            items={galleryViewModel.items}
            isInitialLoading={galleryViewModel.isInitialLoading}
            isPageLoading={galleryViewModel.isPageLoading}
            fetchError={galleryViewModel.fetchError}
            showEmpty={galleryViewModel.showEmpty}
            emptyMessage={galleryViewModel.emptyMessage}
            hasMore={galleryViewModel.hasMore}
            showEndOfList={galleryViewModel.showEndOfList}
            isCollectionDragActive={isCollectionDragActive}
            onCollectionDragEnter={handleCollectionDragEnter}
            onCollectionDragOver={handleCollectionDragOver}
            onCollectionDragLeave={handleCollectionDragLeave}
            onCollectionDrop={handleCollectionDrop}
          />
        </section>
      </div>
    </main>
  );
}
