import React from 'react';

const JobCard = ({ job }) => {
    return (
        <div className="card space-y-2">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-semibold text-purple-700">{job.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>
                    <div className="text-xs text-gray-500 space-x-2 mt-1">
                        <span>💰 ${job.minRange} - ${job.maxRange}</span>
                        <span>🌍 {job.clientCountry}</span>
                        <span>📞 Phone: {job.clientPhoneVerified ? 'Yes' : 'No'}</span>
                        <span>💳 Payment: {job.clientPaymentVerified ? 'Yes' : 'No'}</span>
                        <span>📈 Score: {job.relevanceScore ?? '-'}</span>
                    </div>
                </div>
                <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 underline"
                >
                    View
                </a>
            </div>
        </div>
    );
};

export default JobCard;
