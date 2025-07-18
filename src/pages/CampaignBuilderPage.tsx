import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Card, CardContent } from '../components/ui/Card';
import { useCampaign } from '../context/CampaignContext';
import { useAuth } from '../context/AuthContext';
import CampaignForm from '../components/campaigns/CampaignForm';
import CampaignSummary from '../components/campaigns/CampaignSummary';
import { Check, ChevronRight, Users, Clock, Shield } from 'lucide-react';

const CampaignBuilderPage: React.FC = () => {
  const { activeCampaign, hasActiveCampaignLoaded, isCampaignOperationLoading } = useCampaign();
  const { isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<'details' | 'review'>('details');
  
  // ✅ DEBUGGING: Add comprehensive logging
  console.log('[CampaignBuilderPage] Render - activeCampaign:', activeCampaign);
  console.log('[CampaignBuilderPage] Render - hasActiveCampaignLoaded:', hasActiveCampaignLoaded);
  console.log('[CampaignBuilderPage] Render - isCampaignOperationLoading:', isCampaignOperationLoading);
  console.log('[CampaignBuilderPage] Render - isAdmin:', isAdmin);
  console.log('[CampaignBuilderPage] Render - isSuperAdmin:', isSuperAdmin);
  
  // ✅ FIXED: Only redirect super admins (Boost internal team), allow company admins to use campaign builder
  if (isSuperAdmin) {
    console.log('[CampaignBuilderPage] Redirecting super admin to campaigns - they should use admin dashboard');
    return <Navigate to="/campaigns" replace />;
  }
  
  // ✅ FIXED: Show loading state until campaign hydration is complete OR while operations are in progress
  if (!hasActiveCampaignLoaded || isCampaignOperationLoading) {
    console.log('[CampaignBuilderPage] Showing loading state - hydration or operation in progress');
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#509fe0] mb-6"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {!hasActiveCampaignLoaded ? 'Loading your campaign...' : 'Setting up your campaign...'}
            </h2>
            <p className="text-gray-600 text-center max-w-md">
              {!hasActiveCampaignLoaded 
                ? 'Please wait while we load your campaign data.'
                : 'Please wait while we prepare your campaign builder. This should only take a moment.'
              }
            </p>
            <div className="mt-4 text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
              <div>Debug Info:</div>
              <div>• Hydration Complete: {hasActiveCampaignLoaded ? 'true' : 'false'}</div>
              <div>• Operation Loading: {isCampaignOperationLoading ? 'true' : 'false'}</div>
              <div>• Active Campaign: {activeCampaign ? activeCampaign.name : 'null'}</div>
              <div>• Is Admin: {isAdmin ? 'true' : 'false'}</div>
              <div>• Is Super Admin: {isSuperAdmin ? 'true' : 'false'}</div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  
  // ✅ FIXED: Only redirect if no active campaign AND hydration is complete
  if (!activeCampaign && hasActiveCampaignLoaded) {
    console.log('[CampaignBuilderPage] Redirecting to campaigns - no active campaign after hydration complete');
    return <Navigate to="/campaigns" replace />;
  }
  
  // If we somehow get here without a campaign, show an error
  if (!activeCampaign) {
    console.log('[CampaignBuilderPage] No campaign found, redirecting to campaigns');
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
        {/* ✅ ADDED: Admin indicator for company admins */}
        {isAdmin && !isSuperAdmin && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <Shield size={16} className="text-blue-600 mr-2" />
              <span className="text-sm text-blue-800 font-medium">
                Company Admin Access - You can create and manage campaigns for your company
              </span>
            </div>
          </div>
        )}
        
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