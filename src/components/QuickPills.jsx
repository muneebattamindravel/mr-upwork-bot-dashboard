import React from 'react';

// One-tap preset chips shown above the Jobs feed. Mirrors the mobile
// QuickPills. The parent owns filter state; this component is pure UI.
// A pill's `patch` is compared against current filters — if all keys
// match, the pill renders as "active" and tapping it again clears them.

const isEq = (a, b) =>
  Array.isArray(a) && Array.isArray(b)
    ? a.length === b.length && a.every((v, i) => v === b[i])
    : a === b;

const patchMatches = (filters, patch) =>
  Object.entries(patch).every(([k, v]) => isEq(filters?.[k], v));

// Same catalogue as the mobile app so mental model transfers 1:1.
// Note: web `minRelevanceScore` is a string ('' when unset) — brain casts
// it, so passing a number here is fine too.
export const QUICK_PILLS = [
  { key: 'high',            icon: '🟢', label: '80+',       patch: { minRelevanceScore: 80 } },
  { key: 'medium',          icon: '🟠', label: '50+',       patch: { minRelevanceScore: 50 } },
  { key: 'us',              icon: '🇺🇸', label: 'US only',   patch: { clientCountry: ['United States'] } },
  { key: 'verdict-yes',     icon: '✅', label: 'AI: Yes',   patch: { semanticVerdict: ['Yes'] } },
  { key: 'verified',        icon: '💳', label: 'Verified',  patch: { clientPaymentVerified: ['Verified'] } },
  { key: 'big-spender',     icon: '💰', label: '$$$ 10k+',  patch: { clientSpend: '10000', clientSpendOp: '>=' } },
];

// Sort presets bump sort state on the parent (not filters). Kept as a
// separate list so we can call a different callback for them.
export const SORT_PILLS = [
  { key: 'sort-relevance', icon: '🎯', label: 'Top match',  sort: { sortBy: 'relevanceScore', sortOrder: 'desc' } },
  { key: 'sort-spend',     icon: '📈', label: 'Top spend',  sort: { sortBy: 'clientSpend',    sortOrder: 'desc' } },
];

export default function QuickPills({
  filters, sortBy, sortOrder,
  onApplyPatch, onApplySort, onClear,
  disabled = false,
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 -mx-1 px-1">
      {QUICK_PILLS.map((pill) => {
        const active = patchMatches(filters, pill.patch);
        return (
          <button
            key={pill.key}
            type="button"
            disabled={disabled}
            onClick={() => onApplyPatch(pill.patch, active)}
            className={
              'shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium border transition-colors ' +
              (active
                ? 'bg-purple-100 border-purple-400 text-purple-800'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50')
            }
          >
            <span className="text-sm leading-none">{pill.icon}</span>
            {pill.label}
          </button>
        );
      })}

      {/* Divider */}
      <span className="mx-1 h-4 w-px bg-gray-200 shrink-0" />

      {SORT_PILLS.map((pill) => {
        const active = sortBy === pill.sort.sortBy && sortOrder === pill.sort.sortOrder;
        return (
          <button
            key={pill.key}
            type="button"
            disabled={disabled}
            onClick={() => onApplySort(pill.sort)}
            className={
              'shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium border transition-colors ' +
              (active
                ? 'bg-purple-100 border-purple-400 text-purple-800'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50')
            }
          >
            <span className="text-sm leading-none">{pill.icon}</span>
            {pill.label}
          </button>
        );
      })}

      <span className="mx-1 h-4 w-px bg-gray-200 shrink-0" />

      <button
        type="button"
        disabled={disabled}
        onClick={onClear}
        className="shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium border bg-red-50 border-red-200 text-red-700 hover:bg-red-100 transition-colors"
      >
        <span className="text-sm leading-none">❌</span>
        Clear
      </button>
    </div>
  );
}
