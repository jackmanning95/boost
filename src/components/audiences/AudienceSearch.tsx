import React, { useState, useEffect } from 'react';
import { AudienceSegment } from '../../types';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { Search } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface AudienceSearchProps {
  onSearchResults: (results: AudienceSegment[]) => void;
}

const AudienceSearch: React.FC<AudienceSearchProps> = ({ onSearchResults }) => {
  const { audiences, searchAudiences, loading } = useTaxonomy();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!loading) {
      // Load initial data
      handleSearch();
      
      // Set up categories
      const uniqueCategories = Array.from(
        new Set(audiences.map(audience => audience.category))
      ).sort();
      setCategories(uniqueCategories);
    }
  }, [loading]);

  const handleSearch = async () => {
    console.log('Searching with query:', searchQuery);
    setIsSearching(true);
    
    try {
      const results = await searchAudiences(searchQuery);
      console.log('Search results:', results);
      
      let filteredResults = results;
      if (selectedCategory) {
        filteredResults = results.filter(audience => audience.category === selectedCategory);
        console.log('Filtered by category:', selectedCategory, filteredResults);
      }
      
      onSearchResults(filteredResults);
    } catch (error) {
      console.error('Search error:', error);
      onSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleCategorySelect = (category: string) => {
    const newCategory = category === selectedCategory ? '' : category;
    setSelectedCategory(newCategory);
    handleSearch();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={20} className="text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search audiences by name, description, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10"
          />
        </div>
        <Button
          variant="primary"
          onClick={handleSearch}
          isLoading={isSearching}
        >
          Search
        </Button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <button
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            selectedCategory === '' 
              ? 'bg-[#509fe0]/10 text-[#509fe0] font-medium' 
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
          onClick={() => handleCategorySelect('')}
        >
          All Categories
        </button>
        
        {categories.map((category) => (
          <button
            key={category}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              selectedCategory === category 
                ? 'bg-[#509fe0]/10 text-[#509fe0] font-medium' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
            onClick={() => handleCategorySelect(category)}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AudienceSearch;