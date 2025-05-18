import React, { useState, useEffect } from 'react';
import { AudienceSegment } from '../../types';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { Search } from 'lucide-react';
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

const AudienceSearch: React.FC<AudienceSearchProps> = ({
  onSearchResults,
  onPageChange,
  currentPage,
  totalPages
}) => {
  const { searchAudiences, loading } = useTaxonomy();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const results = await searchAudiences(debouncedSearchQuery, currentPage);
        onSearchResults(results);
      } catch (error) {
        console.error('Error fetching search results:', error);
      }
    };

    fetchResults();
  }, [debouncedSearchQuery, currentPage, searchAudiences, onSearchResults]);

  const handlePageClick = (event: { selected: number }) => {
    onPageChange(event.selected + 1);
  };

  return (
    <div className="space-y-4">
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

      {totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <ReactPaginate
            previousLabel="Previous"
            nextLabel="Next"
            breakLabel="..."
            pageCount={totalPages}
            marginPagesDisplayed={2}
            pageRangeDisplayed={5}
            onPageChange={handlePageClick}
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