'use client';
import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectTrigger, SelectContent, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import LoadingButton from '@/components/ui/loading-button';
import JobCard from '@/components/jobCard';
import { getFilteredJobs } from '@/apis/jobs';
import { subDays, format } from 'date-fns';
import { RotateCcw, Download, SlidersHorizontal, X, Loader2 } from 'lucide-react';
import { reprocessJobsStaticOnly, deleteAllJobs } from '../apis/jobs';
import axios from '../apis/axios';

const defaultFilters = {
  keyword:              '',
  minBudget:            '',
  maxBudget:            '',
  clientCountry:        '',
  clientPhoneVerified:  'any',
  clientPaymentVerified:'any',
  pricingModel:         'any',
  clientRating:         '',
  clientRatingOp:       'any',
  clientSpend:          '',
  clientSpendOp:        'any',
  avgHourlyRate:        '',
  avgHourlyRateOp:      'any',
  startDate:            format(subDays(new Date(), 1), 'yyyy-MM-dd'),
  endDate:              format(new Date(), 'yyyy-MM-dd'),
  profile:              'any',
  semanticVerdict:      'any',
  experienceLevel:      'any',
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

// ── Stable helper components (defined OUTSIDE to avoid Radix unmount on re-render) ──

// Compact inline label+control pair
const FI = ({ label, children }) => (
  <div className="flex items-center gap-1.5 min-w-0">
    <span className="text-[11px] text-gray-400 shrink-0 leading-none">{label}</span>
    {children}
  </div>
);

// Compact select – same height as inputs
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

// Compact op+number pair
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

  useEffect(() => {
    axios.get('/kb/list').then(r => setProfiles(r.data?.data?.profiles || [])).catch(() => {});
  }, []);

  const applyDateRange = (range, cur = filters) => {
    const now = new Date();
    const starts = { last24h:1, last3d:3, last7d:7, last30d:30, all:365*20 };
    if (!starts[range]) return;
    const updated = { ...cur, startDate: format(subDays(now, starts[range]), 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
    setFilters(updated);
    fetchJobs(updated);
  };

  const fetchJobs = async (f = filters, sb = sortBy, so = sortOrder) => {
    try {
      setLoading(true);
      const q = { limit:100, sortBy:sb, sortOrder:so };
      Object.entries(f).forEach(([k,v]) => { if (v!=='' && v!==null && v!==undefined && v!=='any') q[k]=v; });
      const res = await getFilteredJobs(q);
      const { jobs:j, totalAll:ta, total:t } = res.data.data || {};
      setTotalAll(ta||0); setTotalFiltered(t||0); setJobs(j||[]);
    } catch { toast.error('Failed to fetch jobs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { applyDateRange(dateRange); }, []);
  useEffect(() => { fetchJobs(filters, sortBy, sortOrder); }, [sortBy, sortOrder]);

  const handleChange = e => {
    const { name, value, type } = e.target;
    const updated = { ...filters, [name]: type==='number' ? parseFloat(value)||value : value };
    setFilters(updated);
    if (name==='startDate'||name==='endDate') fetchJobs(updated);
  };

  const handleSel = (name, value) => {
    const u = { ...filters, [name]: value };
    if (name==='clientRatingOp'  && value==='any') u.clientRating='';
    if (name==='clientSpendOp'   && value==='any') u.clientSpend='';
    if (name==='avgHourlyRateOp' && value==='any') u.avgHourlyRate='';
    setFilters(u);
  };

  const clearFilters = () => {
    const c = { ...defaultFilters };
    setFilters(c); setDateRange('last24h'); setSortBy('postedDate'); setSortOrder('desc');
    fetchJobs(c, 'postedDate', 'desc');
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete ALL jobs? This is irreversible.')) return;
    setDeleting(true);
    try { await deleteAllJobs(); toast.success('All jobs deleted'); window.location.reload(); }
    catch { toast.error('Failed'); } finally { setDeleting(false); }
  };

  const handleReprocess = async () => {
    try { setReprocessing(true); const r=await reprocessJobsStaticOnly(); toast.success(r.data.message||'Reprocessed'); await fetchJobs(); }
    catch { toast.error('Failed to reprocess'); } finally { setReprocessing(false); }
  };

  const exportCSV = () => {
    if (!jobs.length) return toast.error('No jobs to export');
    const h = ['Title','URL','Category','Posted','Pricing','MinBudget','MaxBudget','Country','ClientSpend','Score','Verdict'];
    const rows = jobs.map(j => [
      `"${(j.title||'').replace(/"/g,'""')}"`, j.url||'',
      `"${(j.mainCategory||'').replace(/"/g,'""')}"`,
      j.postedDate ? format(new Date(j.postedDate),'yyyy-MM-dd') : '',
      j.pricingModel||'', j.minRange||0, j.maxRange||0,
      j.clientCountry||'', j.clientSpend||0,
      j.relevance?.relevanceScore||0, j.semanticRelevance?.verdict||'',
    ]);
    const csv = [h.join(','),...rows.map(r=>r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    link.download = `jobs-${format(new Date(),'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success(`Exported ${jobs.length} jobs`);
  };

  const activeCnt = Object.entries(filters).filter(([k,v]) =>
    k!=='startDate' && k!=='endDate' && v!==''&&v!=='any'&&v!==null&&v!==undefined).length;

  return (
    <div className="p-4 space-y-3">

      {/* ── Header row ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="page-title">🧠 Job Listings</h2>
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className="text-gray-500 text-xs">
            <strong>{jobs.length}</strong>/<strong>{totalFiltered}</strong> · <strong>{totalAll}</strong> total
          </span>
          <button onClick={() => fetchJobs()} disabled={loading}
            className="p-1.5 rounded-full border hover:bg-gray-100 disabled:opacity-50" title="Refresh">
            <RotateCcw className={`w-3.5 h-3.5 text-purple-700 ${loading?'animate-spin':''}`} />
          </button>
          <button onClick={exportCSV} disabled={!jobs.length}
            className="flex items-center gap-1 px-2.5 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-40">
            <Download className="w-3 h-3 text-green-700" /> Export
          </button>
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

      {/* ── Filter toggle row ── */}
      <div className="flex items-center gap-2">
        <button onClick={() => setShowFilters(p=>!p)}
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

      {/* ── Compact filter panel ── */}
      {showFilters && (
        <div className="border rounded-lg p-3 bg-gray-50/50 space-y-2">

          {/* Row 1 — Basic */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
            <FI label="Date">
              <Select value={dateRange} onValueChange={v => { setDateRange(v); if (v !== 'custom') applyDateRange(v); }}>
                <SelectTrigger className="h-7 text-xs px-2 w-28 border-gray-200"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white text-black text-xs">
                  {[{value:'last24h',label:'Last 24h'},{value:'last3d',label:'Last 3d'},
                    {value:'last7d',label:'Last 7d'},{value:'last30d',label:'Last 30d'},
                    {value:'all',label:'All time'},{value:'custom',label:'Custom'}]
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
            <FI label="Search">
              <Input name="keyword" value={filters.keyword} onChange={handleChange}
                className="h-7 text-xs px-2 w-44 border-gray-200" placeholder="keyword..." />
            </FI>
            <FI label="Type">
              <CS name="pricingModel" value={filters.pricingModel} onSel={handleSel} width="w-24"
                options={[{value:'any',label:'Any'},{value:'fixed',label:'Fixed'},{value:'hourly',label:'Hourly'}]} />
            </FI>
            <FI label="Level">
              <CS name="experienceLevel" value={filters.experienceLevel} onSel={handleSel} width="w-28"
                options={[{value:'any',label:'Any'},{value:'Entry Level',label:'Entry'},
                  {value:'Intermediate',label:'Mid'},{value:'Expert',label:'Expert'}]} />
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

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Row 2 — Client + Scoring */}
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
              <CS name="clientPhoneVerified" value={filters.clientPhoneVerified} onSel={handleSel} width="w-16"
                options={[{value:'any',label:'Any'},{value:'true',label:'Yes'},{value:'false',label:'No'}]} />
            </FI>
            <FI label="Payment">
              <CS name="clientPaymentVerified" value={filters.clientPaymentVerified} onSel={handleSel} width="w-16"
                options={[{value:'any',label:'Any'},{value:'true',label:'Yes'},{value:'false',label:'No'}]} />
            </FI>
            {/* scoring */}
            <div className="w-px h-4 bg-gray-300 mx-1 hidden sm:block" />
            <FI label="Profile">
              <CS name="profile" value={filters.profile} onSel={handleSel} width="w-32"
                options={[{value:'any',label:'Any'},...profiles.map(p=>({value:p.profileName,label:p.profileName}))]} />
            </FI>
            <FI label="AI">
              <CS name="semanticVerdict" value={filters.semanticVerdict} onSel={handleSel} width="w-20"
                options={[{value:'any',label:'Any'},{value:'Yes',label:'✅ Yes'},{value:'Maybe',label:'🟡 Maybe'},{value:'No',label:'❌ No'}]} />
            </FI>
            <FI label="Min Score">
              <Input name="minRelevanceScore" type="number" min="0" max="100"
                value={filters.minRelevanceScore} onChange={handleChange}
                className="h-7 text-xs px-2 w-16 border-gray-200" placeholder="0–100" />
            </FI>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Row 3 — Sort + Apply */}
          <div className="flex flex-wrap items-center gap-3">
            <FI label="Sort">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-7 text-xs px-2 w-36 border-gray-200"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white text-black text-xs">
                  <SelectItem value="postedDate"   className="text-xs py-1">📅 Posted Date</SelectItem>
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
            <LoadingButton loading={loading} onClick={() => fetchJobs(filters)}
              className="h-7 px-4 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded">
              Apply
            </LoadingButton>
          </div>
        </div>
      )}

      {/* ── Job list ── */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No jobs found with current filters.</p>
            <button onClick={clearFilters} className="mt-2 text-sm text-purple-600 hover:underline">Clear filters</button>
          </div>
        ) : (
          jobs.map((job, idx) => <JobCard key={idx} job={job} />)
        )}
      </div>
    </div>
  );
};

export default JobsPage;
