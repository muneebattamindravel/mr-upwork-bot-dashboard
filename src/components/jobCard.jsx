import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { BadgeCheck, PhoneCall, MapPin, Star } from 'lucide-react';

const JobCard = ({ job }) => {
    const {
        title,
        description,
        url,
        relevanceScore,
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
        clientReviews
    } = job;

    // Relevance color
    const getRelevanceColor = (score) => {
        if (score >= 85) return 'bg-green-600';
        if (score >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const postedAgo = formatDistanceToNow(new Date(postedDate), { addSuffix: true });

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

                <span className={`text-xs text-white px-2 py-1 rounded ${getRelevanceColor(relevanceScore)}`}>
                    Relevance: {relevanceScore}%
                </span>
            </div>

            {/* Meta Row */}
            <div className="flex flex-wrap text-sm text-gray-600 gap-x-4 gap-y-1">
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

            {/* Description */}
            <p className="text-sm text-gray-800 line-clamp-3">{description}</p>

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
