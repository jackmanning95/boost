import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Card, CardContent } from '../components/ui/Card';
import { useCampaign } from '../context/CampaignContext';
import { useAuth } from '../context/AuthContext';
import CampaignForm from '../components/campaigns/CampaignForm';
import CampaignSummary from '../components/campaigns/CampaignSummary';
import { Check, ChevronRight, Users, Clock } from 'lucide-react';

const CampaignBuilderPage: React.FC = () => {
  const { activeCampaign, isCampaignOperationLoading } = useCampaign();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<'details' | 'review'>('details');
  
  // ✅ DEBUGGING: Add comprehensive logging
  console.log('[CampaignBuilderPage] Render - activeCampaign:', activeCampaign);
  console.log('[CampaignBuilderPage] Render - isCampaignOperationLoading:', isCampaignOperationLoading);
  console.log('[CampaignBuilderPage] Render - isAdmin:', isAdmin);
  
  // ✅ FIXED: Show loading state while campaign operations are in progress
  if (isCampaignOperationLoading) {
    console.log('[CampaignBuilderPage] Showing loading state');
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#509fe0] mb-6"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Setting up your campaign...</h2>
            <p className="text-gray-600 text-center max-w-md">
              Please wait while we prepare your campaign builder. This should only take a moment.
            </p>
            <div className="mt-4 text-sm text-gray-500">
              Loading state: {isCampaignOperationLoading ? 'true' : 'false'}
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  
  // ✅ FIXED: Only redirect if no active campaign AND not loading
  if (!activeCampaign || isAdmin) {
    console.log('[CampaignBuilderPage] Redirecting to campaigns - activeCampaign:', !!activeCampaign, 'isAdmin:', isAdmin);
    return <Navigate to="/campaigns" replace />;
  }
  
  console.log('[CampaignBuilderPage] Rendering campaign builder for:', activeCampaign.name);
  
  const handleStepComplete = () => {
    console.log('[CampaignBuilderPage] Step completed, moving to review');
    setCurrentStep('review');
  };
  
  const handleSubmitComplete = () => {
    console.log('[CampaignBuilderPage] Submit completed, navigating to campaigns');
    navigate('/campaigns');
  };
  
  // In a real app, this would check if required fields are filled
  const stepsCompleted = {
    audiences: activeCampaign.audiences.length > 0,
    details: currentStep === 'review',
    review: false
  };
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Campaign: {activeCampaign.name}
        </h1>
        
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center">
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full 
              ${stepsCompleted.audiences ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}
            `}>
              {stepsCompleted.audiences ? <Check size={20} /> : <Users size={20} />}
            </div>
            <div className={`h-1 flex-1 mx-2 ${stepsCompleted.details ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full
              ${stepsCompleted.details ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}
            `}>
              <span className="text-sm font-medium">2</span>
            </div>
            <div className={`h-1 flex-1 mx-2 ${stepsCompleted.review ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full
              ${stepsCompleted.review ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}
            `}>
              <span className="text-sm font-medium">3</span>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-500 px-1">
            <div>Select Audiences</div>
            <div>Campaign Details</div>
            <div>Review & Submit</div>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            {currentStep === 'details' ? (
              <CampaignForm onComplete={handleStepComplete} />
            ) : (
              <CampaignSummary onSubmit={handleSubmitComplete} />
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CampaignBuilderPage;