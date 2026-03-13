'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectTrigger, SelectContent, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import LoadingButton from '@/components/ui/loading-button';
import JobCard from '@/components/jobCard';
import { getFilteredJobs } from '@/apis/jobs';
import { subDays, format } from 'date-fns';
import { RotateCcw, Download, SlidersHorizontal, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
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
  { value:'any', label:'any' },
  { value:'>',   label:'>' },
  { value:'>=',  label:'≥' },
  { value:'=',   label:'=' },
  { value:'<',   label:'<' },
  { value:'<=',  label:'≤' },
];

const FilterSection = ({ title, open, onToggle, children }) => (
  <div className="border rounded-lg overflow-hidden">
    <button type="button" onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700">
      {title}
      {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
    </button>
    {open && (
      <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {children}
      </div>
    )}
  </div>
);

const FF = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <Label className="field-label">{label}</Label>
    {children}
  </div>
);

const OpInput = ({ opName, opVal, inputName, inputVal, onSel, onChange }) => (
  <div className="flex items-center gap-1">
    <Select value={opVal} onValueChange={v => onSel(opName, v)}>
      <SelectTrigger className="select-trigger w-[62px] shrink-0"><SelectValue /></SelectTrigger>
      <SelectContent className="select-content bg-white text-black">
        {OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
    <Input name={inputName} type="number" value={inputVal} onChange={onChange} className="input-field" />
  </div>
);

const JobsPage = () => {
  const [filters, setFilters]             = useState({ ...defaultFilters });
  const [jobs, setJobs]                   = useState([]);
  const [loading, setLoading]             = useState(false);
  const [showFilters, setShowFilters]     = useState(true);
  const [sections, setSections]           = useState({ basic: true, client: false, scoring: false });
  const [dateRange, setDateRange]         = useState('last3d');
  const [sortBy, setSortBy]               = useState('postedDate');
  const [sortOrder, setSortOrder]         = useState('desc');
  const [deleting, setDeleting]           = useState(false);
  const [totalAll, setTotalAll]           = useState(0);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [reprocessing, setReprocessing]   = useState(false);
  const [profiles, setProfiles]           = useState([]);

  useEffect(() => {
    axios.get('/kb/list').then(r => setProfiles(r.data?.data || [])).catch(() => {});
  }, []);

  const toggleSec = k => setSections(p => ({ ...p, [k]: !p[k] }));

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

  const Sel = ({ name, value, options }) => (
    <Select value={value} onValueChange={v => handleSel(name, v)}>
      <SelectTrigger className="select-trigger"><SelectValue placeholder="any" /></SelectTrigger>
      <SelectContent className="select-content bg-white text-black">
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="page-title">🧠 Relevant Job Listings</h2>
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className="text-gray-500">
            <strong>{jobs.length}</strong>/<strong>{totalFiltered}</strong> shown · <strong>{totalAll}</strong> total
          </span>
          <button onClick={() => fetchJobs()} disabled={loading}
            className="p-2 rounded-full border hover:bg-gray-100 disabled:opacity-50" title="Refresh">
            <RotateCcw className={`w-4 h-4 text-purple-700 ${loading?'animate-spin':''}`} />
          </button>
          <button onClick={exportCSV} disabled={!jobs.length}
            className="flex items-center gap-1 px-3 py-1.5 border rounded hover:bg-gray-100 disabled:opacity-40">
            <Download className="w-4 h-4 text-green-700" /> Export
          </button>
          <button onClick={handleReprocess} disabled={reprocessing}
            className="btn-outline text-blue-600 flex items-center gap-1">
            {reprocessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '🔄'} Reprocess
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="btn-outline text-red-600 flex items-center gap-1">
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '🗑️'} Delete All
          </button>
        </div>
      </div>

      {/* Filter toggle */}
      <div className="flex items-center gap-2">
        <button onClick={() => setShowFilters(p=>!p)}
          className="flex items-center gap-2 btn-outline text-sm">
          <SlidersHorizontal className="w-4 h-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
          {activeCnt > 0 && (
            <span className="bg-purple-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
              {activeCnt}
            </span>
          )}
        </button>
        {activeCnt > 0 && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700">
            <X className="w-3.5 h-3.5" /> Clear all
          </button>
        )}
      </div>

      {showFilters && (
        <div className="space-y-2">
          {/* Basic */}
          <FilterSection title="📋 Basic" open={sections.basic} onToggle={() => toggleSec('basic')}>
            <FF label="📅 Date Range">
              <Sel name="dateRange_ui" value={dateRange} options={[
                {value:'last24h',label:'Last 24h'},{value:'last3d',label:'Last 3 days'},
                {value:'last7d',label:'Last 7 days'},{value:'last30d',label:'Last 30 days'},
                {value:'all',label:'All Time'},{value:'custom',label:'Custom'},
              ]} />
            </FF>
            {dateRange === 'custom' && <>
              <FF label="Start Date"><Input type="date" name="startDate" value={filters.startDate} onChange={handleChange} className="input-field" /></FF>
              <FF label="End Date"><Input type="date" name="endDate" value={filters.endDate} onChange={handleChange} className="input-field" /></FF>
            </>}
            <FF label="🔍 Keyword">
              <Input name="keyword" value={filters.keyword} onChange={handleChange} className="input-field" placeholder="Title, description..." />
            </FF>
            <FF label="💼 Job Type">
              <Sel name="pricingModel" value={filters.pricingModel} options={[
                {value:'any',label:'Any'},{value:'fixed',label:'Fixed Price'},{value:'hourly',label:'Hourly'}
              ]} />
            </FF>
            <FF label="🎓 Experience Level">
              <Sel name="experienceLevel" value={filters.experienceLevel} options={[
                {value:'any',label:'Any'},{value:'Entry Level',label:'Entry Level'},
                {value:'Intermediate',label:'Intermediate'},{value:'Expert',label:'Expert'}
              ]} />
            </FF>
            <FF label="🌍 Country">
              <Input name="clientCountry" placeholder="e.g. US, UK" value={filters.clientCountry} onChange={handleChange} className="input-field" />
            </FF>
            <FF label="💵 Min Budget">
              <Input name="minBudget" type="number" value={filters.minBudget} onChange={handleChange} className="input-field" placeholder="0" />
            </FF>
            <FF label="💵 Max Budget">
              <Input name="maxBudget" type="number" value={filters.maxBudget} onChange={handleChange} className="input-field" placeholder="∞" />
            </FF>
          </FilterSection>

          {/* Client Quality */}
          <FilterSection title="👤 Client Quality" open={sections.client} onToggle={() => toggleSec('client')}>
            <FF label="⭐ Rating">
              <OpInput opName="clientRatingOp" opVal={filters.clientRatingOp} inputName="clientRating" inputVal={filters.clientRating} onSel={handleSel} onChange={handleChange} />
            </FF>
            <FF label="💰 Total Spend">
              <OpInput opName="clientSpendOp" opVal={filters.clientSpendOp} inputName="clientSpend" inputVal={filters.clientSpend} onSel={handleSel} onChange={handleChange} />
            </FF>
            <FF label="⚖️ Avg Hourly Rate">
              <OpInput opName="avgHourlyRateOp" opVal={filters.avgHourlyRateOp} inputName="avgHourlyRate" inputVal={filters.avgHourlyRate} onSel={handleSel} onChange={handleChange} />
            </FF>
            <FF label="📞 Phone Verified">
              <Sel name="clientPhoneVerified" value={filters.clientPhoneVerified} options={[{value:'any',label:'Any'},{value:'true',label:'Yes'},{value:'false',label:'No'}]} />
            </FF>
            <FF label="💳 Payment Verified">
              <Sel name="clientPaymentVerified" value={filters.clientPaymentVerified} options={[{value:'any',label:'Any'},{value:'true',label:'Yes'},{value:'false',label:'No'}]} />
            </FF>
          </FilterSection>

          {/* Scoring */}
          <FilterSection title="🧠 Scoring & Relevance" open={sections.scoring} onToggle={() => toggleSec('scoring')}>
            <FF label="🏷 Profile Match">
              <Sel name="profile" value={filters.profile} options={[
                {value:'any',label:'Any Profile'},
                ...profiles.map(p => ({value:p.profileName,label:p.profileName}))
              ]} />
            </FF>
            <FF label="🤖 AI Verdict">
              <Sel name="semanticVerdict" value={filters.semanticVerdict} options={[
                {value:'any',label:'Any'},{value:'Yes',label:'✅ Yes'},
                {value:'Maybe',label:'🟡 Maybe'},{value:'No',label:'❌ No'}
              ]} />
            </FF>
            <FF label="📊 Min Relevance Score">
              <Input name="minRelevanceScore" type="number" min="0" max="100"
                value={filters.minRelevanceScore} onChange={handleChange}
                className="input-field" placeholder="e.g. 50" />
            </FF>
          </FilterSection>

          {/* Sort + Apply */}
          <div className="flex flex-wrap items-end gap-3 pt-1 border-t">
            <FF label="📊 Sort By">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="select-trigger w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent className="select-content bg-white text-black">
                  <SelectItem value="postedDate">📅 Posted Date</SelectItem>
                  <SelectItem value="relevanceScore">🧠 Relevance Score</SelectItem>
                  <SelectItem value="clientRating">⭐ Client Rating</SelectItem>
                  <SelectItem value="clientSpend">💰 Client Spend</SelectItem>
                  <SelectItem value="minRange">💵 Min Budget</SelectItem>
                </SelectContent>
              </Select>
            </FF>
            <FF label="⬇️ Order">
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="select-trigger w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent className="select-content bg-white text-black">
                  <SelectItem value="desc">Newest / Highest</SelectItem>
                  <SelectItem value="asc">Oldest / Lowest</SelectItem>
                </SelectContent>
              </Select>
            </FF>
            <div className="mb-0.5">
              <LoadingButton loading={loading} onClick={() => fetchJobs(filters)} className="btn-primary h-9 px-6">
                Apply Filters
              </LoadingButton>
            </div>
          </div>
        </div>
      )}

      {/* Job list */}
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
