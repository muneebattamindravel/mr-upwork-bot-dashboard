'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectTrigger, SelectContent, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import LoadingButton from '@/components/ui/loading-button';
import JobCard from '@/components/jobCard';
import { getFilteredJobs, startEmbedAllSearch, getEmbedAllSearchStatus } from '@/apis/jobs';
import { subDays, format } from 'date-fns';
import { RotateCcw, Download, SlidersHorizontal, X, Loader2, LayoutList, AlignJustify, Wifi, WifiOff } from 'lucide-react';
import { reprocessJobsStaticOnly, deleteAllJobs } from '../apis/jobs';
import axios from '../apis/axios';
import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_BASE_URL || '').replace('/up-bot-brain-api', '');
const SOCKET_PATH = '/up-bot-brain-api/socket.io';

const defaultFilters = {
  keyword:              '',
  minBudget:            '',
  maxBudget:            '',
  clientCountry:        '',
  clientPhoneVerified:  [],
  clientPaymentVerified:[],
  pricingModel:         [],
  clientRating:         '',
  clientRatingOp:       'any',
  clientSpend:          '',
  clientSpendOp:        'any',
  avgHourlyRate:        '',
  avgHourlyRateOp:      'any',
  startDate:            format(subDays(new Date(), 1), 'yyyy-MM-dd'),
  endDate:              format(new Date(), 'yyyy-MM-dd'),
  profile:              [],
  semanticVerdict:      [],
  mainCategory:         [],
  experienceLevel:      [],
  minRelevanceScore:    '',
};

const OPERATORS = [
  { value:'any', label:'–' },
  { value:'>',   label:'>' },
  { value:'>=',  label:'≥' },
  { value:'=',   label:'=' },
  { value:'<',   label:'<' },
  { value:'<=',  label:'≤' },
];

// ── Stable helper components (module-level to avoid Radix unmount) ─────────────
const FI = ({ label, children }) => (
  <div className="flex items-center gap-1.5 min-w-0">
    <span className="text-[11px] text-gray-400 shrink-0 leading-none">{label}</span>
    {children}
  </div>
);

const CS = ({ name, value, options, onSel, width = 'w-24' }) => (
  <Select value={value} onValueChange={v => onSel(name, v)}>
    <SelectTrigger className={`h-7 text-xs px-2 py-0 ${width} border-gray-200`}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent className="bg-white text-black text-xs">
      {options.map(o => <SelectItem key={o.value} value={o.value} className="text-xs py-1">{o.label}</SelectItem>)}
    </SelectContent>
  </Select>
);

