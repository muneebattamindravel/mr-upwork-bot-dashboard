import React, { useEffect, useState, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  getAnalyticsSummary, getJobsOverTime, getScoreDistribution, getTopCountries,
  getTopCategories, getProfileBreakdown, getPricingSplit, getEmergingKeywords,
  getPostingHeatmap, getHourlyDistribution, getSemanticVerdictBreakdown,
  getBudgetDistribution, getExperienceBreakdown,
  getCategoriesByCountry, getKeywordsByCategory, getMainCategoryBreakdown,
  getAnalyticsCacheStatus, flushAnalyticsCache,
} from '../apis/analytics';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Maximize2, X, RefreshCw } from 'lucide-react';

const COLORS = ['#7c3aed','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316','#ec4899'];
const DAYS   = [' Mon',' Tue',' Wed',' Thu',' Fri',' Sat',' Sun'];

// ── Pakistan Standard Time helpers (UTC+5, no DST) ───────────────────────────
const PKT_OFFSET = 5;
const utcToPkt = (utcHour) => (utcHour + PKT_OFFSET) % 24;
const pktLabel = (utcHour) => {
  const h = utcToPkt(utcHour);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}${ampm}`;
};
const pktFullLabel = (utcHour) => {
  const h = utcToPkt(utcHour);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:00 ${ampm} PKT`;
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub }) => (
  <div className="bg-white border rounded-lg p-4 shadow-sm">
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div className="text-2xl font-bold text-purple-700">{value}</div>
    {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
  </div>
);

// ── Chart Card with expand ─────────────────────────────────────────────────────
const ChartCard = ({ title, loading, onExpand, children }) => (
  <div className="bg-white border rounded-lg p-4 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className="text-sm font-semibold text-gray-700">{title}</div>
      {onExpand && (
        <button onClick={onExpand} className="p-1 rounded hover:bg-gray-100" title="Expand">
          <Maximize2 className="w-4 h-4 text-gray-400" />
        </button>
      )}
    </div>
    {loading ? (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
      </div>
    ) : children}
  </div>
);

// ── Expand Modal ───────────────────────────────────────────────────────────────
const ExpandModal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b">
        <div className="font-semibold text-gray-800">{title}</div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">{children}</div>
    </div>
  </div>
);

