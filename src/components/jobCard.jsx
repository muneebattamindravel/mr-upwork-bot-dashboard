import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { BadgeCheck, PhoneCall, MapPin, ChevronDown, ChevronUp, X, RotateCcw } from 'lucide-react';
import { reprocessSingleJob, generateProposal } from '../apis/jobs'
import { toast } from "sonner";

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const FIELD_LABELS = {
    experienceLevel: '📊 Experience Level',
    pricingModel: '💼 Pricing Model',
    clientCountry: '🌍 Client Country',
    clientPhoneVerified: '📞 Phone Verified',
    clientPaymentVerified: '💳 Payment Verified',
    minRange: '💲Min Budget',
    maxRange: '💲Max Budget',
    budgetFixed: '📦 Budget (Fixed)',
    budgetHourly: '⏱️ Budget (Hourly)',
    clientSpend: '💰 Total Spend',
    clientHireRate: '🧑‍💼 Hire Rate',
    clientRating: '⭐ Client Rating',
    clientReviews: '🗣️ Client Reviews',
    requiredConnects: '🔁 Required Connects',
    clientAverageHourlyRate: '⚖️ Avg Hourly Rate'
};

const JobCard = ({ job }) => {
    const {
        title,
        description,
        url,
        postedDate,
        mainCategory,
        experienceLevel,
        projectType,
        requiredConnects,
        pricingModel,
        minRange,
        maxRange,
        clientCountry,
        clientCity,
        clientSpend,
        clientJobsPosted,
        clientHires,
        clientHireRate,
        clientMemberSince,
        clientPaymentVerified,
        clientPhoneVerified,
        clientAverageHourlyRate,
        clientRating,
        clientReviews,
        relevance = {}
    } = job;

    const {
        relevanceScore = 0,
        profile = '',
        keywordScore = 0,
        fieldScore = 0,
        uniqueKeywordsMatched = 0,
        totalKeywordHits = 0,
        matchedKeywordBreakdown = {},
        fieldScoreBreakdown = {}
    } = relevance;

    const [showRelevanceDetails, setShowRelevanceDetails] = useState(false);
    const [showDescription, setShowDescription] = useState(false);
    const [showProposal, setShowProposal] = useState(false);

    const getRelevanceColor = (score) => {
        if (score >= 80) return 'bg-green-600';
        if (score >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const [reprocessing, setReprocessing] = useState(false);

    const handleReprocess = async () => {
        setReprocessing(true);
        const loadingToast = toast.loading('Reprocessing...');
        try {
            ``
            await reprocessSingleJob(job._id);
            toast.success('Reprocessed successfully');

            if (typeof window !== 'undefined') {
                setTimeout(() => {
                    window.location.reload();
                }, 1000); // ⏱ 1 second delay
            }

        } catch (error) {
            toast.error('Failed to reprocess job');
            console.error(error);
        } finally {
            setReprocessing(false);
            toast.dismiss(loadingToast);
        }
    };

    const [loadingProposal, setLoadingProposal] = useState(false);
    const [proposalType, setProposalType] = useState('short');

    const handleGenerateProposal = async () => {
        try {
            setLoadingProposal(true);
            const response = await generateProposal(job._id, proposalType);
            toast.success("Proposal generated!");
            job.semanticRelevance.proposal = response; // update locally
            setShowProposal(true); // show modal immediately
        } catch (err) {
            toast.error("Failed to generate proposal");
        } finally {
            setLoadingProposal(false);
        }
    };

    const postedAgo = formatDistanceToNow(new Date(postedDate), { addSuffix: true });

    const topKeywords = Object.entries(matchedKeywordBreakdown)
        .sort(([, a], [, b]) => b.weighted - a.weighted)
        .slice(0, 3)
        .map(([kw, val]) => `${kw} (${val.totalMatches})`);

    const toggleDetails = () => setShowRelevanceDetails(prev => !prev);

    const formatAbbreviated = (num) => {
        if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
        if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
        return `$${num}`;
    };

    return (
        <div className="bg-white shadow-md border rounded-lg p-4 space-y-3 relative">
            {/* Header */}
            <TooltipProvider>
                <div className="flex justify-between items-center flex-wrap">
                    <span className="text-lg font-semibold text-blue-700">
                        {title}
                    </span>

                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        {/* Static Relevance Breakdown with Semantic Tooltip */}
                        <div className="text-gray-700 flex flex-wrap gap-1 items-center">
                            🔑 Keyword {keywordScore}% | 📊 Field {fieldScore}% |{" "}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="underline cursor-help text-blue-700 font-medium">
                                        🤖 Semantic {job.semanticRelevance?.score ?? "N/A"}%
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm p-2 text-sm">
                                    <p className="font-semibold mb-1">🤖 Semantic Relevance</p>
                                    <p>
                                        <strong>Verdict:</strong>{" "}
                                        {job.semanticRelevance?.verdict || "N/A"}
                                    </p>
                                    <p>
                                        <strong>Reason:</strong>{" "}
                                        {job.semanticRelevance?.reason || "No reason provided."}
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        {/* Rule-Based Relevance Score Badge */}
                        <span
                            className={`font-semibold text-white px-2.5 py-1 rounded shadow ${getRelevanceColor(relevanceScore)}`}
                            title="Rule-Based Relevance"
                        >
                            Relevance: {relevanceScore}%
                        </span>

                        {/* Reprocess button */}
                        <button
                            onClick={handleReprocess}
                            disabled={reprocessing}
                            className="ml-2 p-1 border rounded hover:bg-gray-100 transition flex items-center justify-center"
                            title="Reprocess this job"
                        >
                            {reprocessing ? (
                                <svg
                                    className="animate-spin h-4 w-4 text-blue-600"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v8H4z"
                                    ></path>
                                </svg>
                            ) : (
                                <RotateCcw className="h-4 w-4 text-blue-600" />
                            )}
                        </button>


                    </div>
                </div>
            </TooltipProvider>


            {/* Relevance Summary */}
            <div className="text-xs text-gray-700 space-y-1">
                <div>
                    Profile Match: <strong>{profile}</strong>
                </div>

                <div className="flex justify-between items-center">
                    🔑 Keywords: {uniqueKeywordsMatched} matched ({totalKeywordHits} hits)
                </div>

                {Object.keys(matchedKeywordBreakdown).length > 0 && (
                    <div className="text-gray-600">
                        Total Hits — 🔠 Title: <strong>{Object.values(matchedKeywordBreakdown).reduce((sum, k) => sum + k.titleMatches, 0)}</strong>,
                        📄 Desc: <strong>{Object.values(matchedKeywordBreakdown).reduce((sum, k) => sum + k.descMatches, 0)}</strong>,
                        🗂️ Cat: <strong>{Object.values(matchedKeywordBreakdown).reduce((sum, k) => sum + k.catMatches, 0)}</strong>
                    </div>
                )}

                {topKeywords.length > 0 && (
                    <div className="text-gray-600">Top: {topKeywords.join(', ')}</div>
                )}

                <button
                    onClick={toggleDetails}
                    className="text-blue-500 hover:underline flex items-center text-xs mt-1"
                >
                    Insights {showRelevanceDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showRelevanceDetails && (
                    <div className="bg-gray-50 border rounded p-2 mt-1 space-y-2">
                        <div className="ml-2">
                            <strong>Keyword Score:</strong> {keywordScore}<br />
                            <strong>Field Score:</strong> {fieldScore}<br />
                            <strong>Final Score:</strong>{' '}
                            {`{(${relevance.keywordWeightPercent}% × ${keywordScore} = ${(relevance.keywordWeightPercent * keywordScore / 100).toFixed(1)}) + (${relevance.fieldWeightPercent}% × ${fieldScore} = ${(relevance.fieldWeightPercent * fieldScore / 100).toFixed(1)})} ÷ 100 = ${(
                                (relevance.keywordWeightPercent * keywordScore + relevance.fieldWeightPercent * fieldScore) / 100
                            ).toFixed(1)}`}
                        </div>

                        <div>
                            <div className="font-semibold text-xs text-gray-800">Keyword Matches:</div>
                            {Object.entries(matchedKeywordBreakdown).map(([kw, val]) => (
                                <div key={kw} className="text-xs text-gray-600 ml-2">
                                    🔹 <strong>{kw}</strong>: {val.totalMatches} hits
                                    (Title: {val.titleMatches}, Desc: {val.descMatches}, Cat: {val.catMatches})
                                    <span className="text-green-600 font-semibold ml-1">+{val.weighted}</span>
                                </div>
                            ))}
                        </div>

                        <div>
                            <div className="font-semibold text-xs text-gray-800">Field Score Breakdown:</div>
                            {Object.entries(fieldScoreBreakdown)
                                .filter(([, score]) => score !== 0)
                                .map(([field, score]) => {
                                    const isPositive = score > 0;
                                    const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
                                    const icon = isPositive ? '✅' : '⚠️';

                                    return (
                                        <div key={field} className="text-xs ml-2 flex items-center gap-1">
                                            <span>{icon}</span>
                                            <span className="text-gray-800">{FIELD_LABELS[field] || field}:</span>
                                            <span className={`font-semibold ${colorClass}`}>
                                                {score >= 0 ? `+${score}` : score}
                                            </span>
                                            <span className="text-gray-800">score</span>
                                        </div>
                                    );
                                })}
                        </div>

                        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-2 rounded text-sm">
                            <div className="font-semibold text-indigo-700 mb-1">🤖 Semantic Relevance</div>
                            <p><strong>Score:</strong> {job.semanticRelevance.score}%</p>
                            <p><strong>Verdict:</strong> {job.semanticRelevance.verdict || 'N/A'}</p>
                            <p><strong>Reason:</strong> {job.semanticRelevance.reason || 'No reason provided.'}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap text-sm text-gray-600 gap-x-4 gap-y-1 pt-2 border-t mt-2">
                <div>📂 {mainCategory}</div>
                <div>⚙️ {experienceLevel}</div>
                <div>📈 {projectType}</div>
                <div>🕒 {postedAgo}</div>
                <div>🔁 Connects: {requiredConnects}</div>
                <div>💼 {pricingModel}</div>
                {pricingModel === 'Fixed' ? (
                    (maxRange > 0 || minRange > 0) && (
                        <div>💵 Budget: ${maxRange || minRange}</div>
                    )
                ) : (
                    (minRange > 0 || maxRange > 0) && (
                        <div>💵 Budget: ${minRange} - ${maxRange} /hr</div>
                    )
                )}
            </div>

            {/* Client Info */}
            <div className="border-t pt-2 text-sm grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700">
                <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {clientCity}, {clientCountry}
                </div>
                <div className="flex items-center gap-1">
                    <BadgeCheck className="w-4 h-4" />
                    Payment: {clientPaymentVerified ? '✔️ Verified' : '❌ Not Verified'}
                </div>
                <div className="flex items-center gap-1">
                    <PhoneCall className="w-4 h-4" />
                    Phone: {clientPhoneVerified ? '✔️ Verified' : '❌ Not Verified'}
                </div>
                <div>💰 Spend: {formatAbbreviated(clientSpend)}</div>
                <div>📊 Jobs Posted: {clientJobsPosted}</div>
                <div>🧑‍💼 Hires: {clientHires} ({clientHireRate}%)</div>
                <div>📅 Member Since: {clientMemberSince}</div>
                <div>⚖️ Avg Rate: ${clientAverageHourlyRate || 'N/A'}</div>
                <div>⭐ Rating: {clientRating} ({clientReviews} reviews)</div>
            </div>

            {/* View Description Button */}
            <button
                onClick={() => setShowDescription(true)}
                className="text-blue-600 underline text-sm mt-2"
            >
                📄 View Description
            </button>


            {/* Description Modal */}
            {showDescription && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
                    onClick={() => setShowDescription(false)} // 👉 backdrop click closes modal
                >
                    <div
                        className="bg-white rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto relative"
                        onClick={(e) => e.stopPropagation()} // 👉 stop closing when clicking inside modal
                    >
                        <button
                            onClick={() => setShowDescription(false)}
                            className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                        >
                            <X size={18} />
                        </button>
                        <h2 className="text-lg font-semibold mb-4">{title}</h2>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{description}</p>
                    </div>
                </div>
            )}

            {showProposal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
                    onClick={() => setShowProposal(false)}
                >
                    <div
                        className="bg-white rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setShowProposal(false)}
                            className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                        >
                            <X size={18} />
                        </button>

                        {/* Modal Heading with Copy Button */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Generated Proposal</h2>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(job.semanticRelevance?.proposal || '');
                                    toast.success('Proposal copied to clipboard!');
                                }}
                                title="Copy to Clipboard"
                                className="text-gray-600 hover:text-gray-900 transition text-lg"
                            >
                                📋
                            </button>
                        </div>

                        {/* Proposal Text */}
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">
                            {job.semanticRelevance?.proposal}
                        </p>
                    </div>
                </div>
            )}



            <div className="flex gap-2 items-center">
                <select
                    value={proposalType}
                    onChange={(e) => setProposalType(e.target.value)}
                    className="text-sm border rounded px-2 py-1"
                >
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="detailed">Detailed</option>
                </select>

                <button
                    onClick={handleGenerateProposal}
                    disabled={loadingProposal}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm"
                >
                    {loadingProposal ? '⏳ Generating...' : '✍️ Generate Proposal'}
                </button>

                {job.semanticRelevance?.proposal && (
                    <button
                        onClick={() => setShowProposal(true)}
                        className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded text-sm"
                    >
                        📄 View Proposal
                    </button>
                )}
            </div>

        </div>



    );
};

export default JobCard;
