import React from 'react';
import { Check, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Campaign } from '../../types';

interface CampaignStatusTrackerProps {
  campaign: Campaign;
}

const STATUS_STEPS = [
  { key: 'draft', label: 'Draft', icon: Clock },
  { key: 'submitted', label: 'Submitted', icon: Check },
  { key: 'pending_review', label: 'Pending Review', icon: Clock },
  { key: 'in_progress', label: 'In Progress', icon: Clock },
  { key: 'waiting_on_client', label: 'Waiting on Client', icon: AlertCircle },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
  { key: 'completed', label: 'Completed', icon: CheckCircle }
];

const FAILED_STATUS = { key: 'failed', label: 'Failed', icon: XCircle };

const CampaignStatusTracker: React.FC<CampaignStatusTrackerProps> = ({ campaign }) => {
  const currentStatusIndex = STATUS_STEPS.findIndex(step => step.key === campaign.status);
  const isFailed = campaign.status === 'failed';

  const getStepStatus = (index: number) => {
    if (isFailed) return 'pending';
    if (index < currentStatusIndex) return 'completed';
    if (index === currentStatusIndex) return 'current';
    return 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white';
      case 'current':
        return 'bg-blue-500 text-white';
      case 'pending':
        return 'bg-gray-200 text-gray-500';
      default:
        return 'bg-gray-200 text-gray-500';
    }
  };

  const getConnectorColor = (index: number) => {
    if (isFailed) return 'bg-gray-200';
    return index < currentStatusIndex ? 'bg-green-500' : 'bg-gray-200';
  };

  if (isFailed) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
              <XCircle size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-red-900">Campaign Failed</h3>
              <p className="text-sm text-red-700">This campaign requires attention</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Campaign Progress</h3>
      
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200">
          <div 
            className="h-full bg-green-500 transition-all duration-500"
            style={{ 
              width: currentStatusIndex >= 0 ? `${(currentStatusIndex / (STATUS_STEPS.length - 1)) * 100}%` : '0%' 
            }}
          />
        </div>

        {/* Status Steps */}
        <div className="relative flex justify-between">
          {STATUS_STEPS.map((step, index) => {
            const status = getStepStatus(index);
            const Icon = step.icon;
            
            return (
              <div key={step.key} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(status)} transition-all duration-300`}>
                  <Icon size={20} />
                </div>
                <div className="mt-2 text-center">
                  <p className={`text-sm font-medium ${status === 'current' ? 'text-blue-600' : status === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                    {step.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Status Description */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <span className="font-medium">Current Status:</span> {STATUS_STEPS.find(s => s.key === campaign.status)?.label || campaign.status}
        </p>
      </div>
    </div>
  );
};

export default CampaignStatusTracker;