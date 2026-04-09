import React, { useEffect, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  TrendingUp, Briefcase, Wrench, Package, Users, DollarSign,
  Lightbulb, Target, ChevronDown, ChevronUp, RefreshCw, Loader2,
  BarChart2, Star, ArrowLeft, Clock, AlertCircle, ShieldCheck,
} from 'lucide-react';
import {
  getInsightCategories,
  generateInsightReport,
  getInsightStatus,
  getInsightReport,
} from '../apis/insights';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
const fmtNum  = (n) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status, progress }) => {
  if (status === 'running') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 animate-pulse">
      <Loader2 className="w-3 h-3 animate-spin" />
      {progress || 'Generating...'}
    </span>
  );
  if (status === 'done') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <Star className="w-3 h-3" /> Report Ready
    </span>
  );
  if (status === 'error') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
      <AlertCircle className="w-3 h-3" /> Error
    </span>
  );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      Not Generated
    </span>
  );
};

// ── Mini horizontal bar ───────────────────────────────────────────────────────
const MiniBar = ({ value, max, color = 'bg-purple-500' }) => (
  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
    <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
  </div>
);

// ── Section card ──────────────────────────────────────────────────────────────
const Section = ({ icon: Icon, title, children, color = 'text-purple-600' }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className={`flex items-center gap-2 font-semibold text-sm ${color}`}>
          <Icon className="w-4 h-4" /> {title}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 py-4">{children}</div>}
    </div>
  );
};

