'use client';
import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectContent,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import LoadingButton from '@/components/ui/loading-button';
import JobCard from '@/components/JobCard';
import { getFilteredJobs } from '@/apis/jobs';
import { subDays, format } from 'date-fns';

const JobsPage = () => {
  const [filters, setFilters] = useState({
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
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true); // default = shown

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const query = {};

      Object.entries(filters).forEach(([key, value]) => {
        if (
          value !== '' &&
          value !== null &&
          value !== undefined &&
          value !== 'any'
        ) {
          query[key] = value;
        }
      });

      const response = await getFilteredJobs(query);
      setJobs(response.data.jobs || []);
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

  const handleSelect = (name, value) => {
    setFilters((prev) => {
      const updated = { ...prev, [name]: value };

      // Reset value fields if operator is 'any'
      if (name === 'clientRatingOp' && value === 'any') updated.clientRating = '';
      if (name === 'clientSpendOp' && value === 'any') updated.clientSpend = '';
      if (name === 'avgHourlyRateOp' && value === 'any') updated.avgHourlyRate = '';

      return updated;
    });
  };

  const clearFilters = () => {
    setFilters((prev) => ({
      ...prev,
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
    }));
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

      {/* Toggle Filters */}
      <div className="mb-4">
        <button onClick={() => setShowFilters((prev) => !prev)} className="btn-outline w-full md:w-auto">
          {showFilters ? 'Hide Filters ▲' : 'Show Filters ▼'}
        </button>
      </div>

      {/* Filter Section */}
      <div className={`mb-6 ${showFilters ? 'block' : 'hidden'}`}>
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">

          {/* Standard Inputs */}
          <div className="flex flex-col md:w-[160px]">
            <Label className="field-label">📅 Start Date</Label>
            <Input type="date" name="startDate" value={filters.startDate} onChange={handleChange} className="input-field" />
          </div>
          <div className="flex flex-col md:w-[160px]">
            <Label className="field-label">📅 End Date</Label>
            <Input type="date" name="endDate" value={filters.endDate} onChange={handleChange} className="input-field" />
          </div>
          <div className="flex flex-col md:w-[200px]">
            <Label className="field-label">🔍 Keyword</Label>
            <Input name="keyword" placeholder="Title, description, category" value={filters.keyword} onChange={handleChange} className="input-field" />
          </div>
          <div className="flex flex-col md:w-[150px]">
            <Label className="field-label">🌍 Country</Label>
            <Input name="clientCountry" placeholder="e.g. US" value={filters.clientCountry} onChange={handleChange} className="input-field" />
          </div>

          {/* Selects */}
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

          {/* Budget */}
          <div className="flex flex-col md:w-[100px]">
            <Label className="field-label">💵 Min Budget</Label>
            <Input name="minBudget" type="number" value={filters.minBudget} onChange={handleChange} className="input-field" />
          </div>
          <div className="flex flex-col md:w-[100px]">
            <Label className="field-label">💵 Max Budget</Label>
            <Input name="maxBudget" type="number" value={filters.maxBudget} onChange={handleChange} className="input-field" />
          </div>

          {/* Advanced */}
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

          {/* Action Buttons */}
          <div className="flex gap-2 md:ml-auto md:mt-4">
            <LoadingButton loading={loading} onClick={fetchJobs} className="btn-primary h-10 px-6">
              Apply
            </LoadingButton>
            <button onClick={clearFilters} className="btn-outline h-10 px-4">
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
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
