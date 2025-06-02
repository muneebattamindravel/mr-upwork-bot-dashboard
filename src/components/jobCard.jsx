import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { BadgeCheck, PhoneCall, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

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

    const getRelevanceColor = (score) => {
        if (score >= 85) return 'bg-green-600';
        if (score >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const postedAgo = formatDistanceToNow(new Date(postedDate), { addSuffix: true });

    const topKeywords = Object.entries(matchedKeywordBreakdown)
        .sort(([, a], [, b]) => b.weighted - a.weighted)
        .slice(0, 3)
        .map(([kw, val]) => `${kw} (${val.totalMatches})`);

    const toggleDetails = () => setShowRelevanceDetails(prev => !prev);

    return (
        <div className="bg-white shadow-md border rounded-lg p-4 space-y-3">
            {/* Header */}
            <div className="flex justify-between items-start flex-wrap">
                <a
                    href={url?.split('?')[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-semibold text-blue-700 hover:underline"
                >
                    {title}
                </a>

                <span
                    className={`text-xs text-white px-2 py-1 rounded ${getRelevanceColor(relevanceScore)}`}
                    title={`Keywords: ${keywordScore}, Fields: ${fieldScore}`}
                >
                    Relevance: {relevanceScore}%
                </span>
            </div>

            {/* Relevance Summary */}
            <div className="text-xs text-gray-700 space-y-1">
                <div>
                    Profile Match: <strong>{profile}</strong>
                </div>

                <div className="flex justify-between items-center">
                    🔑 Keywords: {uniqueKeywordsMatched} matched ({totalKeywordHits} hits)
                    <button
                        onClick={toggleDetails}
                        className="text-blue-500 hover:underline flex items-center text-xs"
                    >
                        Insights {showRelevanceDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>

                {topKeywords.length > 0 && (
                    <div className="text-gray-600">Top: {topKeywords.join(', ')}</div>
                )}

                {showRelevanceDetails && (
                    <div className="bg-gray-50 border rounded p-2 mt-1 space-y-2">
                        {/* Keyword Match Breakdown */}
                        <div>
                            <div className="font-semibold text-xs text-gray-800">Keyword Matches:</div>
                            {Object.entries(matchedKeywordBreakdown).map(([kw, val]) => (
                                <div key={kw} className="text-xs text-gray-600 ml-2">
                                    🔹 <strong>{kw}</strong>: {val.totalMatches} hits
                                    (Title: {val.titleMatches}, Desc: {val.descMatches}, Cat: {val.catMatches})
                                </div>
                            ))}
                        </div>

                        {/* Field Score Breakdown */}
                        <div>
                            <div className="font-semibold text-xs text-gray-800">Field Score Breakdown:</div>
                            {Object.entries(fieldScoreBreakdown)
                                .filter(([, score]) => score > 0)
                                .map(([field, score]) => (
                                    <div key={field} className="text-xs text-gray-600 ml-2">
                                        ✅ {field}: +{score}
                                    </div>
                                ))}
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
                <div>💰 Spend: {clientSpend}</div>
                <div>📊 Jobs Posted: {clientJobsPosted}</div>
                <div>🧑‍💼 Hires: {clientHires} ({clientHireRate}%)</div>
                <div>📅 Member Since: {clientMemberSince}</div>
                <div>⚖️ Avg Rate: ${clientAverageHourlyRate || 'N/A'}</div>
                <div>⭐ Rating: {clientRating} ({clientReviews} reviews)</div>
            </div>
        </div>
    );
};

export default JobCard;
