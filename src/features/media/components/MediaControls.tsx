import { startTransition } from 'react';

import { useAppDispatch } from '../../../app/hooks';
import { controlsActions } from '../controlsSlice';
import type { SortBy, TypeFilter } from '../types';

interface MediaControlsProps {
  searchInput: string;
  typeFilter: TypeFilter;
  sortBy: SortBy;
}

const filterOptions: Array<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Document' }
];

const sortOptions: Array<{ value: SortBy; label: string }> = [
  { value: 'date', label: 'Newest' },
  { value: 'size', label: 'Largest' }
];

export function MediaControls({
  searchInput,
  typeFilter,
  sortBy
}: MediaControlsProps) {
  const dispatch = useAppDispatch();

  return (
    <div className="flex flex-col gap-4 border-b border-ink/8 pb-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <p className="font-display text-[1.55rem] leading-none text-ink">Library</p>
          <p className="text-sm text-ink/62">
            Search loaded items, then narrow by type or size.
          </p>
        </div>

        <label className="relative block w-full lg:max-w-[360px]">
          <span className="sr-only">Search media</span>
          <input
            value={searchInput}
            onChange={(event) => {
              const nextValue = event.target.value;
              startTransition(() => {
                dispatch(controlsActions.searchInputChanged(nextValue));
              });
            }}
            placeholder="Search by file name"
            className="w-full rounded-full border border-ink/12 bg-white px-4 py-3 pr-11 text-sm text-ink outline-none transition placeholder:text-ink/38 focus:border-olive/45 focus:ring-2 focus:ring-olive/15"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink/35">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16 21 21" strokeLinecap="round" />
            </svg>
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => {
            const isActive = option.value === typeFilter;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => dispatch(controlsActions.setTypeFilter(option.value))}
                className={[
                  'rounded-full px-3.5 py-2 text-sm transition',
                  isActive
                    ? 'bg-olive text-shell shadow-[0_12px_28px_rgba(47,119,109,0.22)]'
                    : 'border border-ink/10 bg-white text-ink/70 hover:border-ink/18 hover:text-ink'
                ].join(' ')}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="inline-flex rounded-full border border-ink/10 bg-[#f3f7fa] p-1">
          {sortOptions.map((option) => {
            const isActive = option.value === sortBy;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => dispatch(controlsActions.setSortBy(option.value))}
                className={[
                  'rounded-full px-3.5 py-2 text-sm transition',
                  isActive
                    ? 'bg-white text-ink shadow-[0_8px_22px_rgba(22,33,40,0.1)]'
                    : 'text-ink/62 hover:text-ink'
                ].join(' ')}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
