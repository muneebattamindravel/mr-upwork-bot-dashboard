import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  getAnalyticsSummary,
  getJobsOverTime,
  getScoreDistribution,
  getTopCountries,
  getTopCategories,
  getProfileBreakdown,
  getPricingSplit,
  getEmergingKeywords
} from '../apis/analytics';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const COLORS = ['#7c3aed','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316','#ec4899'];

const StatCard = ({ label, value, sub }) => (
  <div className="bg-white border rounded-lg p-4 shadow-sm">
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div className="text-2xl font-bold text-purple-700">{value}</div>
    {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
  </div>
);

const ChartCard = ({ title, loading, children }) => (
  <div className="bg-white border rounded-lg p-4 shadow-sm">
    <div className="text-sm font-semibold text-gray-700 mb-4">{title}</div>
    {loading ? (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
      </div>
    ) : children}
  </div>
);

const AnalyticsPage = () => {
  const [summary, setSummary] = useState(null);
  const [jobsOverTime, setJobsOverTime] = useState([]);
  const [scoreDistribution, setScoreDistribution] = useState([]);
  const [topCountries, setTopCountries] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [profileBreakdown, setProfileBreakdown] = useState([]);
  const [pricingSplit, setPricingSplit] = useState([]);
  const [emergingKeywords, setEmergingKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [
        summaryRes,
        jobsOverTimeRes,
        scoreRes,
        countriesRes,
        categoriesRes,
        profileRes,
        pricingRes,
        keywordsRes
      ] = await Promise.all([
        getAnalyticsSummary(),
        getJobsOverTime(timeRange),
        getScoreDistribution(),
        getTopCountries(),
        getTopCategories(),
        getProfileBreakdown(),
        getPricingSplit(),
        getEmergingKeywords(7)
      ]);

      setSummary(summaryRes.data.data);
      setJobsOverTime(jobsOverTimeRes.data.data || []);
      setScoreDistribution(scoreRes.data.data || []);
      setTopCountries(countriesRes.data.data || []);
      setTopCategories(categoriesRes.data.data || []);
      setProfileBreakdown(profileRes.data.data || []);
      setPricingSplit(pricingRes.data.data || []);
      setEmergingKeywords(keywordsRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load analytics');
      console.error('[Analytics]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [timeRange]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="page-title">📊 Analytics</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Time range:</label>
          <select
            value={timeRange}
            onChange={e => setTimeRange(Number(e.target.value))}
            className="text-sm border rounded px-2 py-1"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={fetchAll} className="btn-outline text-xs px-3 py-1.5">Refresh</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Jobs in DB" value={summary?.total ?? '—'} />
        <StatCard label="Last 7 Days" value={summary?.last7d ?? '—'} sub="jobs ingested" />
        <StatCard label="Last 24 Hours" value={summary?.last24h ?? '—'} sub="jobs ingested" />
        <StatCard label="Avg Relevance Score" value={summary ? `${summary.avgRelevanceScore}%` : '—'} sub="across all jobs" />
      </div>

      {/* Jobs Over Time */}
      <ChartCard title={`📅 Jobs Ingested Per Day (Last ${timeRange} days)`} loading={loading}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={jobsOverTime}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} dot={false} name="Jobs" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Row: Score Distribution + Pricing Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <ChartCard title="💼 Fixed vs Hourly" loading={loading}>
          {pricingSplit.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pricingSplit}
                  dataKey="count"
                  nameKey="model"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  label={({ model, percent }) => `${model} ${(percent * 100).toFixed(0)}%`}
                >
                  {pricingSplit.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center mt-10">No data</p>}
        </ChartCard>
      </div>

      {/* Row: Top Countries + Top Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="🌍 Top Client Countries" loading={loading}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topCountries} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="country" tick={{ fontSize: 11 }} width={90} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" name="Jobs" radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="📂 Top Job Categories" loading={loading}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topCategories} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" name="Jobs" radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row: Profile Breakdown + Emerging Keywords */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="🧠 Jobs by Profile Match" loading={loading}>
          {profileBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={profileBreakdown}
                  dataKey="count"
                  nameKey="profile"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ profile, percent }) => `${profile} ${(percent * 100).toFixed(0)}%`}
                >
                  {profileBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center mt-10">No profile data</p>}
        </ChartCard>

        <ChartCard title="🔥 Emerging Keywords (Last 7 days in job titles)" loading={loading}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={emergingKeywords}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="word" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" name="Mentions" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};

export default AnalyticsPage;
