import React, { useState, useEffect } from 'react';
import { useCampaign } from '../../context/CampaignContext';
import { useCompany } from '../../context/CompanyContext';
import Input from '../ui/Input';
import Button from '../ui/Button';
import CompanyAccountModal from './CompanyAccountModal';
import { Calendar, DollarSign, Monitor, Building, Plus, Edit, Hash } from 'lucide-react';
import { CompanyAccountId } from '../../types';

interface CampaignFormProps {
  onComplete: () => void;
}

const PLATFORM_OPTIONS = {
  social: ['Meta', 'Instagram', 'TikTok', 'X/Twitter', 'LinkedIn', 'Pinterest', 'Snapchat', 'Other (please specify)'],
  programmatic: [
    'DV360', 'The Trade Desk', 'Xandr', 'MediaMath', 'Amazon DSP', 'Yahoo! DSP', 'StackAdapt', 'Other (please specify)'
  ]
};

const CampaignForm: React.FC<CampaignFormProps> = ({ onComplete }) => {
  const { activeCampaign, updateCampaignDetails } = useCampaign();
  const { companyAccountIds, fetchCompanyAccountIds, createCompanyAccountId } = useCompany();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [customSocial, setCustomSocial] = useState('');
  const [customProgrammatic, setCustomProgrammatic] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  useEffect(() => {
    // Fetch company account IDs when component mounts
    const loadAccountIds = async () => {
      setIsLoadingAccounts(true);
      try {
        await fetchCompanyAccountIds();
      } catch (error) {
        console.error('Error loading company account IDs:', error);
      } finally {
        setIsLoadingAccounts(false);
      }
    };

    loadAccountIds();
  }, [fetchCompanyAccountIds]);

  if (!activeCampaign) return null;

  const handleInputChange = (field: string, value: any) => {
    updateCampaignDetails({ [field]: value });
    if (formErrors[field]) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handlePlatformChange = (type: 'social' | 'programmatic', platform: string, checked: boolean) => {
    const currentPlatforms = { ...activeCampaign.platforms };

    if (checked) {
      currentPlatforms[type] = [...new Set([...currentPlatforms[type], platform])];
    } else {
      currentPlatforms[type] = currentPlatforms[type].filter(p => p !== platform);
    }

    updateCampaignDetails({ platforms: currentPlatforms });

    if (formErrors.platforms) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated.platforms;
        return updated;
      });
    }
  };

  const handleAccountSelection = (accountId: string) => {
    const selectedAccount = companyAccountIds.find(account => account.id === accountId);
    updateCampaignDetails({ 
      selectedCompanyAccountId: accountId,
      advertiserName: selectedAccount?.accountName // Set advertiser name from account
    });
    if (formErrors.selectedCompanyAccountId) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated.selectedCompanyAccountId;
        return updated;
      });
    }
  };

  const handleCreateAccount = async (accountData: Omit<CompanyAccountId, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>) => {
    try {
      const newAccount = await createCompanyAccountId(accountData);
      // Automatically select the newly created account
      updateCampaignDetails({ 
        selectedCompanyAccountId: newAccount.id,
        advertiserName: newAccount.accountName // Set advertiser name from new account
      });
      setShowAccountModal(false);
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!activeCampaign.name?.trim()) {
      errors.name = 'Campaign name is required';
    }

    if (!activeCampaign.startDate) errors.startDate = 'Start date is required';
    if (!activeCampaign.endDate) errors.endDate = 'End date is required';

    if (
      activeCampaign.startDate &&
      activeCampaign.endDate &&
      new Date(activeCampaign.startDate) > new Date(activeCampaign.endDate)
    ) {
      errors.endDate = 'End date must be after start date';
    }

    if (!activeCampaign.budget || activeCampaign.budget < 0) {
      errors.budget = 'Budget must be a positive number';
    }

    const totalPlatforms = [...activeCampaign.platforms.social, ...activeCampaign.platforms.programmatic].length;
    if (totalPlatforms === 0) {
      errors.platforms = 'Select at least one platform';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedPlatforms = { ...activeCampaign.platforms };
    if (customSocial.trim()) updatedPlatforms.social.push(customSocial.trim());
    if (customProgrammatic.trim()) updatedPlatforms.programmatic.push(customProgrammatic.trim());

    updateCampaignDetails({ platforms: updatedPlatforms });

    if (validateForm()) {
      onComplete();
    }
  };

  const selectedAccount = companyAccountIds.find(account => account.id === activeCampaign.selectedCompanyAccountId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Campaign Name */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Edit size={20} className="mr-2 text-blue-600" />
          Campaign Information
        </h2>
        <Input
          label="Campaign Name"
          value={activeCampaign.name || ''}
          onChange={(e) => handleInputChange('name', e.target.value)}
          error={formErrors.name}
          placeholder="Enter a descriptive name for your campaign"
          required
        />
      </div>

      {/* Platform Account Selection */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Building size={20} className="mr-2 text-blue-600" />
          Platform Account & Advertiser
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Platform Account
            </label>
            <div className="flex gap-3">
              <select
                value={activeCampaign.selectedCompanyAccountId || ''}
                onChange={(e) => handleAccountSelection(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoadingAccounts}
              >
                <option value="">
                  {isLoadingAccounts ? 'Loading accounts...' : 'Select an account'}
                </option>
                {companyAccountIds.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.platform} - {account.accountName} ({account.accountId})
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAccountModal(true)}
                icon={<Plus size={16} />}
              >
                Add New
              </Button>
            </div>
            {formErrors.selectedCompanyAccountId && (
              <p className="mt-1 text-sm text-red-600">{formErrors.selectedCompanyAccountId}</p>
            )}
            
            {selectedAccount && (
              <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Selected: {selectedAccount.platform}
                    </p>
                    <p className="text-sm text-blue-700">
                      {selectedAccount.accountName} • ID: {selectedAccount.accountId}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAccountSelection('')}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>

          {!selectedAccount && (
            <div>
              <Input
                label="Advertiser Name"
                value={activeCampaign.advertiserName || ''}
                onChange={(e) => handleInputChange('advertiserName', e.target.value)}
                placeholder="Enter advertiser name"
                helpText="This will be displayed in campaign cards and summaries"
              />
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Calendar size={20} className="mr-2 text-blue-600" />
          Campaign Timeline
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={activeCampaign.startDate}
            onChange={(e) => handleInputChange('startDate', e.target.value)}
            error={formErrors.startDate}
            required
          />
          <Input
            label="End Date"
            type="date"
            value={activeCampaign.endDate}
            onChange={(e) => handleInputChange('endDate', e.target.value)}
            error={formErrors.endDate}
            required
          />
        </div>
      </div>

      {/* Budget */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <DollarSign size={20} className="mr-2 text-blue-600" />
          Budget
        </h2>
        <Input
          label="Campaign Budget (USD)"
          type="number"
          min="0"
          step="1"
          value={activeCampaign.budget || ''}
          onChange={(e) => handleInputChange('budget', Math.max(0, Number(e.target.value)))}
          error={formErrors.budget}
          required
        />
      </div>

      {/* Platforms */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Monitor size={20} className="mr-2 text-blue-600" />
          Platforms
        </h2>

        {formErrors.platforms && <p className="text-sm text-red-600 mb-2">{formErrors.platforms}</p>}

        <div className="space-y-4">
          {/* Social */}
          <div>
            <h3 className="text-md font-medium mb-2">Social Platforms</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {PLATFORM_OPTIONS.social.map(platform => (
                <label key={platform} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={activeCampaign.platforms.social.includes(platform)}
                    onChange={(e) => handlePlatformChange('social', platform, e.target.checked)}
                  />
                  <span>{platform}</span>
                </label>
              ))}
            </div>
            {activeCampaign.platforms.social.includes('Other (please specify)') && (
              <Input
                label="Specify Other Social Platform"
                value={customSocial}
                onChange={(e) => setCustomSocial(e.target.value)}
              />
            )}
          </div>

          {/* Programmatic */}
          <div>
            <h3 className="text-md font-medium mb-2">Programmatic Platforms</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {PLATFORM_OPTIONS.programmatic.map(platform => (
                <label key={platform} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={activeCampaign.platforms.programmatic.includes(platform)}
                    onChange={(e) => handlePlatformChange('programmatic', platform, e.target.checked)}
                  />
                  <span>{platform}</span>
                </label>
              ))}
            </div>
            {activeCampaign.platforms.programmatic.includes('Other (please specify)') && (
              <Input
                label="Specify Other Programmatic Platform"
                value={customProgrammatic}
                onChange={(e) => setCustomProgrammatic(e.target.value)}
              />
            )}
          </div>
        </div>
      </div>

      <div className="pt-4">
        <Button type="submit" variant="primary" size="lg">
          Continue
        </Button>
      </div>

      {/* Company Account Modal */}
      <CompanyAccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onSave={handleCreateAccount}
      />
    </form>
  );
};

export default CampaignForm;