// ── Full report view ──────────────────────────────────────────────────────────
const ReportView = ({ report, stats, category, jobsAnalyzed, generatedAt, onBack }) => {
  const topSkillMax  = report.topSkills?.[0]?.mentions  || 1;
  const toolMax      = report.tools?.[0]?.mentions       || 1;
  const delivMax     = report.deliverables?.[0]?.mentions || 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <button onClick={onBack} className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 mb-2">
            <ArrowLeft className="w-3 h-3" /> All Categories
          </button>
          <h1 className="text-xl font-bold text-gray-900">{category}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <p className="text-xs text-gray-500">
              {jobsAnalyzed} jobs analyzed · Generated {fmtDate(generatedAt)}
            </p>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              <ShieldCheck className="w-3 h-3" />
              Cached · Free to view · No API cost
            </span>
          </div>
        </div>
      </div>

      {/* Stat strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Jobs (DB)',  value: stats.totalJobs?.toLocaleString() },
            { label: 'Fixed / Hourly',  value: `${stats.fixedPct}% / ${stats.hourlyPct}%` },
            { label: 'Avg Fixed Budget', value: stats.avgBudgetFixed > 0 ? fmtNum(stats.avgBudgetFixed) : 'N/A' },
            { label: 'Avg Client Spend', value: stats.avgClientSpend > 0 ? fmtNum(stats.avgClientSpend) : 'N/A' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-lg px-3 py-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">{s.label}</p>
              <p className="text-base font-bold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Executive Summary */}
      <Section icon={Target} title="Executive Summary" color="text-purple-700">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{report.executiveSummary}</p>
      </Section>

      {/* Top Skills */}
      {report.topSkills?.length > 0 && (
        <Section icon={Star} title="Top In-Demand Skills" color="text-indigo-700">
          <div className="space-y-3">
            {report.topSkills.map((s, i) => (
              <div key={i}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-800 w-5 text-right text-gray-400">{i + 1}.</span>
                  <span className="text-sm font-medium text-gray-900 flex-1">{s.skill}</span>
                  <span className="text-xs text-gray-400">{s.mentions} mentions</span>
                  <MiniBar value={s.mentions} max={topSkillMax} color="bg-indigo-500" />
                </div>
                {s.context && <p className="text-xs text-gray-500 ml-7 leading-snug">{s.context}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Two-col: Tools + Deliverables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {report.tools?.length > 0 && (
          <Section icon={Wrench} title="Tools & Software" color="text-teal-700">
            <div className="space-y-2">
              {report.tools.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-4">{i + 1}.</span>
                  <span className="text-sm text-gray-800 flex-1">{t.name}</span>
                  <span className="text-xs text-gray-400">{t.mentions}</span>
                  <MiniBar value={t.mentions} max={toolMax} color="bg-teal-400" />
                </div>
              ))}
            </div>
          </Section>
        )}

        {report.deliverables?.length > 0 && (
          <Section icon={Package} title="What Clients Want Built" color="text-orange-700">
            <div className="space-y-2">
              {report.deliverables.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-4">{i + 1}.</span>
                  <span className="text-sm text-gray-800 flex-1">{d.name || d.type}</span>
                  <span className="text-xs text-gray-400">{d.mentions}</span>
                  <MiniBar value={d.mentions} max={delivMax} color="bg-orange-400" />
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Client Industries + Profile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {report.clientIndustries?.length > 0 && (
          <Section icon={Briefcase} title="Client Industries" color="text-blue-700">
            <div className="flex flex-wrap gap-2">
              {report.clientIndustries.map((ind, i) => (
                <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                  {ind.name} <span className="opacity-60">({ind.mentions})</span>
                </span>
              ))}
            </div>
          </Section>
        )}

        {report.clientProfile && (
          <Section icon={Users} title="Client Profile" color="text-blue-700">
            <p className="text-sm text-gray-700 leading-relaxed">{report.clientProfile}</p>
          </Section>
        )}
      </div>

      {/* Budget Insights */}
      {report.budgetInsights && (
        <Section icon={DollarSign} title="Budget Insights" color="text-green-700">
          <p className="text-sm text-gray-700 leading-relaxed">{report.budgetInsights}</p>
          {stats?.budgetBuckets?.filter(b => b.count > 0).length > 0 && (
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {stats.budgetBuckets.filter(b => b.count > 0).map((b, i) => (
                <div key={i} className="text-center">
                  <p className="text-xs text-gray-500">{b.range}</p>
                  <p className="text-sm font-semibold text-gray-800">{b.count}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Portfolio Recommendations */}
      {report.portfolioRecommendations?.length > 0 && (
        <Section icon={Lightbulb} title="Portfolio Pieces to Build" color="text-yellow-700">
          <ul className="space-y-2">
            {report.portfolioRecommendations.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                {p}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Trends + Strategic */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {report.trends?.length > 0 && (
          <Section icon={TrendingUp} title="Market Trends" color="text-rose-700">
            <ul className="space-y-2">
              {report.trends.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="shrink-0 text-rose-400 mt-0.5">→</span> {t}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {report.strategicRecommendations && (
          <Section icon={Target} title="Strategic Recommendations" color="text-purple-700">
            <p className="text-sm text-gray-700 leading-relaxed">{report.strategicRecommendations}</p>
          </Section>
        )}
      </div>

      {/* Sub-categories */}
      {stats?.topJobCategories?.length > 0 && (
        <Section icon={BarChart2} title="Top Sub-Categories (from DB)" color="text-gray-600">
          <div className="flex flex-wrap gap-2">
            {stats.topJobCategories.map((c, i) => (
              <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                {c.name} <span className="text-gray-400">({c.count})</span>
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

// ── Category card ─────────────────────────────────────────────────────────────
const CategoryCard = ({ cat, onGenerate, onView, polling }) => {
  const isRunning = cat.status === 'running';
  const isDone    = cat.status === 'done';
  const isError   = cat.status === 'error';

  return (
    <div className={`bg-white border rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow ${isRunning ? 'border-blue-300' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 leading-tight">{cat.category}</h3>
        <StatusBadge status={cat.status} progress={cat.progress} />
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {cat.jobCount?.toLocaleString()} jobs</span>
        {isDone && cat.generatedAt && (
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtDate(cat.generatedAt)}</span>
        )}
      </div>

      {isError && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{cat.error}</p>}

      <div className="flex gap-2 mt-auto pt-1">
        {isDone && (
          <button
            onClick={() => onView(cat.category)}
            className="flex-1 text-xs py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors"
          >
            View Report
          </button>
        )}
        <button
          disabled={isRunning}
          onClick={() => onGenerate(cat.category)}
          className={`flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg font-medium transition-colors border ${
            isRunning
              ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
              : isDone
              ? 'border-purple-200 text-purple-600 hover:bg-purple-50 px-3'
              : 'flex-1 border-purple-600 text-purple-600 hover:bg-purple-50'
          }`}
        >
          {isRunning
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
            : isDone
            ? <><RefreshCw className="w-3 h-3" /> Regenerate</>
            : 'Generate Report'}
        </button>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const SAMPLE_OPTIONS = [100, 250, 500, 750, 1000];

export default function MarketIntelligence() {
  const [categories, setCategories]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [viewCategory, setViewCategory] = useState(null);
  const [reportData, setReportData]     = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [sampleSize, setSampleSize]     = useState(500);
  const pollingRef                      = useRef(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await getInsightCategories();
      setCategories(res.data.data || []);
    } catch (err) {
      console.error('[MarketIntelligence] fetchCategories', err);
    }
  }, []);

  useEffect(() => {
    fetchCategories().finally(() => setLoading(false));
  }, [fetchCategories]);

  // Poll every 4s while any category is running
  useEffect(() => {
    const hasRunning = categories.some(c => c.status === 'running');
    if (hasRunning && !pollingRef.current) {
      pollingRef.current = setInterval(fetchCategories, 4000);
    } else if (!hasRunning && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  }, [categories, fetchCategories]);

  const handleGenerate = async (category) => {
    try {
      setCategories(prev => prev.map(c =>
        c.category === category ? { ...c, status: 'running', progress: 'Starting...' } : c
      ));
      await generateInsightReport(category, sampleSize);
      toast.success(`Generating report for "${category}" · ${sampleSize} jobs`);
      if (!pollingRef.current) pollingRef.current = setInterval(fetchCategories, 4000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start generation');
      setCategories(prev => prev.map(c =>
        c.category === category ? { ...c, status: 'error' } : c
      ));
    }
  };

  const handleView = async (category) => {
    setReportLoading(true);
    setViewCategory(category);
    setReportData(null);
    try {
      const res = await getInsightReport(category);
      setReportData(res.data.data);
    } catch (err) {
      toast.error('Failed to load report');
      setViewCategory(null);
    } finally {
      setReportLoading(false);
    }
  };

  const handleBack = () => {
    setViewCategory(null);
    setReportData(null);
  };

  // ── Report view ──────────────────────────────────────────────────────────
  if (viewCategory) {
    if (reportLoading) return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
      </div>
    );
    if (reportData) return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <ReportView
          report={reportData.report}
          stats={reportData.stats}
          category={reportData.category}
          jobsAnalyzed={reportData.jobsAnalyzed}
          generatedAt={reportData.generatedAt}
          onBack={handleBack}
        />
      </div>
    );
  }

  // ── Category grid ────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Market Intelligence
          </h1>
          <p className="text-xs text-gray-500 mt-1 max-w-xl">
            AI-generated reports per category — skills, tools, deliverables, client profiles & portfolio recommendations.
            Reports are <strong>cached permanently</strong> — only costs credits when you click Generate/Regenerate.
          </p>
        </div>
        <button
          onClick={() => fetchCategories()}
          className="shrink-0 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
          title="Refresh list"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Sample size + cost estimate */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs text-gray-600">
        <span className="font-medium text-purple-700">Sample size per report:</span>
        <div className="flex gap-1">
          {SAMPLE_OPTIONS.map(n => (
            <button
              key={n}
              onClick={() => setSampleSize(n)}
              className={`px-3 py-1 rounded-lg font-medium border transition-colors ${
                sampleSize === n
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <span className="text-gray-400">·</span>
        <span className="text-gray-500">
          Est. cost: <strong className="text-gray-700">~${(sampleSize * 0.00024).toFixed(2)}/report</strong>
          {' '}· Viewing reports is always free
        </span>
        <span className="ml-auto flex items-center gap-1 text-green-700 font-medium">
          <ShieldCheck className="w-3 h-3" /> Reports cached in DB — no re-charge on view
        </span>
      </div>

      {/* Summary bar */}
      {!loading && categories.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span>{categories.length} categories</span>
          <span>{categories.filter(c => c.status === 'done').length} reports ready</span>
          <span>{categories.filter(c => c.status === 'running').length} generating</span>
          <span className="text-gray-400">·</span>
          <span>{categories.reduce((s, c) => s + (c.jobCount || 0), 0).toLocaleString()} total jobs</span>
        </div>
      )}

      {/* Category cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          No job categories found. Run the scraper first.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <CategoryCard
              key={cat.category}
              cat={cat}
              onGenerate={handleGenerate}
              onView={handleView}
            />
          ))}
        </div>
      )}
    </div>
  );
}