// ── Country multi-select for heatmap filter ────────────────────────────────────
const CountryMultiSelect = ({ options, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const toggle = (v) => onChange(selected.includes(v) ? selected.filter(c => c !== v) : [...selected, v]);
  const label = selected.length === 0 ? 'All Countries' : selected.length === 1 ? selected[0] : `${selected.length} countries`;
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(p => !p)}
        className="h-7 text-xs px-2.5 border border-gray-200 rounded bg-white hover:bg-gray-50 flex items-center gap-1.5 min-w-[130px] justify-between">
        <span className="truncate">{label}</span>
        <span className="text-gray-400 shrink-0">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg min-w-full max-h-48 overflow-y-auto text-xs">
          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer border-b">
            <input type="checkbox" checked={selected.length === 0} onChange={() => onChange([])}
              className="accent-purple-600 h-3 w-3" />
            <span className="font-medium">All Countries</span>
          </label>
          {options.map(c => (
            <label key={c} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={selected.includes(c)} onChange={() => toggle(c)}
                className="accent-purple-600 h-3 w-3" />
              <span>{c}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Heatmap (green colour scheme, PKT times, country filter) ──────────────────
const PostingHeatmap = ({ data, countryOptions, selectedCountries, onCountriesChange, heatmapLoading }) => {
  const max = data && data.length ? Math.max(...data.map(d => d.count), 1) : 1;
  const cellStyle = (count) => {
    if (!count) return { backgroundColor: '#f3f4f6' };
    const pct = count / max;
    if (pct < 0.15) return { backgroundColor: '#fef9c3' };
    if (pct < 0.30) return { backgroundColor: '#fde68a' };
    if (pct < 0.50) return { backgroundColor: '#86efac' };
    if (pct < 0.70) return { backgroundColor: '#4ade80' };
    if (pct < 0.85) return { backgroundColor: '#22c55e' };
    return { backgroundColor: '#15803d' };
  };
  const grid = {};
  (data || []).forEach(d => { grid[`${d.day}-${d.hour}`] = d.count; });

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-500">Filter by country:</span>
        <CountryMultiSelect options={countryOptions} selected={selectedCountries} onChange={onCountriesChange} />
      </div>
      {heatmapLoading ? (
        <div className="flex justify-center items-center h-36">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No data</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[620px]">
            <div className="flex ml-10 mb-1">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="flex-1 text-center text-[9px] text-gray-400">
                  {h % 3 === 0 ? pktLabel(h) : ''}
                </div>
              ))}
            </div>
            {DAYS.map((day, d) => (
              <div key={d} className="flex items-center mb-0.5">
                <div className="w-10 text-[10px] text-gray-500 text-right pr-2">{day}</div>
                {Array.from({ length: 24 }, (_, h) => {
                  const count = grid[`${d}-${h}`] || 0;
                  return (
                    <div key={h} className="flex-1 m-px group relative">
                      <div className="w-full aspect-square rounded-sm" style={cellStyle(count)} />
                      {count > 0 && (
                        <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block
                          bg-gray-800 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap pointer-events-none">
                          {day.trim()} {pktFullLabel(h)} — {count} jobs
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="flex items-center gap-1 mt-3 justify-end">
              <span className="text-[10px] text-gray-400 mr-1">Less</span>
              {['#f3f4f6','#fef9c3','#fde68a','#86efac','#4ade80','#22c55e','#15803d'].map((c, i) => (
                <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: c }} />
              ))}
              <span className="text-[10px] text-gray-400 ml-1">More</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const AnalyticsPage = () => {
  const [summary, setSummary]                   = useState(null);
  const [jobsOverTime, setJobsOverTime]         = useState([]);
  const [scoreDistribution, setScoreDist]       = useState([]);
  const [topCountries, setTopCountries]         = useState([]);
  const [topCategories, setTopCategories]       = useState([]);
  const [profileBreakdown, setProfileBreakdown] = useState([]);
  const [mainCatBreakdown, setMainCatBreakdown] = useState([]);
  const [pricingSplit, setPricingSplit]         = useState([]);
  const [emergingKeywords, setKeywords]         = useState([]);
  const [heatmap, setHeatmap]                   = useState([]);
  const [hourly, setHourly]                     = useState([]);
  const [verdict, setVerdict]                   = useState([]);
  const [budget, setBudget]                     = useState([]);
  const [experience, setExperience]             = useState([]);
  const [categoriesByCountry, setCatByCountry]  = useState([]);
  const [keywordsByCategory, setKwByCategory]   = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [timeRange, setTimeRange]               = useState(30);
  const [expandModal, setExpandModal]           = useState(null);
  const [modalLoading, setModalLoading]         = useState(false);
  const [heatmapCountries, setHeatmapCountries] = useState([]);
  const [heatmapLoading, setHeatmapLoading]     = useState(false);
  const [cacheInfo, setCacheInfo]               = useState(null);
  const [flushing, setFlushing]                 = useState(false);

  const [countriesLimit, setCountriesLimit]   = useState(10);
  const [categoriesLimit, setCategoriesLimit] = useState(10);
  const [keywordsLimit, setKeywordsLimit]     = useState(20);
  const [cbcCountriesLimit, setCbcLimit]      = useState(8);
  const [kbcLimit, setKbcLimit]               = useState(10);

  const fetchAll = async (range = timeRange) => {
    setLoading(true);
    try {
      const [
        sumR, jotR, scR, coR, caR, prR, mcR, pnR, kwR,
        hmR, hrR, vdR, bdR, exR, cbcR, kbcR
      ] = await Promise.all([
        getAnalyticsSummary(),
        getJobsOverTime(range),
        getScoreDistribution(),
        getTopCountries(countriesLimit),
        getTopCategories(categoriesLimit),
        getProfileBreakdown(),
        getMainCategoryBreakdown(),
        getPricingSplit(),
        getEmergingKeywords(7, keywordsLimit),
        getPostingHeatmap(range, heatmapCountries),
        getHourlyDistribution(range),
        getSemanticVerdictBreakdown(),
        getBudgetDistribution(),
        getExperienceBreakdown(),
        getCategoriesByCountry(cbcCountriesLimit, 5),
        getKeywordsByCategory(kbcLimit),
      ]);
      setSummary(sumR.data.data);
      setJobsOverTime(jotR.data.data || []);
      setScoreDist(scR.data.data || []);
      setTopCountries(coR.data.data || []);
      setTopCategories(caR.data.data || []);
      setProfileBreakdown(prR.data.data || []);
      setMainCatBreakdown(mcR.data.data || []);
      setPricingSplit(pnR.data.data || []);
      setKeywords(kwR.data.data || []);
      setHeatmap(hmR.data.data || []);
      setHourly(hrR.data.data || []);
      setVerdict(vdR.data.data || []);
      setBudget(bdR.data.data || []);
      setExperience(exR.data.data || []);
      setCatByCountry(cbcR.data.data || []);
      setKwByCategory(kbcR.data.data || []);

      // Fetch cache freshness info after all charts have been computed & cached
      try {
        const ciR = await getAnalyticsCacheStatus();
        setCacheInfo(ciR.data?.data);
      } catch {}
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleForceRefresh = async () => {
    setFlushing(true);
    try {
      await flushAnalyticsCache();
      toast.success('Cache cleared — recomputing all charts…');
      await fetchAll();
    } catch {
      toast.error('Failed to refresh cache');
    } finally {
      setFlushing(false);
    }
  };

  useEffect(() => { fetchAll(); }, [timeRange]);

  const handleHeatmapCountryChange = async (countries) => {
    setHeatmapCountries(countries);
    setHeatmapLoading(true);
    try {
      const r = await getPostingHeatmap(timeRange, countries);
      setHeatmap(r.data.data || []);
    } catch { toast.error('Failed to update heatmap'); }
    finally { setHeatmapLoading(false); }
  };

  const refetchCountries  = async (lim) => { setModalLoading(true); try { const r = await getTopCountries(lim);          setTopCountries(r.data.data||[]); } finally { setModalLoading(false); } };
  const refetchCategories = async (lim) => { setModalLoading(true); try { const r = await getTopCategories(lim);         setTopCategories(r.data.data||[]); } finally { setModalLoading(false); } };
  const refetchKeywords   = async (lim) => { setModalLoading(true); try { const r = await getEmergingKeywords(7,lim);    setKeywords(r.data.data||[]); } finally { setModalLoading(false); } };
  const refetchCbc        = async (lim) => { setModalLoading(true); try { const r = await getCategoriesByCountry(lim,5); setCatByCountry(r.data.data||[]); } finally { setModalLoading(false); } };
  const refetchKbc        = async (lim) => { setModalLoading(true); try { const r = await getKeywordsByCategory(lim);    setKwByCategory(r.data.data||[]); } finally { setModalLoading(false); } };

  const hBarChart = (data, dataKey, nameKey, fill, height = 260) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey={nameKey} tick={{ fontSize: 10 }} width={110} />
        <Tooltip />
        <Bar dataKey={dataKey} fill={fill} name="Jobs" radius={[0,3,3,0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const VERDICT_COLORS = { Yes:'#10b981', Maybe:'#f59e0b', No:'#ef4444', 'Not Scored':'#9ca3af' };
  const hourlyWithPkt = hourly.map(d => ({ ...d, pktHour: pktLabel(d.hour) }));

  const renderModalContent = (key) => {
    if (modalLoading) return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
      </div>
    );
    switch (key) {
      case 'countries':
        return (
          <>
            <div className="flex gap-2 mb-3">
              {[10,25,50,100].map(n => (
                <button key={n} onClick={() => { setCountriesLimit(n); refetchCountries(n); }}
                  className={`text-xs px-2.5 py-1 rounded border ${countriesLimit===n?'bg-purple-600 text-white':'hover:bg-gray-100'}`}>
                  Top {n}
                </button>
              ))}
            </div>
            {hBarChart(topCountries, 'count', 'country', '#3b82f6', Math.max(260, topCountries.length * 28))}
          </>
        );
      case 'categories':
        return (
          <>
            <div className="flex gap-2 mb-3">
              {[10,25,50].map(n => (
                <button key={n} onClick={() => { setCategoriesLimit(n); refetchCategories(n); }}
                  className={`text-xs px-2.5 py-1 rounded border ${categoriesLimit===n?'bg-purple-600 text-white':'hover:bg-gray-100'}`}>
                  Top {n}
                </button>
              ))}
            </div>
            {hBarChart(topCategories, 'count', 'category', '#10b981', Math.max(260, topCategories.length * 28))}
          </>
        );
      case 'keywords':
        return (
          <>
            <div className="flex gap-2 mb-3">
              {[20,50,100].map(n => (
                <button key={n} onClick={() => { setKeywordsLimit(n); refetchKeywords(n); }}
                  className={`text-xs px-2.5 py-1 rounded border ${keywordsLimit===n?'bg-purple-600 text-white':'hover:bg-gray-100'}`}>
                  Top {n}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={Math.max(300, emergingKeywords.length * 22)}>
              <BarChart data={emergingKeywords} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="word" tick={{ fontSize: 10 }} width={90} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" name="Mentions" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        );
      case 'cbc': {
        const catColors = ['#7c3aed','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316','#ec4899'];
        return (
          <>
            <div className="flex gap-2 mb-3">
              {[6,8,10,15].map(n => (
                <button key={n} onClick={() => { setCbcLimit(n); refetchCbc(n); }}
                  className={`text-xs px-2.5 py-1 rounded border ${cbcCountriesLimit===n?'bg-purple-600 text-white':'hover:bg-gray-100'}`}>
                  Top {n} Countries
                </button>
              ))}
            </div>
            <div className="space-y-4">
              {categoriesByCountry.map((row, ci) => (
                <div key={ci}>
                  <div className="text-xs font-semibold text-gray-600 mb-1">🌍 {row.country}</div>
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={row.categories} layout="vertical" margin={{ left:0, right:0, top:0, bottom:0 }}>
                      <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="category" tick={{ fontSize: 9 }} width={140} />
                      <Tooltip />
                      <Bar dataKey="count" fill={catColors[ci % catColors.length]} radius={[0,3,3,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </>
        );
      }
      case 'kbc':
        return (
          <>
            <div className="flex gap-2 mb-3">
              {[10,20,30].map(n => (
                <button key={n} onClick={() => { setKbcLimit(n); refetchKbc(n); }}
                  className={`text-xs px-2.5 py-1 rounded border ${kbcLimit===n?'bg-purple-600 text-white':'hover:bg-gray-100'}`}>
                  Top {n} Keywords
                </button>
              ))}
            </div>
            <div className="space-y-5">
              {keywordsByCategory.map((row, ci) => (
                <div key={ci}>
                  <div className="text-xs font-semibold text-gray-600 mb-1">📂 {row.category}</div>
                  <ResponsiveContainer width="100%" height={Math.max(80, row.keywords.length * 18)}>
                    <BarChart data={row.keywords} layout="vertical" margin={{ left:0, right:0, top:0, bottom:0 }}>
                      <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="word" tick={{ fontSize: 9 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill={COLORS[ci % COLORS.length]} radius={[0,3,3,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const heatmapCountryOptions = topCountries.map(c => c.country);

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="page-title">📊 Analytics</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Range:</label>
          <select value={timeRange} onChange={e => setTimeRange(Number(e.target.value))}
            className="text-sm border rounded px-2 py-1">
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
          <button onClick={() => fetchAll()} className="btn-outline text-xs px-3 py-1.5">Refresh</button>
        </div>
      </div>

      {/* Cache freshness banner */}
      {cacheInfo?.cached && (() => {
        const ageMs = Date.now() - new Date(cacheInfo.oldestComputedAt).getTime();
        const nextInMin = Math.max(0, Math.round((30 * 60 * 1000 - ageMs) / 60000));
        return (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <span>🗄️ Data last computed <strong className="text-gray-700">{formatDistanceToNow(new Date(cacheInfo.oldestComputedAt))} ago</strong></span>
            <span className="text-gray-300 hidden sm:inline">·</span>
            <span>Auto-refreshes every <strong className="text-gray-600">30 min – 2 hr</strong> per chart</span>
            <span className="text-gray-300 hidden sm:inline">·</span>
            {nextInMin > 0
              ? <span>Next auto-refresh: <strong className="text-gray-700">~{nextInMin} min</strong></span>
              : <span className="text-amber-600 font-medium">Refresh due — will recompute on next page load</span>
            }
            <button onClick={handleForceRefresh} disabled={flushing || loading}
              className="ml-auto flex items-center gap-1.5 text-purple-600 font-medium hover:text-purple-800 disabled:opacity-50 transition-colors">
              {flushing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Compute Now
            </button>
          </div>
        );
      })()}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Jobs in DB"   value={summary?.total ?? '—'} />
        <StatCard label="Last 7 Days"         value={summary?.last7d ?? '—'} sub="jobs ingested" />
        <StatCard label="Last 24 Hours"       value={summary?.last24h ?? '—'} sub="jobs ingested" />
        <StatCard label="Avg Relevance Score" value={summary ? `${summary.avgRelevanceScore}%` : '—'} sub="across all jobs" />
      </div>

      {/* Jobs Over Time */}
      <ChartCard title={`📅 Jobs Ingested Per Day (Last ${timeRange} days)`} loading={loading}
        onExpand={() => setExpandModal({ title: '📅 Jobs Ingested Per Day', key: 'overtime' })}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={jobsOverTime}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} dot={false} name="Jobs" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Heatmap — PKT times, green colours, country filter */}
      <ChartCard title={`🗓 Posting Activity Heatmap — Day × Hour (Pakistan Time, Last ${timeRange} days)`} loading={loading}>
        <PostingHeatmap
          data={heatmap}
          countryOptions={heatmapCountryOptions}
          selectedCountries={heatmapCountries}
          onCountriesChange={handleHeatmapCountryChange}
          heatmapLoading={heatmapLoading}
        />
      </ChartCard>

      {/* Row: Hourly (PKT) + Score Dist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="🕐 Hourly Activity (Pakistan Time)" loading={loading}
          onExpand={() => setExpandModal({ title: '🕐 Hourly Activity (PKT)', key: 'hourly' })}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyWithPkt}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="pktHour" tick={{ fontSize: 9 }} interval={3} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, n, p) => [v, pktFullLabel(p.payload.hour)]} />
              <Bar dataKey="count" fill="#7c3aed" name="Jobs" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="🎯 Relevance Score Distribution" loading={loading}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#7c3aed" name="Jobs" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row: Pricing + Semantic Verdict */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="💼 Fixed vs Hourly" loading={loading}>
          {pricingSplit.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pricingSplit} dataKey="count" nameKey="model"
                  cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                  label={({ model, percent }) => `${model} ${(percent*100).toFixed(0)}%`}>
                  {pricingSplit.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center mt-10">No data</p>}
        </ChartCard>

        <ChartCard title="🤖 AI Semantic Verdict Breakdown" loading={loading}>
          {verdict.filter(v => v.verdict !== 'Not Scored').length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={verdict.filter(v => v.verdict !== 'Not Scored')}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="verdict" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v,n,p) => [`${v} jobs (avg ${p.payload.avgScore}% score)`, p.payload.verdict]} />
                <Bar dataKey="count" name="Jobs" radius={[3,3,0,0]}>
                  {verdict.filter(v=>v.verdict!=='Not Scored').map((v,i) => (
                    <Cell key={i} fill={VERDICT_COLORS[v.verdict] || COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center mt-10">No AI-scored jobs yet</p>}
        </ChartCard>
      </div>

      {/* Row: Budget + Experience */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="💵 Fixed Job Budget Distribution" loading={loading}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={budget}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={40} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" name="Jobs" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="🎓 Experience Level Breakdown" loading={loading}>
          {experience.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={experience} dataKey="count" nameKey="level"
                  cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                  label={({ level, percent }) => `${level} ${(percent*100).toFixed(0)}%`}>
                  {experience.map((_,i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center mt-10">No data</p>}
        </ChartCard>
      </div>

      {/* Row: Top Countries + Top Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="🌍 Top Client Countries" loading={loading}
          onExpand={() => setExpandModal({ title: '🌍 All Countries', key: 'countries' })}>
          {hBarChart(topCountries.slice(0,10), 'count', 'country', '#3b82f6')}
        </ChartCard>

        <ChartCard title="📂 Top Job Categories" loading={loading}
          onExpand={() => setExpandModal({ title: '📂 All Categories', key: 'categories' })}>
          {hBarChart(topCategories.slice(0,10), 'count', 'category', '#10b981')}
        </ChartCard>
      </div>

      {/* Row: Top Categories per Country + Keywords by Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="🌍📂 Top Categories per Country" loading={loading}
          onExpand={() => setExpandModal({ title: '🌍📂 Categories per Country', key: 'cbc' })}>
          {categoriesByCountry.length > 0 ? (
            <div className="space-y-3">
              {categoriesByCountry.slice(0, 5).map((row, ci) => (
                <div key={ci}>
                  <div className="text-xs font-semibold text-gray-500 mb-1">{row.country}</div>
                  <div className="flex flex-wrap gap-1">
                    {row.categories.map((cat, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">
                        {cat.category} <span className="font-bold text-blue-900">{cat.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {categoriesByCountry.length > 5 && (
                <p className="text-xs text-gray-400 text-right">+{categoriesByCountry.length - 5} more — expand to see all</p>
              )}
            </div>
          ) : <p className="text-sm text-gray-400 text-center mt-10">No data</p>}
        </ChartCard>

        <ChartCard title="🔑 Top Keywords by Category" loading={loading}
          onExpand={() => setExpandModal({ title: '🔑 Keywords by Category', key: 'kbc' })}>
          {keywordsByCategory.length > 0 ? (
            <div className="space-y-3">
              {keywordsByCategory.slice(0, 4).map((row, ci) => (
                <div key={ci}>
                  <div className="text-xs font-semibold text-gray-500 mb-1">{row.category}</div>
                  <div className="flex flex-wrap gap-1">
                    {row.keywords.slice(0, 8).map((kw, i) => (
                      <span key={i} className="text-xs rounded px-1.5 py-0.5 border font-medium"
                        style={{ background: `${COLORS[ci % COLORS.length]}15`, color: COLORS[ci % COLORS.length], borderColor: `${COLORS[ci % COLORS.length]}40` }}>
                        {kw.word} <span className="opacity-70">{kw.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {keywordsByCategory.length > 4 && (
                <p className="text-xs text-gray-400 text-right">+{keywordsByCategory.length - 4} more — expand to see all</p>
              )}
            </div>
          ) : <p className="text-sm text-gray-400 text-center mt-10">No data</p>}
        </ChartCard>
      </div>

      {/* Row: 3 Pie Charts — Profile Match + Main Category + Job Category */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="🧠 Jobs by Profile Match" loading={loading}>
          {profileBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={profileBreakdown} dataKey="count" nameKey="profile"
                  cx="50%" cy="50%" outerRadius={72}
                  label={({ percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {profileBreakdown.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v,n,p) => [v, p.payload.profile]} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center mt-10">No profile data</p>}
        </ChartCard>

        <ChartCard title="📁 Jobs by Main Category" loading={loading}>
          {mainCatBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={mainCatBreakdown} dataKey="count" nameKey="category"
                  cx="50%" cy="50%" outerRadius={72}
                  label={({ percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {mainCatBreakdown.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v,n,p) => [v, p.payload.category]} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center mt-10">No data</p>}
        </ChartCard>

        <ChartCard title="🗂 Jobs by Job Category" loading={loading}>
          {topCategories.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={topCategories.slice(0,10)} dataKey="count" nameKey="category"
                  cx="50%" cy="50%" outerRadius={72}
                  label={({ percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {topCategories.slice(0,10).map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v,n,p) => [v, p.payload.category]} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center mt-10">No data</p>}
        </ChartCard>
      </div>

      {/* Emerging Keywords */}
      <ChartCard title="🔥 Emerging Keywords (Last 7 days)" loading={loading}
        onExpand={() => setExpandModal({ title: '🔥 All Keywords', key: 'keywords' })}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={emergingKeywords.slice(0,20)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="word" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={50} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#f59e0b" name="Mentions" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Expand Modal */}
      {expandModal && (
        <ExpandModal title={expandModal.title} onClose={() => { setExpandModal(null); setModalLoading(false); }}>
          {expandModal.key === 'overtime' ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={jobsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} dot={false} name="Jobs" />
              </LineChart>
            </ResponsiveContainer>
          ) : expandModal.key === 'hourly' ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={hourlyWithPkt}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="pktHour" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, n, p) => [v, pktFullLabel(p.payload.hour)]} />
                <Bar dataKey="count" fill="#7c3aed" name="Jobs" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : renderModalContent(expandModal.key)}
        </ExpandModal>
      )}
    </div>
  );
};

export default AnalyticsPage;
