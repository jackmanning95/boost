import React, { useState, useEffect } from 'react';
import { AudienceSegment } from '../../types';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { Search, SortAsc, SortDesc } from 'lucide-react';
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
  const { searchAudiences, loading, audiences } = useTaxonomy();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDataSupplier, setSelectedDataSupplier] = useState<string>('');
  const [cpmSortOrder, setCpmSortOrder] = useState<SortOrder>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Get unique data suppliers
  const dataSuppliers = React.useMemo(() => {
    const suppliers = new Set(audiences.map(a => a.dataSupplier).filter(Boolean));
    return Array.from(suppliers).sort();
  }, [audiences]);

  useEffect(() => {
    const fetchResults = async () => {
      try {
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

  const toggleCpmSort = () => {
    setCpmSortOrder(current => {
      if (current === null) return 'asc';
      if (current === 'asc') return 'desc';
      return null;
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={20} className="text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search audiences..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Data Supplier Filter */}
        <div>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={selectedDataSupplier}
            onChange={(e) => setSelectedDataSupplier(e.target.value)}
          >
            <option value="">All Data Suppliers</option>
            {dataSuppliers.map(supplier => (
              <option key={supplier} value={supplier}>{supplier}</option>
            ))}
          </select>
        </div>

        {/* CPM Sort */}
        <div>
          <button
            onClick={toggleCpmSort}
            className={`flex items-center justify-center w-full rounded-md border px-3 py-2 text-sm transition-colors ${
              cpmSortOrder
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {cpmSortOrder === 'asc' && <SortAsc size={16} className="mr-2" />}
            {cpmSortOrder === 'desc' && <SortDesc size={16} className="mr-2" />}
            Sort by CPM {cpmSortOrder === 'asc' ? '(Low to High)' : cpmSortOrder === 'desc' ? '(High to Low)' : ''}
          </button>
        </div>
      </div>

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