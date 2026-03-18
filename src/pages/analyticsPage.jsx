import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  getAnalyticsSummary, getJobsOverTime, getScoreDistribution, getTopCountries,
  getTopCategories, getProfileBreakdown, getPricingSplit, getEmergingKeywords,
  getPostingHeatmap, getHourlyDistribution, getSemanticVerdictBreakdown,
  getBudgetDistribution, getExperienceBreakdown,
  getCategoriesByCountry, getKeywordsByCategory,
} from '../apis/analytics';
import { toast } from 'sonner';
import { Loader2, Maximize2, X } from 'lucide-react';

const COLORS = ['#7c3aed','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316','#ec4899'];
const DAYS   = [' Mon',' Tue',' Wed',' Thu',' Fri',' Sat',' Sun'];

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

// ── Expand Modal — renders content reactively from parent state via renderFn ──
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

// ── Heatmap ───────────────────────────────────────────────────────────────────
const PostingHeatmap = ({ data }) => {
  if (!data || data.length === 0) return <p className="text-sm text-gray-400 text-center py-8">No data</p>;
  const max  = Math.max(...data.map(d => d.count), 1);
  const cell = (count) => {
    const pct = count / max;
    if (pct === 0) return 'bg-gray-100';
    if (pct < 0.2)  return 'bg-purple-100';
    if (pct < 0.4)  return 'bg-purple-200';
    if (pct < 0.6)  return 'bg-purple-400';
    if (pct < 0.8)  return 'bg-purple-600';
    return 'bg-purple-800';
  };

  const grid = {};
  data.forEach(d => { grid[`${d.day}-${d.hour}`] = d.count; });

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[620px]">
        {/* Hour labels */}
        <div className="flex ml-10 mb-1">
          {Array.from({length:24},(_,h) => (
            <div key={h} className="flex-1 text-center text-[9px] text-gray-400">
              {h % 3 === 0 ? `${h}h` : ''}
            </div>
          ))}
        </div>
        {/* Rows */}
        {DAYS.map((day, d) => (
          <div key={d} className="flex items-center mb-0.5">
            <div className="w-10 text-[10px] text-gray-500 text-right pr-2">{day}</div>
            {Array.from({length:24},(_,h) => {
              const count = grid[`${d}-${h}`] || 0;
              return (
                <div key={h} className="flex-1 m-px group relative">
                  <div className={`w-full aspect-square rounded-sm ${cell(count)}`} />
                  {count > 0 && (
                    <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block
                      bg-gray-800 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap pointer-events-none">
                      {day.trim()} {h}:00 — {count} jobs
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center gap-1 mt-3 justify-end">
          <span className="text-[10px] text-gray-400 mr-1">Less</span>
          {['bg-gray-100','bg-purple-100','bg-purple-200','bg-purple-400','bg-purple-600','bg-purple-800'].map((c,i) => (
            <div key={i} className={`w-4 h-4 rounded-sm ${c}`} />
          ))}
          <span className="text-[10px] text-gray-400 ml-1">More</span>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const AnalyticsPage = () => {
  const [summary, setSummary]             = useState(null);
  const [jobsOverTime, setJobsOverTime]   = useState([]);
  const [scoreDistribution, setScoreDist] = useState([]);
  const [topCountries, setTopCountries]   = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [profileBreakdown, setProfileBreakdown] = useState([]);
  const [pricingSplit, setPricingSplit]   = useState([]);
  const [emergingKeywords, setKeywords]   = useState([]);
  const [heatmap, setHeatmap]             = useState([]);
  const [hourly, setHourly]               = useState([]);
  const [verdict, setVerdict]             = useState([]);
  const [budget, setBudget]               = useState([]);
  const [experience, setExperience]       = useState([]);
  const [categoriesByCountry, setCatByCountry] = useState([]);
  const [keywordsByCategory, setKwByCategory]  = useState([]);
  const [loading, setLoading]             = useState(true);
  const [timeRange, setTimeRange]         = useState(30);
  // expandModal stores { title, key } — content rendered reactively to avoid stale closures
  const [expandModal, setExpandModal]     = useState(null);

  // Limits (state changes trigger re-renders so modal content is always fresh)
  const [countriesLimit, setCountriesLimit]   = useState(10);
  const [categoriesLimit, setCategoriesLimit] = useState(10);
  const [keywordsLimit, setKeywordsLimit]     = useState(20);
  const [cbcCountriesLimit, setCbcLimit]      = useState(8);
  const [kbcLimit, setKbcLimit]               = useState(10);

  const fetchAll = async (range = timeRange) => {
    setLoading(true);
    try {
      const [
        sumR, jotR, scR, coR, caR, prR, pnR, kwR,
        hmR, hrR, vdR, bdR, exR, cbcR, kbcR
      ] = await Promise.all([
        getAnalyticsSummary(),
        getJobsOverTime(range),
        getScoreDistribution(),
        getTopCountries(countriesLimit),
        getTopCategories(categoriesLimit),
        getProfileBreakdown(),
        getPricingSplit(),
        getEmergingKeywords(7, keywordsLimit),
        getPostingHeatmap(range),
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
      setPricingSplit(pnR.data.data || []);
      setKeywords(kwR.data.data || []);
      setHeatmap(hmR.data.data || []);
      setHourly(hrR.data.data || []);
      setVerdict(vdR.data.data || []);
      setBudget(bdR.data.data || []);
      setExperience(exR.data.data || []);
      setCatByCountry(cbcR.data.data || []);
      setKwByCategory(kbcR.data.data || []);
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [timeRange]);

  // Refetch helpers — update state AND refetch (modal content re-renders automatically from state)
  const refetchCountries  = async (lim) => { const r = await getTopCountries(lim); setTopCountries(r.data.data||[]); };
  const refetchCategories = async (lim) => { const r = await getTopCategories(lim); setTopCategories(r.data.data||[]); };
  const refetchKeywords   = async (lim) => { const r = await getEmergingKeywords(7,lim); setKeywords(r.data.data||[]); };
  const refetchCbc        = async (lim, cats) => { const r = await getCategoriesByCountry(lim, cats); setCatByCountry(r.data.data||[]); };
  const refetchKbc        = async (lim) => { const r = await getKeywordsByCategory(lim); setKwByCategory(r.data.data||[]); };

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

  // ── Reactive modal content — reads current state at render time ───────────
  const renderModalContent = (key) => {
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
                <button key={n} onClick={() => { setCbcLimit(n); refetchCbc(n, 5); }}
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
                    <BarChart data={row.categories} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
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
                    <BarChart data={row.keywords} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
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

      {/* Posting Activity Heatmap */}
      <ChartCard title={`🗓 Posting Activity Heatmap — Day × Hour (Last ${timeRange} days)`} loading={loading}>
        <PostingHeatmap data={heatmap} />
      </ChartCard>

      {/* Row: Hourly + Score Dist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="🕐 Hourly Activity Distribution" loading={loading}
          onExpand={() => setExpandModal({ title: '🕐 Hourly Activity', key: 'hourly' })}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tickFormatter={h => h % 4 === 0 ? `${h}h` : ''} tick={{ fontSize: 9 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v,n,p) => [v, `${p.payload.hour}:00`]} />
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
                        {cat.category}
                        <span className="font-bold text-blue-900">{cat.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {categoriesByCountry.length > 5 && (
                <p className="text-xs text-gray-400 text-right">+{categoriesByCountry.length - 5} more countries — expand to see all</p>
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
                      <span key={i} className={`text-xs rounded px-1.5 py-0.5 border font-medium`}
                        style={{ background: `${COLORS[ci % COLORS.length]}15`, color: COLORS[ci % COLORS.length], borderColor: `${COLORS[ci % COLORS.length]}40` }}>
                        {kw.word} <span className="opacity-70">{kw.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {keywordsByCategory.length > 4 && (
                <p className="text-xs text-gray-400 text-right">+{keywordsByCategory.length - 4} more categories — expand to see all</p>
              )}
            </div>
          ) : <p className="text-sm text-gray-400 text-center mt-10">No data</p>}
        </ChartCard>
      </div>

      {/* Row: Profile Breakdown + Emerging Keywords */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="🧠 Jobs by Profile Match" loading={loading}>
          {profileBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={profileBreakdown} dataKey="count" nameKey="profile"
                  cx="50%" cy="50%" outerRadius={80}
                  label={({ profile, percent }) => `${profile} ${(percent*100).toFixed(0)}%`}>
                  {profileBreakdown.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center mt-10">No profile data</p>}
        </ChartCard>

        <ChartCard title="🔥 Emerging Keywords (Last 7 days)" loading={loading}
          onExpand={() => setExpandModal({ title: '🔥 All Keywords', key: 'keywords' })}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={emergingKeywords.slice(0,15)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="word" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" name="Mentions" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Expand Modal — content rendered reactively from renderModalContent */}
      {expandModal && (
        <ExpandModal title={expandModal.title} onClose={() => setExpandModal(null)}>
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
              <BarChart data={hourly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tickFormatter={h => `${h}:00`} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v,n,p) => [v, `${p.payload.hour}:00`]} />
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
