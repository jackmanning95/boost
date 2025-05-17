import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import AudienceSearch from '../components/audiences/AudienceSearch';
import AudienceCard from '../components/audiences/AudienceCard';
import AudienceRecommendations from '../components/audiences/AudienceRecommendations';
import { useTaxonomy } from '../context/TaxonomyContext';
import { useCampaign } from '../context/CampaignContext';
import { AudienceSegment } from '../types';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import ReactPaginate from 'react-paginate';
import { PlusCircle, ShoppingCart, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

const PAGE_SIZE = 12;

const AudiencesPage: React.FC = () => {
  const { audiences, loading, error } = useTaxonomy();
  const { activeCampaign, addAudienceToCampaign, removeAudienceFromCampaign } = useCampaign();
  const { isAdmin } = useAuth();
  const [searchResults, setSearchResults] = useState<AudienceSegment[]>(audiences);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    setSearchResults(audiences);
  }, [audiences]);

  const handleSearchResults = (results: AudienceSegment[]) => {
    setSearchResults(results);
    setCurrentPage(0);
  };

  const selectedAudiences = activeCampaign?.audiences || [];
  const pageCount = Math.ceil(searchResults.length / PAGE_SIZE);
  const offset = currentPage * PAGE_SIZE;
  const currentAudiences = searchResults.slice(offset, offset + PAGE_SIZE);

  const handlePageChange = ({ selected }: { selected: number }) => {
    setCurrentPage(selected);
    window.scrollTo(0, 0);
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audience Taxonomy</h1>
          <p className="text-gray-600 mt-1">Browse and select audience segments for your campaigns</p>
        </div>

        <div className="flex items-center gap-4">
          {!isAdmin && activeCampaign && (
            <div className="flex items-center">
              <div className="mr-4 text-right hidden md:block">
                <p className="text-sm text-gray-600">Current Campaign</p>
                <p className="font-medium">{activeCampaign.name}</p>
              </div>
              <Link to="/campaign/build">
                <Button 
                  variant="primary"
                  icon={<ShoppingCart size={18} />}
                >
                  Selected Audiences ({selectedAudiences.length})
                </Button>
              </Link>
            </div>
          )}

          {!isAdmin && !activeCampaign && (
            <Link to="/campaigns/new">
              <Button 
                variant="primary"
                icon={<PlusCircle size={18} />}
              >
                Create New Campaign
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="mb-8">
        <AudienceSearch onSearchResults={handleSearchResults} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#509fe0]"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-600 mb-4">{error.message}</p>
        </div>
      ) : currentAudiences.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Sparkles size={20} className="text-[#509fe0] mr-2" />
              <h2 className="text-xl font-semibold">
                {searchResults.length === audiences.length 
                  ? 'All Audiences' 
                  : `Search Results (${searchResults.length})`}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {currentAudiences.map(audience => (
              <AudienceCard
                key={audience.id}
                audience={audience}
                isSelected={selectedAudiences.some(a => a.id === audience.id)}
                onSelect={!isAdmin ? addAudienceToCampaign : undefined}
                onDeselect={!isAdmin ? removeAudienceFromCampaign : undefined}
              />
            ))}
          </div>

          {pageCount > 1 && (
            <div className="flex justify-center mt-8">
              <ReactPaginate
                previousLabel={<ChevronLeft size={16} />}
                nextLabel={<ChevronRight size={16} />}
                breakLabel="..."
                pageCount={pageCount}
                marginPagesDisplayed={2}
                pageRangeDisplayed={5}
                onPageChange={handlePageChange}
                containerClassName="flex items-center gap-2"
                pageClassName="flex"
                pageLinkClassName="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
                activeClassName="!border-blue-600 bg-blue-50 text-blue-600"
                previousClassName="flex"
                nextClassName="flex"
                previousLinkClassName="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
                nextLinkClassName="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
                breakClassName="flex items-center"
                breakLinkClassName="text-gray-400"
                disabledClassName="opacity-50 cursor-not-allowed"
              />
            </div>
          )}

          {!isAdmin && (
            <AudienceRecommendations
              selectedAudiences={selectedAudiences}
              onSelectAudience={addAudienceToCampaign}
            />
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">No audience segments found matching your search criteria.</p>
        </div>
      )}
    </Layout>
  );
};

export default AudiencesPage;