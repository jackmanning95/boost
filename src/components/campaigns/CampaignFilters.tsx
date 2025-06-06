import React from 'react';
import { Search, Filter, Calendar } from 'lucide-react';
import Input from '../ui/Input';
import { CampaignFilters } from '../../types';

interface CampaignFiltersProps {
  filters: CampaignFilters;
  onFiltersChange: (filters: Partial<CampaignFilters>) => void;
}

const CAMPAIGN_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_on_client', label: 'Waiting on Client' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
  { value: 'completed', label: 'Completed' }
];

const CampaignFiltersComponent: React.FC<CampaignFiltersProps> = ({
  filters,
  onFiltersChange
}) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
      <div className="flex flex-wrap gap-4">
        {/* Search */}
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search campaigns..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="min-w-48">
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
            <select
              value={filters.status}
              onChange={(e) => onFiltersChange({ status: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none"
            >
              {CAMPAIGN_STATUSES.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div className="flex gap-2">
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
            <Input
              type="date"
              placeholder="Start date"
              value={filters.dateRange.start}
              onChange={(e) => onFiltersChange({ 
                dateRange: { ...filters.dateRange, start: e.target.value }
              })}
              className="pl-10 w-40"
            />
          </div>
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
            <Input
              type="date"
              placeholder="End date"
              value={filters.dateRange.end}
              onChange={(e) => onFiltersChange({ 
                dateRange: { ...filters.dateRange, end: e.target.value }
              })}
              className="pl-10 w-40"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignFiltersComponent;