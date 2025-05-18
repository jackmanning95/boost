import React, { useState, useEffect } from 'react';
import { AudienceSegment } from '../../types';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { Search, Filter } from 'lucide-react';
import Input from '../ui/Input';
import ReactPaginate from 'react-paginate';

interface AudienceSearchProps {
  onSearchResults: (results: AudienceSegment[]) => void;
  onPageChange: (page: number) => void;
  currentPage: number;
  totalPages: number;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

type SortOrder = 'asc' | 'desc' | null;

const AudienceSearch: React.FC<AudienceSearchProps> = ({
  onSearchResults,
  onPageChange,
  currentPage,
  totalPages
}) => {
  const { searchAudiences, loading, dataSuppliers } = useTaxonomy();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDataSupplier, setSelectedDataSupplier] = useState<string>('');
  const [cpmSortOrder, setCpmSortOrder] = useState<SortOrder>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        console.log('Fetching results with params:', {
          query: debouncedSearchQuery,
          page: currentPage,
          supplier: selectedDataSupplier,
          sort: cpmSortOrder
        });

        const results = await searchAudiences(
          debouncedSearchQuery,
          currentPage,
          12,
          selectedDataSupplier,
          cpmSortOrder
        );
        onSearchResults(results);
      } catch (error) {
        console.error('Error fetching search results:', error);
      }
    };

    fetchResults();
  }, [debouncedSearchQuery, currentPage, selectedDataSupplier, cpmSortOrder, searchAudiences, onSearchResults]);

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={20} className="text-gray-400" />
        </div>
        <Input
          type="text"
          placeholder="Search audiences by name, description, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm text-gray-600">Filter by:</span>
        </div>

        {/* Data Supplier Filter */}
        <div className="relative">
          <select
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white appearance-none pr-8"
            value={selectedDataSupplier}
            onChange={(e) => setSelectedDataSupplier(e.target.value)}
          >
            <option value="">All Data Suppliers ({dataSuppliers.length})</option>
            {dataSuppliers.map(supplier => (
              <option key={supplier} value={supplier}>{supplier}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* CPM Sort Dropdown */}
        <select
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
          value={cpmSortOrder || ''}
          onChange={(e) => setCpmSortOrder(e.target.value as SortOrder)}
        >
          <option value="">Sort by CPM</option>
          <option value="asc">CPM: Low to High</option>
          <option value="desc">CPM: High to Low</option>
        </select>
      </div>

      {loading && (
        <div className="flex justify-center py-2">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <ReactPaginate
            previousLabel="Previous"
            nextLabel="Next"
            breakLabel="..."
            pageCount={totalPages}
            marginPagesDisplayed={2}
            pageRangeDisplayed={5}
            onPageChange={({ selected }) => onPageChange(selected + 1)}
            containerClassName="flex gap-2"
            pageClassName="px-3 py-1 rounded border"
            activeClassName="bg-blue-500 text-white"
            previousClassName="px-3 py-1 rounded border"
            nextClassName="px-3 py-1 rounded border"
            disabledClassName="opacity-50"
            forcePage={currentPage - 1}
          />
        </div>
      )}
    </div>
  );
};

export default AudienceSearch;