const OI = ({ opName, opVal, inputName, inputVal, onSel, onChange }) => (
  <div className="flex items-center gap-0.5">
    <Select value={opVal} onValueChange={v => onSel(opName, v)}>
      <SelectTrigger className="h-7 text-xs px-1.5 w-10 border-gray-200 shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-white text-black text-xs">
        {OPERATORS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs py-1">{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
    <Input name={inputName} type="number" value={inputVal} onChange={onChange}
      className="h-7 text-xs px-2 w-20 border-gray-200" />
  </div>
);

const MSDropdown = ({ selected, options, onChange, placeholder = 'Any', width = 'w-44' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const toggle = val => {
    const next = selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val];
    onChange(next);
  };
  const label = selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} selected`;
  return (
    <div className={`relative ${width}`} ref={ref}>
      <button type="button" onClick={() => setOpen(p => !p)}
        className="h-7 w-full text-xs px-2 border border-gray-200 rounded flex items-center justify-between bg-white hover:bg-gray-50 truncate">
        <span className="truncate text-left">{label}</span>
        <span className="ml-1 shrink-0 text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded shadow-lg min-w-full max-h-52 overflow-y-auto text-xs">
          {options.map(o => (
            <label key={o} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)}
                className="accent-purple-600 h-3 w-3 shrink-0" />
              <span className="truncate">{o}</span>
            </label>
          ))}
          {options.length === 0 && <div className="px-3 py-2 text-gray-400">No categories</div>}
        </div>
      )}
    </div>
  );
};

const hasActiveFilters = (f) =>
  Object.entries(f).some(([k, v]) => {
    if (k === 'startDate' || k === 'endDate') return false;
    if (Array.isArray(v)) return v.length > 0;
    return v !== '' && v !== 'any' && v !== null && v !== undefined;
  });

const JobsPage = () => {
  const [filters, setFilters]             = useState({ ...defaultFilters });
  const [jobs, setJobs]                   = useState([]);
  const [loading, setLoading]             = useState(false);
  const [showFilters, setShowFilters]     = useState(true);
  const [dateRange, setDateRange]         = useState('last3d');
  const [sortBy, setSortBy]               = useState('postedDate');
  const [sortOrder, setSortOrder]         = useState('desc');
  const [deleting, setDeleting]           = useState(false);
  const [totalAll, setTotalAll]           = useState(0);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [reprocessing, setReprocessing]   = useState(false);
  const [profiles, setProfiles]           = useState([]);
  const [scraperCategories, setScraperCategories] = useState([]);
  const [limit, setLimit]                 = useState(100);
  const [viewMode, setViewMode]           = useState('detailed');
  const [liveActive, setLiveActive]       = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [searchMode, setSearchMode]       = useState('keyword'); // 'keyword' | 'semantic' | 'hybrid'
  const [embedProgress, setEmbedProgress] = useState(null); // { running, done, total, embedded, errors }
  const [embeddingAll, setEmbeddingAll]   = useState(false);
  const filtersRef    = useRef(filters);
  const limitRef      = useRef(limit);
  const sortByRef     = useRef(sortBy);
  const sortOrderRef  = useRef(sortOrder);
  const didMountRef   = useRef(false);

  const searchModeRef = useRef(searchMode);
  useEffect(() => { filtersRef.current = filters; }, [filters]);
  useEffect(() => { limitRef.current = limit; }, [limit]);
  useEffect(() => { sortByRef.current = sortBy; }, [sortBy]);
  useEffect(() => { sortOrderRef.current = sortOrder; }, [sortOrder]);
  useEffect(() => { searchModeRef.current = searchMode; }, [searchMode]);

  useEffect(() => {
    axios.get('/kb/list').then(r => setProfiles(r.data?.data?.profiles || [])).catch(() => {});
    axios.get('/settings').then(r => setScraperCategories(r.data?.data?.scraperCategories || [])).catch(() => {});
    getEmbedAllSearchStatus().then(r => setEmbedProgress(r.data?.data)).catch(() => {});
  }, []);

  // ── Socket.IO live feed ────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(SOCKET_URL, { path: SOCKET_PATH, transports: ['websocket', 'polling'] });
    socket.on('connect',    () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('job:new', (job) => {
      if (hasActiveFilters(filtersRef.current)) return; // pause when filters active
      setJobs(prev => {
        if (prev.some(j => j._id === job._id || j.url === job.url)) return prev;
        return [job, ...prev];
      });
      setTotalAll(n => n + 1);
      setTotalFiltered(n => n + 1);
      setLiveActive(true);
      setTimeout(() => setLiveActive(false), 3000);
      toast.success(`🆕 ${job.title?.slice(0, 60)}`, { duration: 4000 });
    });
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!embedProgress?.running) return;
    const interval = setInterval(async () => {
      try {
        const r = await getEmbedAllSearchStatus();
        const s = r.data?.data;
        setEmbedProgress(s);
        if (!s?.running) clearInterval(interval);
      } catch { clearInterval(interval); }
    }, 3000);
    return () => clearInterval(interval);
  }, [embedProgress?.running]);

  const handleEmbedAll = async () => {
    try {
      setEmbeddingAll(true);
      const r = await startEmbedAllSearch();
      setEmbedProgress(r.data?.data);
      toast.success('Job indexing started — this runs in the background');
    } catch { toast.error('Failed to start indexing'); }
    finally { setEmbeddingAll(false); }
  };

  const fetchJobs = useCallback(async (f = filtersRef.current, sb = sortByRef.current, so = sortOrderRef.current, lim = limitRef.current, sm = searchModeRef.current) => {
    try {
      setLoading(true);
      const q = { limit: lim, sortBy: sb, sortOrder: so, searchMode: sm };
      Object.entries(f).forEach(([k, v]) => {
        if (v === '' || v === null || v === undefined || v === 'any') return;
        if (Array.isArray(v)) { if (v.length > 0) q[k] = v.join('|||'); }
        else q[k] = v;
      });
      const res = await getFilteredJobs(q);
      const { jobs: j, totalAll: ta, total: t } = res.data.data || {};
      setTotalAll(ta || 0); setTotalFiltered(t || 0); setJobs(j || []);
    } catch { toast.error('Failed to fetch jobs'); }
    finally { setLoading(false); }
  }, []); // stable — takes all params explicitly

  const applyDateRange = (range, cur = filters) => {
    const now = new Date();
    const starts = { last24h: 1, last3d: 3, last7d: 7, last30d: 30, all: 365 * 20 };
    if (!starts[range]) return;
    const updated = { ...cur, startDate: format(subDays(now, starts[range]), 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
    setFilters(updated);
    fetchJobs(updated);
  };

  useEffect(() => { applyDateRange(dateRange); }, []);
  useEffect(() => {
    // Skip the very first mount — applyDateRange above handles the initial fetch.
    // Only re-fetch when sort/limit actually change after mount.
    if (!didMountRef.current) { didMountRef.current = true; return; }
    fetchJobs(filtersRef.current, sortBy, sortOrder, limit);
  }, [sortBy, sortOrder, limit]);

  const handleChange = e => {
    const { name, value, type } = e.target;
    const updated = { ...filters, [name]: type === 'number' ? parseFloat(value) || value : value };
    setFilters(updated);
    if (name === 'startDate' || name === 'endDate') fetchJobs(updated);
  };

  const handleSel = (name, value) => {
    const u = { ...filters, [name]: value };
    if (name === 'clientRatingOp'  && value === 'any') u.clientRating = '';
    if (name === 'clientSpendOp'   && value === 'any') u.clientSpend = '';
    if (name === 'avgHourlyRateOp' && value === 'any') u.avgHourlyRate = '';
    setFilters(u);
    const operatorOnlyFields = ['clientRatingOp', 'clientSpendOp', 'avgHourlyRateOp'];
    if (!operatorOnlyFields.includes(name)) fetchJobs(u);
  };

  const handleMSChange = (name, vals) => {
    const u = { ...filters, [name]: vals };
    setFilters(u);
    fetchJobs(u);
  };

  const clearFilters = () => {
    const c = { ...defaultFilters };
    setFilters(c); setDateRange('last24h'); setSortBy('postedDate'); setSortOrder('desc');
    fetchJobs(c, 'postedDate', 'desc', limit);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete ALL jobs? This is irreversible.')) return;
    setDeleting(true);
    try { await deleteAllJobs(); toast.success('All jobs deleted'); window.location.reload(); }
    catch { toast.error('Failed'); } finally { setDeleting(false); }
  };

  const handleReprocess = async () => {
    try { setReprocessing(true); const r = await reprocessJobsStaticOnly(); toast.success(r.data.message || 'Reprocessed'); await fetchJobs(); }
    catch { toast.error('Failed to reprocess'); } finally { setReprocessing(false); }
  };

  const exportCSV = () => {
    if (!jobs.length) return toast.error('No jobs to export');
    const h = ['Title', 'URL', 'Category', 'Posted', 'Pricing', 'MinBudget', 'MaxBudget', 'Country', 'ClientSpend', 'Score', 'Verdict'];
    const rows = jobs.map(j => [
      `"${(j.title || '').replace(/"/g, '""')}"`, j.url || '',
      `"${(j.mainCategory || '').replace(/"/g, '""')}"`,
      j.postedDate ? format(new Date(j.postedDate), 'yyyy-MM-dd') : '',
      j.pricingModel || '', j.minRange || 0, j.maxRange || 0,
      j.clientCountry || '', j.clientSpend || 0,
      j.relevance?.relevanceScore || 0, j.semanticRelevance?.verdict || '',
    ]);
    const csv = [h.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = `jobs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success(`Exported ${jobs.length} jobs`);
  };

  const activeCnt = Object.entries(filters).filter(([k, v]) => {
    if (k === 'startDate' || k === 'endDate') return false;
    if (Array.isArray(v)) return v.length > 0;
    return v !== '' && v !== 'any' && v !== null && v !== undefined;
  }).length;

  const filtersApplied = hasActiveFilters(filters);
  const pct = totalAll > 0 ? ((totalFiltered / totalAll) * 100).toFixed(1) : '0';

  return (
    <div className="p-4 space-y-3">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="page-title">🧠 Job Listings</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('detailed')}
              className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${viewMode === 'detailed' ? 'bg-purple-600 text-white' : 'hover:bg-gray-50 text-gray-600'}`}
              title="Full card view">
              <LayoutList className="w-3.5 h-3.5" /> Full
            </button>
            <button onClick={() => setViewMode('compact')}
              className={`px-2.5 py-1.5 text-xs flex items-center gap-1 border-l transition-colors ${viewMode === 'compact' ? 'bg-purple-600 text-white' : 'hover:bg-gray-50 text-gray-600'}`}
              title="Compact list view">
              <AlignJustify className="w-3.5 h-3.5" /> Compact
            </button>
          </div>
          <button onClick={handleReprocess} disabled={reprocessing}
            className="flex items-center gap-1 px-2.5 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-40">
            {reprocessing ? <Loader2 className="w-3 h-3 animate-spin" /> : '🔄'} Reprocess
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-1 px-2.5 py-1 text-xs border rounded hover:bg-gray-100 text-red-600 disabled:opacity-40">
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : '🗑️'} Delete All
          </button>
        </div>
      </div>

      {/* ── Filter toggle ── */}
      <div className="flex items-center gap-2">
        <button onClick={() => setShowFilters(p => !p)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded hover:bg-gray-50">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeCnt > 0 && (
            <span className="bg-purple-600 text-white text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
              {activeCnt}
            </span>
          )}
        </button>
        {activeCnt > 0 && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div className="border rounded-lg p-3 bg-gray-50/50 space-y-2">

          {/* Row 1 */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
            <FI label="Date">
              <Select value={dateRange} onValueChange={v => { setDateRange(v); if (v !== 'custom') applyDateRange(v); }}>
                <SelectTrigger className="h-7 text-xs px-2 w-28 border-gray-200"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white text-black text-xs">
                  {[{ value: 'last24h', label: 'Last 24h' }, { value: 'last3d', label: 'Last 3d' },
                    { value: 'last7d', label: 'Last 7d' }, { value: 'last30d', label: 'Last 30d' },
                    { value: 'all', label: 'All time' }, { value: 'custom', label: 'Custom' }]
                    .map(o => <SelectItem key={o.value} value={o.value} className="text-xs py-1">{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FI>
            {dateRange === 'custom' && <>
              <FI label="From">
                <Input type="date" name="startDate" value={filters.startDate} onChange={handleChange}
                  className="h-7 text-xs px-2 w-36 border-gray-200" />
              </FI>
              <FI label="To">
                <Input type="date" name="endDate" value={filters.endDate} onChange={handleChange}
                  className="h-7 text-xs px-2 w-36 border-gray-200" />
              </FI>
            </>}
            <FI label="Type">
              <MSDropdown selected={filters.pricingModel} options={['Fixed', 'Hourly']}
                onChange={vals => handleMSChange('pricingModel', vals)} placeholder="Any" width="w-24" />
            </FI>
            <FI label="Level">
              <MSDropdown selected={filters.experienceLevel} options={['Entry Level', 'Intermediate', 'Expert']}
                onChange={vals => handleMSChange('experienceLevel', vals)} placeholder="Any" width="w-32" />
            </FI>
            <FI label="Country">
              <Input name="clientCountry" value={filters.clientCountry} onChange={handleChange}
                className="h-7 text-xs px-2 w-20 border-gray-200" placeholder="US, UK…" />
            </FI>
            <FI label="Budget $">
              <Input name="minBudget" type="number" value={filters.minBudget} onChange={handleChange}
                className="h-7 text-xs px-2 w-20 border-gray-200" placeholder="min" />
            </FI>
            <span className="text-gray-300 text-xs">—</span>
            <Input name="maxBudget" type="number" value={filters.maxBudget} onChange={handleChange}
              className="h-7 text-xs px-2 w-20 border-gray-200" placeholder="max" />
          </div>

          <div className="border-t border-gray-200" />

          {/* Row 2 */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
            <FI label="Rating">
              <OI opName="clientRatingOp" opVal={filters.clientRatingOp} inputName="clientRating"
                inputVal={filters.clientRating} onSel={handleSel} onChange={handleChange} />
            </FI>
            <FI label="Spend $">
              <OI opName="clientSpendOp" opVal={filters.clientSpendOp} inputName="clientSpend"
                inputVal={filters.clientSpend} onSel={handleSel} onChange={handleChange} />
            </FI>
            <FI label="Avg $/hr">
              <OI opName="avgHourlyRateOp" opVal={filters.avgHourlyRateOp} inputName="avgHourlyRate"
                inputVal={filters.avgHourlyRate} onSel={handleSel} onChange={handleChange} />
            </FI>
            <FI label="Phone">
              <MSDropdown selected={filters.clientPhoneVerified} options={['Verified', 'Unverified']}
                onChange={vals => handleMSChange('clientPhoneVerified', vals)} placeholder="Any" width="w-28" />
            </FI>
            <FI label="Payment">
              <MSDropdown selected={filters.clientPaymentVerified} options={['Verified', 'Unverified']}
                onChange={vals => handleMSChange('clientPaymentVerified', vals)} placeholder="Any" width="w-28" />
            </FI>
            <div className="w-px h-4 bg-gray-300 mx-1 hidden sm:block" />
            <FI label="Matched Profile">
              <MSDropdown selected={filters.profile} options={profiles.map(p => p.profileName)}
                onChange={vals => handleMSChange('profile', vals)} placeholder="Any" width="w-36" />
            </FI>
            <FI label="Semantic">
              <MSDropdown selected={filters.semanticVerdict} options={['Yes', 'Maybe', 'No']}
                onChange={vals => handleMSChange('semanticVerdict', vals)} placeholder="Any" width="w-28" />
            </FI>
            <FI label="Category">
              <MSDropdown
                selected={filters.mainCategory}
                options={scraperCategories.map(c => c.name)}
                onChange={vals => { const u = { ...filters, mainCategory: vals }; setFilters(u); fetchJobs(u); }}
                width="w-44"
              />
            </FI>
            <FI label="Min Score">
              <Input name="minRelevanceScore" type="number" min="0" max="100"
                value={filters.minRelevanceScore} onChange={handleChange}
                className="h-7 text-xs px-2 w-16 border-gray-200" placeholder="0–100" />
            </FI>
          </div>

          <div className="border-t border-gray-200" />

          {/* Row 3 — Sort + prominent Search + Apply */}
          <div className="flex flex-wrap items-center gap-3">
            <FI label="Sort">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-7 text-xs px-2 w-36 border-gray-200"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white text-black text-xs">
                  <SelectItem value="postedDate"    className="text-xs py-1">📅 Posted Date</SelectItem>
                  <SelectItem value="relevanceScore" className="text-xs py-1">🧠 Relevance</SelectItem>
                  <SelectItem value="clientRating"  className="text-xs py-1">⭐ Rating</SelectItem>
                  <SelectItem value="clientSpend"   className="text-xs py-1">💰 Spend</SelectItem>
                  <SelectItem value="minRange"      className="text-xs py-1">💵 Budget</SelectItem>
                </SelectContent>
              </Select>
            </FI>
            <FI label="Order">
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="h-7 text-xs px-2 w-28 border-gray-200"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white text-black text-xs">
                  <SelectItem value="desc" className="text-xs py-1">↓ Highest</SelectItem>
                  <SelectItem value="asc"  className="text-xs py-1">↑ Lowest</SelectItem>
                </SelectContent>
              </Select>
            </FI>
            {/* Search mode toggle */}
            <TooltipProvider delayDuration={200}>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shrink-0">
                {[
                  {
                    mode: 'keyword',
                    label: '🔤',
                    heading: 'Keyword Search',
                    lines: [
                      'Every word must appear in the job (AND logic).',
                      '"react native" → exact phrase match.',
                      '-wordpress → exclude that word.',
                      'Synonyms auto-expand: node → nodejs,',
                      'frontend → react/angular/vue/svelte…',
                    ],
                  },
                  {
                    mode: 'semantic',
                    label: '🧠',
                    heading: 'Semantic Search',
                    lines: [
                      'AI understands the intent of your query —',
                      'no keyword overlap needed.',
                      '"build a chatbot" surfaces GPT Expert,',
                      'Conversational AI, OpenAI Integration jobs.',
                      'Requires jobs to be indexed first (🧠 Index button).',
                    ],
                  },
                  {
                    mode: 'hybrid',
                    label: '⚡',
                    heading: 'Hybrid Search',
                    lines: [
                      'Best of both modes.',
                      'Keywords narrow the candidate pool first,',
                      'then AI re-ranks those results by semantic',
                      'similarity to your query.',
                      'Most precise + most intelligent combined.',
                    ],
                  },
                ].map(({ mode, label, heading, lines }) => (
                  <Tooltip key={mode}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => { setSearchMode(mode); fetchJobs(filtersRef.current, sortByRef.current, sortOrderRef.current, limitRef.current, mode); }}
                        className={`px-2.5 py-1.5 text-xs border-r last:border-r-0 transition-colors ${searchMode === mode ? 'bg-purple-600 text-white' : 'hover:bg-gray-50 text-gray-600'}`}>
                        {label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[220px] p-3 text-xs leading-relaxed bg-gray-900 border-gray-700 text-white">
                      <p className="font-semibold text-sm mb-1.5 text-white">{label} {heading}</p>
                      {lines.map((line, i) => (
                        <p key={i} className="text-gray-300">{line}</p>
                      ))}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>

            {/* Search input */}
            <div className="flex-1 min-w-[160px] max-w-xs space-y-0.5">
              <Input
                name="keyword"
                value={filters.keyword}
                onChange={handleChange}
                onKeyDown={e => { if (e.key === 'Enter') fetchJobs(filters); }}
                className="h-8 text-sm px-3 border-purple-300 focus:border-purple-500 rounded-lg w-full"
                placeholder={searchMode === 'semantic' ? '🧠 Describe what you need…' : searchMode === 'hybrid' ? '⚡ Keywords + AI ranking…' : '🔤 node, "react native", -wordpress…'}
              />
              <p className="text-[10px] text-gray-400 px-1 leading-tight">
                {searchMode === 'keyword'  && <>AND logic · <span className="font-mono">"phrase"</span> · <span className="font-mono">-exclude</span> · synonyms auto-expanded</>}
                {searchMode === 'semantic' && <>AI matches by intent — no keywords needed · requires job indexing</>}
                {searchMode === 'hybrid'   && <>Keyword-filter candidates then AI-ranked by relevance</>}
              </p>
            </div>
            <LoadingButton loading={loading} onClick={() => fetchJobs(filters)}
              className="h-8 px-5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium">
              Apply
            </LoadingButton>
          </div>
        </div>
      )}

      {/* ── Results bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 py-2.5 px-1 border-b border-gray-100">
        {/* Left: counts + live status */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-sm font-semibold">
            <span className="text-purple-700 text-base font-bold">{jobs.length.toLocaleString()}</span>
            <span className="text-gray-400 mx-1 font-normal">/</span>
            <span className="text-gray-700">{totalFiltered.toLocaleString()}</span>
            <span className="text-gray-400 text-xs ml-1 font-normal">filtered</span>
            <span className="text-gray-400 mx-2 font-normal">·</span>
            <span className="text-gray-500 font-medium">{totalAll.toLocaleString()}</span>
            <span className="text-gray-400 text-xs ml-1 font-normal">total</span>
          </div>
          {totalFiltered > 0 && (
            <span className="text-xs px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full font-medium">
              {pct}% of total
            </span>
          )}
          {filtersApplied ? (
            <span className="text-xs px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full">
              ⏸ Live paused (filters active)
            </span>
          ) : (
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${
              liveActive
                ? 'bg-green-100 border-green-400 text-green-800'
                : socketConnected
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-gray-50 border-gray-200 text-gray-400'
            }`}>
              {socketConnected
                ? <><Wifi className="w-3 h-3" />{liveActive ? ' Updating…' : ' Live'}</>
                : <><WifiOff className="w-3 h-3" /> Offline</>}
            </span>
          )}
        </div>

        {/* Right: limit + refresh + export */}
        <div className="flex items-center gap-2">
          <FI label="Show">
            <select value={limit} onChange={e => setLimit(Number(e.target.value))}
              className="h-7 text-xs border border-gray-200 rounded px-2 bg-white focus:outline-none focus:ring-1 focus:ring-purple-400">
              {[25, 50, 100, 200, 500].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </FI>
          <button onClick={() => fetchJobs()} disabled={loading}
            className="p-1.5 rounded-full border hover:bg-gray-100 disabled:opacity-50" title="Refresh">
            <RotateCcw className={`w-3.5 h-3.5 text-purple-700 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {/* Embed All index button + progress */}
          {embedProgress && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              embedProgress.running
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : embedProgress.embedded >= embedProgress.total
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              {embedProgress.running
                ? `🧠 Indexing ${embedProgress.done}/${embedProgress.total}…`
                : `🧠 ${embedProgress.embedded?.toLocaleString()}/${embedProgress.total?.toLocaleString()} indexed`}
            </span>
          )}
          <button onClick={handleEmbedAll} disabled={embeddingAll || embedProgress?.running}
            className="flex items-center gap-1 px-2.5 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-40"
            title="Index all jobs for semantic search">
            {embeddingAll || embedProgress?.running ? <Loader2 className="w-3 h-3 animate-spin" /> : '🧠'} Index
          </button>
          <button onClick={exportCSV} disabled={!jobs.length}
            className="flex items-center gap-1 px-2.5 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-40">
            <Download className="w-3 h-3 text-green-700" /> Export
          </button>
        </div>
      </div>

      {/* ── Job list ── */}
      <div className={viewMode === 'compact' ? 'space-y-1' : 'space-y-4'}>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No jobs found with current filters.</p>
            <button onClick={clearFilters} className="mt-2 text-sm text-purple-600 hover:underline">Clear filters</button>
          </div>
        ) : (
          jobs.map((job, idx) => <JobCard key={job._id || idx} job={job} compact={viewMode === 'compact'} />)
        )}
      </div>
    </div>
  );
};

export default JobsPage;
