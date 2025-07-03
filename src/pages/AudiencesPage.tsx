import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { PlusCircle, ShoppingCart, ChevronLeft, ChevronRight, Sparkles, Users, RefreshCw } from 'lucide-react';

const PAGE_SIZE = 12;

const AudiencesPage: React.FC = () => {
  const { audiences, loading, error, totalCount } = useTaxonomy();
  const { 
    activeCampaign, 
    addAudienceToCampaign, 
    removeAudienceFromCampaign, 
    initializeCampaign, 
    isCampaignOperationLoading, 
    waitForCampaignReady,
    resetCampaign // ✅ You'll need this in your CampaignContext!
  } = useCampaign();
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchResults, setSearchResults] = useState<AudienceSegment[]>(audiences);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setSearchResults(audiences);
  }, [audiences]);

  const handleSearchResults = (results: AudienceSegment[]) => {
    setSearchResults(results);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleCreateNewCampaign = async () => {
    resetCampaign(); // Clear existing campaign
    const defaultName = `Campaign ${new Date().toLocaleDateString()}`;
    await initializeCampaign(defaultName);
  };

  const handleSelectAudience = async (audience: AudienceSegment) => {
    try {
      if (!activeCampaign) {
        const defaultName = `Campaign ${new Date().toLocaleDateString()}`;
        await initializeCampaign(defaultName);
      }
      await waitForCampaignReady();
      await addAudienceToCampaign(audience);
    } catch (error) {
      console.error('[AudiencesPage] handleSelectAudience - Error:', error);
      alert('Failed to add audience. Please try again.');
    }
  };

  const handleNavigateToCampaignForm = async () => {
    try {
      if (!activeCampaign) {
        const defaultName = `Campaign ${new Date().toLocaleDateString()}`;
        await initializeCampaign(defaultName);
      }
      await waitForCampaignReady();
      navigate('/campaign/build');
    } catch (error) {
      console.error('[AudiencesPage] handleNavigateToCampaignForm - Error:', error);
      alert('Failed to continue to campaign form. Please try again.');
    }
  };

  const selectedAudiences = activeCampaign?.audiences || [];
  const pageCount = Math.ceil(totalCount / PAGE_SIZE);
  const canEditAudiences = !isSuperAdmin;

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audience Taxonomy</h1>
          <p className="text-gray-600 mt-1">Browse and select audience segments for your campaigns</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canEditAudiences && (
            <>
              <Button 
                variant="outline"
                icon={<RefreshCw size={18} />}
                onClick={handleCreateNewCampaign}
                disabled={isCampaignOperationLoading}
                isLoading={isCampaignOperationLoading}
              >
                New Campaign
              </Button>

              {selectedAudiences.length > 0 && (
                <Button 
                  variant="primary"
                  icon={<ShoppingCart size={18} />}
                  onClick={handleNavigateToCampaignForm}
                  disabled={isCampaignOperationLoading}
                  isLoading={isCampaignOperationLoading}
                >
                  Selected Audiences ({selectedAudiences.length})
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mb-8">
        <AudienceSearch 
          onSearchResults={handleSearchResults}
          onPageChange={handlePageChange}
          currentPage={currentPage}
          totalPages={pageCount}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#509fe0]"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-600 mb-4">{error.message}</p>
        </div>
      ) : searchResults.length > 0 ? (
        <div>
          <div className="flex items-center mb-4">
            <Sparkles size={20} className="text-[#509fe0] mr-2" />
            <h2 className="text-xl font-semibold">
              {searchResults.length === audiences.length 
                ? 'All Audiences' 
                : `Search Results (${totalCount})`}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {searchResults.map(audience => (
              <AudienceCard
                key={audience.id}
                audience={audience}
                isSelected={selectedAudiences.some(a => a.id === audience.id)}
                onSelect={canEditAudiences ? handleSelectAudience : undefined}
                onDeselect={canEditAudiences ? removeAudienceFromCampaign : undefined}
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
                onPageChange={({ selected }) => handlePageChange(selected + 1)}
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
                forcePage={currentPage - 1}
              />
            </div>
          )}

          {canEditAudiences && (
            <AudienceRecommendations
              selectedAudiences={selectedAudiences}
              onSelectAudience={handleSelectAudience}
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
