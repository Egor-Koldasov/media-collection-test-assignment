import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { requestNextPage } from "../mediaSlice";
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

export function MediaManagerPage() {
  const dispatch = useAppDispatch();
  const galleryViewModel = useAppSelector(selectGalleryViewModel);
  const searchInput = useAppSelector(selectSearchInput);
  const sortBy = useAppSelector(selectSortBy);
  const typeFilter = useAppSelector(selectTypeFilter);
  const validationIssues = useAppSelector(selectValidationIssues);
  const activeUploadsCount = useAppSelector(selectActiveUploadsCount);

  useEffect(() => {
    dispatch(requestNextPage());
  }, [dispatch]);

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 text-ink sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-14 h-64 w-64 rounded-full bg-[#b9d8e1]/24 blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 animate-drift rounded-full bg-olive/10 blur-3xl" />
        <div className="absolute bottom-24 left-1/3 h-52 w-52 rounded-full bg-white/24 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[32px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,252,0.96))] p-5 shadow-card backdrop-blur sm:p-6">
          <div className="flex border-b border-ink/8 pb-5 items-end gap-8 justify-between">
            <UploadPanel
              activeUploadsCount={activeUploadsCount}
              validationIssues={validationIssues}
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
          />
        </section>
      </div>
    </main>
  );
}
