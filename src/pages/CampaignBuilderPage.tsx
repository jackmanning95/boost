import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Card, CardContent } from '../components/ui/Card';
import { useCampaign } from '../context/CampaignContext';
import { useAuth } from '../context/AuthContext';
import CampaignForm from '../components/campaigns/CampaignForm';
import CampaignSummary from '../components/campaigns/CampaignSummary';
import { Check, ChevronRight, Users } from 'lucide-react';

const CampaignBuilderPage: React.FC = () => {
  const { activeCampaign } = useCampaign();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<'details' | 'review'>('details');
  
  // Redirect if no active campaign or if user is admin
  if (!activeCampaign || isAdmin) {
    return <Navigate to="/campaigns" replace />;
  }
  
  const handleStepComplete = () => {
    setCurrentStep('review');
  };
  
  const handleSubmitComplete = () => {
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