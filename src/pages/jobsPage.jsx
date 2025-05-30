'use client';
import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectTrigger, SelectContent, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import LoadingButton from '@/components/ui/loading-button';
import JobCard from '@/components/JobCard';

const JobsPage = () => {
    const [filters, setFilters] = useState({
        keyword: '',
        minBudget: '',
        maxBudget: '',
        clientCountry: '',
        clientPhoneVerified: false,
        clientPaymentVerified: false,
        minHourlyRate: '',
        maxHourlyRate: '',
        pricingModel: '',
        minScore: '',
        clientRatingOp: '=',
        clientSpendOp: '=',
        avgHourlyRateOp: '=',
    });

    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const query = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== '' && value !== null) query.append(key, value);
            });

            const response = await fetch(`/api/jobs/list?${query.toString()}`);
            const data = await response.json();
            setJobs(data.jobs || []);
        } catch (err) {
            toast.error('Failed to fetch jobs');
            console.error('[Fetch Jobs Error]', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFilters((prev) => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value,
        }));
    };

    const handleSwitch = (name, value) => {
        setFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSearch = () => fetchJobs();

    return (
        <div className="p-4">
            <h2 className="page-title">🧠 Relevant Job Listings</h2>

            {/* Toggle button for mobile */}
            <div className="md:hidden mb-4">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="btn-outline w-full"
                >
                    {showFilters ? 'Hide Filters ▲' : 'Show Filters ▼'}
                </button>
            </div>

            {/* Responsive Filters Bar */}
            {/* Mobile Filter Toggle */}
            <div className="md:hidden mb-4">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="btn-outline w-full"
                >
                    {showFilters ? 'Hide Filters ▲' : 'Show Filters ▼'}
                </button>
            </div>

            {/* Filter Bar */}
            <div className={`mb-6 ${showFilters ? 'block' : 'hidden'} md:block`}>
                <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">

                    {/* 📅 Date Range */}
                    <div className="flex flex-col md:w-[160px]">
                        <Label className="field-label">📅 Start Date</Label>
                        <Input type="date" name="startDate" value={filters.startDate} onChange={handleChange} className="input-field" />
                    </div>
                    <div className="flex flex-col md:w-[160px]">
                        <Label className="field-label">📅 End Date</Label>
                        <Input type="date" name="endDate" value={filters.endDate} onChange={handleChange} className="input-field" />
                    </div>

                    {/* 🔍 Keyword */}
                    <div className="flex flex-col md:w-[200px]">
                        <Label className="field-label">🔍 Keyword</Label>
                        <Input name="keyword" placeholder="Title, description, category" value={filters.keyword} onChange={handleChange} className="input-field" />
                    </div>

                    {/* 🌍 Country */}
                    <div className="flex flex-col md:w-[150px]">
                        <Label className="field-label">🌍 Country</Label>
                        <Input name="clientCountry" placeholder="e.g. US" value={filters.clientCountry} onChange={handleChange} className="input-field" />
                    </div>

                    {/* 💼 Job Type */}
                    <div className="flex flex-col md:w-[130px]">
                        <Label className="field-label">💼 Job Type</Label>
                        <Select value={filters.pricingModel} onValueChange={(val) => setFilters({ ...filters, pricingModel: val })}>
                            <SelectTrigger className="select-trigger">
                                <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent className="select-content">
                                <SelectItem value="fixed">Fixed</SelectItem>
                                <SelectItem value="hourly">Hourly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 💵 Budget Range */}
                    <div className="flex flex-col md:w-[100px]">
                        <Label className="field-label">💵 Min Budget</Label>
                        <Input name="minBudget" type="number" value={filters.minBudget} onChange={handleChange} className="input-field" />
                    </div>
                    <div className="flex flex-col md:w-[100px]">
                        <Label className="field-label">💵 Max Budget</Label>
                        <Input name="maxBudget" type="number" value={filters.maxBudget} onChange={handleChange} className="input-field" />
                    </div>

                    {/* ⭐ Client Rating */}
                    <div className="flex flex-col md:w-[190px]">
                        <Label className="field-label">⭐ Client Rating</Label>
                        <div className="flex items-center gap-2">
                            <Select value={filters.clientRatingOp} onValueChange={(val) => setFilters({ ...filters, clientRatingOp: val })}>
                                <SelectTrigger className="select-trigger w-[70px]">
                                    <SelectValue placeholder="=" />
                                </SelectTrigger>
                                <SelectContent className="select-content">
                                    <SelectItem value=">">&gt;</SelectItem>
                                    <SelectItem value=">=">&ge;</SelectItem>
                                    <SelectItem value="=">=</SelectItem>
                                    <SelectItem value="<">&lt;</SelectItem>
                                    <SelectItem value="<=">&le;</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input name="clientRating" type="number" step="0.1" value={filters.clientRating} onChange={handleChange} className="input-field" />
                        </div>
                    </div>

                    {/* 💰 Client Spend */}
                    <div className="flex flex-col md:w-[190px]">
                        <Label className="field-label">💰 Client Spend</Label>
                        <div className="flex items-center gap-2">
                            <Select value={filters.clientSpendOp} onValueChange={(val) => setFilters({ ...filters, clientSpendOp: val })}>
                                <SelectTrigger className="select-trigger w-[70px]">
                                    <SelectValue placeholder="=" />
                                </SelectTrigger>
                                <SelectContent className="select-content">
                                    <SelectItem value=">">&gt;</SelectItem>
                                    <SelectItem value=">=">&ge;</SelectItem>
                                    <SelectItem value="=">=</SelectItem>
                                    <SelectItem value="<">&lt;</SelectItem>
                                    <SelectItem value="<=">&le;</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input name="clientSpend" type="number" value={filters.clientSpend} onChange={handleChange} className="input-field" />
                        </div>
                    </div>

                    {/* ⚖️ Avg Hourly Rate. */}
                    <div className="flex flex-col md:w-[190px]">
                        <Label className="field-label">⚖️ Avg Hourly Rate</Label>
                        <div className="flex items-center gap-2">
                            <Select value={filters.avgHourlyRateOp} onValueChange={(val) => setFilters({ ...filters, avgHourlyRateOp: val })}>
                                <SelectTrigger className="select-trigger w-[70px]">
                                    <SelectValue placeholder="=" />
                                </SelectTrigger>
                                <SelectContent className="select-content">
                                    <SelectItem value=">">&gt;</SelectItem>
                                    <SelectItem value=">=">&ge;</SelectItem>
                                    <SelectItem value="=">=</SelectItem>
                                    <SelectItem value="<">&lt;</SelectItem>
                                    <SelectItem value="<=">&le;</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input name="avgHourlyRate" type="number" value={filters.avgHourlyRate} onChange={handleChange} className="input-field" />
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="flex flex-col">
                        <Label className="field-label">📞 Phone Verified</Label>
                        <input type="checkbox" checked={filters.clientPhoneVerified} onChange={(e) => handleSwitch('clientPhoneVerified', e.target.checked)} className="switch" />
                    </div>
                    <div className="flex flex-col">
                        <Label className="field-label">💳 Payment Verified</Label>
                        <input type="checkbox" checked={filters.clientPaymentVerified} onChange={(e) => handleSwitch('clientPaymentVerified', e.target.checked)} className="switch" />
                    </div>

                    {/* Apply Button */}
                    <div className="md:ml-auto md:mt-4">
                        <LoadingButton loading={loading} onClick={handleSearch} className="btn-primary h-10 px-6">
                            Apply
                        </LoadingButton>
                    </div>

                </div>
            </div>




            {/* Job Listings */}
            <div className="space-y-4">
                {loading ? (
                    <p>Loading jobs...</p>
                ) : jobs.length === 0 ? (
                    <p>No jobs found with current filters.</p>
                ) : (
                    jobs.map((job, idx) => <JobCard key={idx} job={job} />)
                )}
            </div>
        </div>
    );
};

export default JobsPage;
