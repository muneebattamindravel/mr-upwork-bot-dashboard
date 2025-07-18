'use client';
import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectTrigger, SelectContent, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import LoadingButton from '@/components/ui/loading-button';
import JobCard from '@/components/jobCard';
import { getFilteredJobs } from '@/apis/jobs';
import { subDays, format } from 'date-fns';
import { RotateCcw } from 'lucide-react';
import { reprocessJobsStaticOnly, deleteAllJobs } from '../apis/jobs';
import { Loader2 } from 'lucide-react';;;

const defaultFilters = {
    keyword: '',
    minBudget: '',
    maxBudget: '',
    clientCountry: '',
    clientPhoneVerified: 'any',
    clientPaymentVerified: 'any',
    pricingModel: 'any',
    clientRating: '',
    clientRatingOp: 'any',
    clientSpend: '',
    clientSpendOp: 'any',
    avgHourlyRate: '',
    avgHourlyRateOp: 'any',
    startDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
};

const JobsPage = () => {
    const [filters, setFilters] = useState({ ...defaultFilters });
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(true);
    const [dateRange, setDateRange] = useState('last3d');
    const [sortBy, setSortBy] = useState('postedDate');
    const [sortOrder, setSortOrder] = useState('desc');
    const [allJobs, setAllJobs] = useState([]);
    const [deleting, setDeleting] = useState(false);
    const [totalAllJobs, setTotalAllJobs] = useState(0);
    const [reprocessing, setReprocessing] = useState(false);

    const applyDateRange = (range) => {
        const now = new Date();
        let start;

        switch (range) {
            case 'last24h':
                start = subDays(now, 1);
                break;
            case 'last3d':
                start = subDays(now, 3);
                break;
            case 'last7d':
                start = subDays(now, 7);
                break;
            case 'last30d':
                start = subDays(now, 30);
                break;
            case 'all':
                start = subDays(now, 365 * 20); // effectively "all time"
                break;
            default:
                return;
        }

        const newFilters = {
            ...filters,
            startDate: format(start, 'yyyy-MM-dd'),
            endDate: format(now, 'yyyy-MM-dd')
        };

        setFilters(newFilters);
        fetchJobs(newFilters);
    };

    const handleDeleteAllJobs = async () => {
        const confirmed = window.confirm('Are you sure you want to delete ALL jobs? This action is irreversible.');
        if (!confirmed) return;

        setDeleting(true);

        try {
            await deleteAllJobs();
            toast.success('✅ All jobs deleted!');
            window.location.reload();
        } catch (err) {
            console.error('[Delete Jobs Error]', err);
            toast.error('❌ Failed to delete jobs');
        } finally {
            setDeleting(false);
        }
    };


    const handleReprocess = async () => {
        try {
            setReprocessing(true);
            const res = await reprocessJobsStaticOnly();
            toast.success(res.data.message || 'Jobs reprocessed');
            await fetchJobs(); // refresh job list after re-scoring
        } catch (err) {
            toast.error('Failed to reprocess jobs');
            console.error('[Reprocess Error]', err);
        } finally {
            setReprocessing(false);
        }
    };


    const fetchJobs = async (appliedFilters = filters) => {
        try {
            setLoading(true);
            const query = {};
            Object.entries(appliedFilters).forEach(([key, value]) => {
                if (value !== '' && value !== null && value !== undefined && value !== 'any') {
                    query[key] = value;
                }
            });

            console.log('Query sent to backend:', query);
            const response = await getFilteredJobs(query);
            const { jobs: fetchedJobs, totalAll } = response.data.data || {};

            console.log('total jobs fetched ', fetchedJobs.length);

            setTotalAllJobs(totalAll || 0);
            setAllJobs(fetchedJobs); // 🟡 Save full list
            sortJobs(fetchedJobs, sortBy); // 🟢 Immediately sort with current criteria
        } catch (err) {
            toast.error('Failed to fetch jobs');
            console.error('[Fetch Jobs Error]', err);;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        applyDateRange(dateRange);
    }, []);

    useEffect(() => {
        if (allJobs.length > 0) {
            const getSortValue = (job, key) => {
                if (key === 'relevanceScore') return job.relevance?.relevanceScore || 0;
                if (key === 'avgHourlyRate') return job.clientAverageHourlyRate || 0;
                return job[key] || 0;
            };

            const sorted = [...allJobs].sort((a, b) => {
                const valA = getSortValue(a, sortBy);
                const valB = getSortValue(b, sortBy);

                if (typeof valA === 'string') {
                    return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }
                return sortOrder === 'asc' ? valA - valB : valB - valA;
            });

            setJobs(sorted);
        }
    }, [sortBy, sortOrder, allJobs]);

    const sortJobs = (jobList, sortKey) => {
        const sorted = [...jobList].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];

            if (typeof aVal === 'string') {
                return aVal.localeCompare(bVal);
            }

            return bVal - aVal; // descending order
        });

        setJobs(sorted);
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        const updatedFilters = {
            ...filters,
            [name]: type === 'number' ? parseFloat(value) : value
        };
        setFilters(updatedFilters);
        if (name === 'startDate' || name === 'endDate') fetchJobs(updatedFilters);
    };

    const handleSelect = (name, value) => {
        const updated = { ...filters, [name]: value };
        if (name === 'clientRatingOp' && value === 'any') updated.clientRating = '';
        if (name === 'clientSpendOp' && value === 'any') updated.clientSpend = '';
        if (name === 'avgHourlyRateOp' && value === 'any') updated.avgHourlyRate = '';
        setFilters(updated);
    };

    const clearFilters = () => {
        const cleared = { ...defaultFilters };
        setFilters(cleared);
        setDateRange('last24h');
        setSortBy('postedDate');
        setSortOrder('desc');
        fetchJobs(cleared);
    };

    const renderOperatorSelect = (name, currentValue) => (
        <Select value={currentValue} onValueChange={(val) => handleSelect(name, val)}>
            <SelectTrigger className="select-trigger w-[60px]">
                <SelectValue placeholder="any" />
            </SelectTrigger>
            <SelectContent className="select-content bg-white text-black">
                <SelectItem value="any">any</SelectItem>
                <SelectItem value=">">&gt;</SelectItem>
                <SelectItem value=">=">&ge;</SelectItem>
                <SelectItem value="=">=</SelectItem>
                <SelectItem value="<">&lt;</SelectItem>
                <SelectItem value="<=">&le;</SelectItem>
            </SelectContent>
        </Select>
    );

    return (
        <div className="p-4">
            <h2 className="page-title">🧠 Relevant Job Listings</h2>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <button onClick={() => setShowFilters((prev) => !prev)} className="btn-outline">
                    {showFilters ? 'Hide Filters ▲' : 'Show Filters ▼'}
                </button>
                <button onClick={clearFilters} className="btn-outline text-red-600">
                    Clear Filters
                </button>
            </div>

            {showFilters && (
                <div className="mb-6">
                    <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
                        <div className="flex flex-col md:w-[180px]">
                            <Label className="field-label">📅 Date Range</Label>
                            <Select value={dateRange} onValueChange={(val) => {
                                setDateRange(val);
                                if (val !== 'custom') applyDateRange(val);
                            }}>
                                <SelectTrigger className="select-trigger">
                                    <SelectValue placeholder="Date Range" />
                                </SelectTrigger>
                                <SelectContent className="select-content bg-white text-black">
                                    <SelectItem value="last24h">Last 24 Hours</SelectItem>
                                    <SelectItem value="last3d">Last 3 Days</SelectItem>
                                    <SelectItem value="last7d">Last 7 Days</SelectItem>
                                    <SelectItem value="last30d">Last 30 Days</SelectItem>
                                    <SelectItem value="all">All Time</SelectItem>
                                    <SelectItem value="custom">Custom Range</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {dateRange === 'custom' && (
                            <>
                                <div className="flex flex-col md:w-[160px]">
                                    <Label className="field-label">Start Date</Label>
                                    <Input type="date" name="startDate" value={filters.startDate} onChange={handleChange} className="input-field" />
                                </div>
                                <div className="flex flex-col md:w-[160px]">
                                    <Label className="field-label">End Date</Label>
                                    <Input type="date" name="endDate" value={filters.endDate} onChange={handleChange} className="input-field" />
                                </div>
                            </>
                        )}

                        <div className="flex flex-col md:w-[200px]">
                            <Label className="field-label">🔍 Keyword</Label>
                            <Input name="keyword" value={filters.keyword} onChange={handleChange} className="input-field" placeholder="Title, description..." />
                        </div>

                        <div className="flex flex-col md:w-[150px]">
                            <Label className="field-label">🌍 Country</Label>
                            <Input name="clientCountry" placeholder="e.g. US" value={filters.clientCountry} onChange={handleChange} className="input-field" />
                        </div>

                        <div className="flex flex-col md:w-[130px]">
                            <Label className="field-label">💼 Job Type</Label>
                            <Select value={filters.pricingModel} onValueChange={(val) => handleSelect('pricingModel', val)}>
                                <SelectTrigger className="select-trigger">
                                    <SelectValue placeholder="any" />
                                </SelectTrigger>
                                <SelectContent className="select-content bg-white text-black">
                                    <SelectItem value="any">any</SelectItem>
                                    <SelectItem value="fixed">Fixed</SelectItem>
                                    <SelectItem value="hourly">Hourly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col md:w-[100px]">
                            <Label className="field-label">💵 Min Budget</Label>
                            <Input name="minBudget" type="number" value={filters.minBudget} onChange={handleChange} className="input-field" />
                        </div>
                        <div className="flex flex-col md:w-[100px]">
                            <Label className="field-label">💵 Max Budget</Label>
                            <Input name="maxBudget" type="number" value={filters.maxBudget} onChange={handleChange} className="input-field" />
                        </div>

                        <div className="flex flex-col md:w-[200px]">
                            <Label className="field-label">⭐ Client Rating</Label>
                            <div className="flex items-center gap-2">
                                {renderOperatorSelect('clientRatingOp', filters.clientRatingOp)}
                                <Input name="clientRating" type="number" step="0.1" value={filters.clientRating} onChange={handleChange} className="input-field" />
                            </div>
                        </div>

                        <div className="flex flex-col md:w-[200px]">
                            <Label className="field-label">💰 Client Spend</Label>
                            <div className="flex items-center gap-2">
                                {renderOperatorSelect('clientSpendOp', filters.clientSpendOp)}
                                <Input name="clientSpend" type="number" value={filters.clientSpend} onChange={handleChange} className="input-field" />
                            </div>
                        </div>

                        <div className="flex flex-col md:w-[200px]">
                            <Label className="field-label">⚖️ Avg Hourly Rate</Label>
                            <div className="flex items-center gap-2">
                                {renderOperatorSelect('avgHourlyRateOp', filters.avgHourlyRateOp)}
                                <Input name="avgHourlyRate" type="number" value={filters.avgHourlyRate} onChange={handleChange} className="input-field" />
                            </div>
                        </div>

                        <div className="flex flex-col md:w-[180px]">
                            <Label className="field-label">📞 Phone Verified</Label>
                            <Select value={filters.clientPhoneVerified} onValueChange={(val) => handleSelect('clientPhoneVerified', val)}>
                                <SelectTrigger className="select-trigger">
                                    <SelectValue placeholder="any" />
                                </SelectTrigger>
                                <SelectContent className="select-content bg-white text-black">
                                    <SelectItem value="any">any</SelectItem>
                                    <SelectItem value="true">true</SelectItem>
                                    <SelectItem value="false">false</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col md:w-[180px]">
                            <Label className="field-label">💳 Payment Verified</Label>
                            <Select value={filters.clientPaymentVerified} onValueChange={(val) => handleSelect('clientPaymentVerified', val)}>
                                <SelectTrigger className="select-trigger">
                                    <SelectValue placeholder="any" />
                                </SelectTrigger>
                                <SelectContent className="select-content bg-white text-black">
                                    <SelectItem value="any">any</SelectItem>
                                    <SelectItem value="true">true</SelectItem>
                                    <SelectItem value="false">false</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col md:w-[180px]">
                            <Label className="field-label">📊 Sort By</Label>
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="select-trigger">
                                    <SelectValue placeholder="Select field" />
                                </SelectTrigger>
                                <SelectContent className="select-content bg-white text-black">
                                    <SelectItem value="postedDate">📅 Posted Date</SelectItem>
                                    <SelectItem value="relevanceScore">🧠 Relevance Score</SelectItem>
                                    <SelectItem value="clientRating">⭐ Client Rating</SelectItem>
                                    <SelectItem value="clientSpend">💰 Client Spend</SelectItem>
                                    <SelectItem value="avgHourlyRate">⚖️ Avg Hourly Rate</SelectItem>
                                    <SelectItem value="minRange">💵 Min Budget</SelectItem>
                                    <SelectItem value="maxRange">💵 Max Budget</SelectItem>
                                    <SelectItem value="clientCountry">🌍 Client Country</SelectItem>
                                    <SelectItem value="pricingModel">💼 Job Type</SelectItem>
                                </SelectContent>


                            </Select>
                        </div>

                        <div className="flex flex-col md:w-[140px]">
                            <Label className="field-label">⬇️ Order</Label>
                            <Select value={sortOrder} onValueChange={setSortOrder}>
                                <SelectTrigger className="select-trigger">
                                    <SelectValue placeholder="asc/desc" />
                                </SelectTrigger>
                                <SelectContent className="select-content bg-white text-black">
                                    <SelectItem value="asc">Ascending</SelectItem>
                                    <SelectItem value="desc">Descending</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>




                        <div className="md:ml-auto md:mt-4">
                            <LoadingButton loading={loading} onClick={() => fetchJobs()} className="btn-primary h-10 px-6">
                                Apply
                            </LoadingButton>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <button
                    onClick={handleReprocess}
                    disabled={reprocessing}
                    className={`btn-outline text-blue-600 ${reprocessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {reprocessing ? (
                        <span className="flex items-center gap-1">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Reprocessing...
                        </span>
                    ) : (
                        '🔄 Reprocess Relevance'
                    )}
                </button>

                <button
                    onClick={handleDeleteAllJobs}
                    disabled={deleting}
                    className={`btn-outline text-red-600 ml-4 ${deleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {deleting ? (
                        <span className="flex items-center gap-1">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Deleting...
                        </span>
                    ) : (
                        '🗑️ Delete All Jobs'
                    )}
                </button>

            </div>

            <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
                <div>
                    Showing <strong>{allJobs.length}</strong> of <strong>{totalAllJobs}</strong> total jobs
                </div>

                <button
                    onClick={() => fetchJobs()}
                    disabled={loading}
                    className={`rounded-full p-2 transition hover:bg-gray-100 border ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Refresh Job Feed"
                >
                    <RotateCcw className="w-4 h-4 text-purple-700" />
                </button>
            </div>


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
