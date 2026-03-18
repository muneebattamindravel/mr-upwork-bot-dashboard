import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getJobById } from '../apis/jobs';
import { formatDistanceToNow, format } from 'date-fns';
import { MapPin, BadgeCheck, PhoneCall, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };

const Badge = ({ color = 'gray', children }) => {
  const colors = {
    green:  'bg-green-100 text-green-800 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red:    'bg-red-100 text-red-800 border-red-200',
    blue:   'bg-blue-100 text-blue-800 border-blue-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    gray:   'bg-gray-100 text-gray-700 border-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
};

const Row = ({ label, value }) => (
  value || value === 0 ? (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-800 font-medium text-right max-w-[60%]">{value}</span>
    </div>
  ) : null
);

const Section = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{title}</h3>
    {children}
  </div>
);

const ScoreBar = ({ score, label }) => {
  const color = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span><span className="font-semibold text-gray-700">{score}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
};

export default function JobDetailPage() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getJobById(id)
      .then(res => setJob(res.data.data))
      .catch(() => setError('Job not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
    </div>
  );

  if (error || !job) return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center text-gray-500">
        <div className="text-4xl mb-3">😕</div>
        <p className="text-lg font-medium">{error || 'Job not found'}</p>
      </div>
    </div>
  );

  const { relevance = {}, semanticRelevance = {} } = job;
  const score = relevance.relevanceScore ?? 0;
  const scoreColor = score >= 80 ? 'green' : score >= 50 ? 'yellow' : 'red';
  const verdictColor = { Yes: 'green', Maybe: 'yellow', No: 'red' }[semanticRelevance.verdict] || 'gray';
  const postedAgo = job.postedDate ? formatDistanceToNow(new Date(job.postedDate), { addSuffix: true }) : '';
  const fmt = (n) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${(n/1_000).toFixed(0)}K` : n ? `$${n}` : '—';

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-5">

        {/* ── Title card ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {job.mainCategory && <Badge color="purple">{job.mainCategory}</Badge>}
                {job.jobCategory  && <Badge color="blue">{job.jobCategory}</Badge>}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">{job.title}</h1>
              <button onClick={() => copy(job.title)} className="mt-1 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                <Copy className="w-3 h-3" /> Copy title
              </button>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge color={scoreColor}>Relevance: {score}%</Badge>
              {semanticRelevance.verdict && <Badge color={verdictColor}>AI: {semanticRelevance.verdict}</Badge>}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 text-sm text-gray-500">
            {postedAgo && <span>🕒 {postedAgo}</span>}
            {job.experienceLevel && <span>📊 {job.experienceLevel}</span>}
            {job.pricingModel && <span>💼 {job.pricingModel}</span>}
            {job.projectType && <span>📈 {job.projectType}</span>}
            {job.requiredConnects > 0 && <span>🔁 {job.requiredConnects} connects</span>}
          </div>

          {/* Budget */}
          {(job.minRange > 0 || job.maxRange > 0) && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg inline-flex items-center gap-2">
              <span className="text-2xl font-bold text-green-700">
                {job.pricingModel === 'Fixed'
                  ? `$${job.maxRange || job.minRange}`
                  : `$${job.minRange}–$${job.maxRange}/hr`}
              </span>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button onClick={() => copy(job.url)}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm rounded-lg">
              <Copy className="w-4 h-4" /> Copy URL
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Description (2/3 width) ── */}
          <div className="lg:col-span-2 space-y-5">
            <Section title="Job Description">
              <div className="flex justify-end mb-2">
                <button onClick={() => copy(job.description)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{job.description}</p>
            </Section>

            {/* AI Reasoning */}
            {semanticRelevance.reason && (
              <Section title="AI Analysis">
                <div className="space-y-3">
                  <ScoreBar score={semanticRelevance.score ?? 0} label="Semantic Relevance" />
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500">Reasoning</span>
                      <button onClick={() => copy(semanticRelevance.reason)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{semanticRelevance.reason}</p>
                  </div>
                  {semanticRelevance.proposal && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-indigo-600">Generated Proposal</span>
                        <button onClick={() => copy(semanticRelevance.proposal)} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-600">
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{semanticRelevance.proposal}</p>
                    </div>
                  )}
                </div>
              </Section>
            )}
          </div>

          {/* ── Sidebar (1/3 width) ── */}
          <div className="space-y-5">
            {/* Relevance scores */}
            <Section title="Relevance Scoring">
              <div className="space-y-3 mb-4">
                <ScoreBar score={score} label="Overall Score" />
                <ScoreBar score={relevance.keywordScore ?? 0} label="Keyword Score" />
                <ScoreBar score={relevance.fieldScore ?? 0} label="Field Score" />
              </div>
              {relevance.profile && (
                <div className="text-xs text-gray-500">Matched Profile: <strong className="text-gray-700">{relevance.profile}</strong></div>
              )}
              {Object.keys(relevance.matchedKeywordBreakdown || {}).length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-medium text-gray-500 mb-1">Matched Keywords</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(relevance.matchedKeywordBreakdown).map(([kw, val]) => (
                      <span key={kw} className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5">
                        {kw} ({val.totalMatches})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* Client info */}
            <Section title="Client Information">
              {(job.clientCity || job.clientCountry) && (
                <div className="flex items-center gap-1.5 text-sm text-gray-700 mb-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {[job.clientCity, job.clientCountry].filter(Boolean).join(', ')}
                </div>
              )}
              <div className="flex gap-3 mb-3">
                <span className={`flex items-center gap-1 text-xs ${job.clientPaymentVerified ? 'text-green-600' : 'text-red-500'}`}>
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Payment {job.clientPaymentVerified ? 'Verified' : 'Unverified'}
                </span>
                <span className={`flex items-center gap-1 text-xs ${job.clientPhoneVerified ? 'text-green-600' : 'text-red-500'}`}>
                  <PhoneCall className="w-3.5 h-3.5" />
                  Phone {job.clientPhoneVerified ? 'Verified' : 'Unverified'}
                </span>
              </div>
              <Row label="Total Spent" value={fmt(job.clientSpend)} />
              <Row label="Jobs Posted" value={job.clientJobsPosted} />
              <Row label="Total Hires" value={job.clientHires} />
              <Row label="Hire Rate" value={job.clientHireRate ? `${job.clientHireRate}%` : null} />
              <Row label="Rating" value={job.clientRating ? `⭐ ${job.clientRating} (${job.clientReviews} reviews)` : null} />
              <Row label="Avg Hourly Rate" value={job.clientAverageHourlyRate ? `$${job.clientAverageHourlyRate}/hr` : null} />
              <Row label="Member Since" value={job.clientMemberSince} />
            </Section>

            {/* Job meta */}
            <Section title="Job Details">
              <Row label="Posted" value={job.postedDate ? format(new Date(job.postedDate), 'MMM d, yyyy') : null} />
              <Row label="Experience Level" value={job.experienceLevel} />
              <Row label="Pricing Model" value={job.pricingModel} />
              <Row label="Project Type" value={job.projectType} />
              <Row label="Required Connects" value={job.requiredConnects > 0 ? job.requiredConnects : null} />
              <Row label="Cluster Category" value={job.mainCategory} />
              <Row label="Job Category" value={job.jobCategory} />
            </Section>
          </div>
        </div>
    </div>
  );
}
