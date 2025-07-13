import React, { useState, useEffect, useCallback } from 'react';
import { useCampaign } from '../../context/CampaignContext';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Input from '../ui/Input';
import Button from '../ui/Button';
import AdvertiserAccountModal from '../settings/AdvertiserAccountModal';
import { Calendar, DollarSign, Monitor, Building, Plus, Edit, Hash } from 'lucide-react';
import { AdvertiserAccount } from '../../types';

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
  const { advertiserAccounts, fetchAdvertiserAccounts, createAdvertiserAccount } = useCompany();
  const { user } = useAuth();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [customSocial, setCustomSocial] = useState('');
  const [customProgrammatic, setCustomProgrammatic] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Memoize the advertiser accounts loading function to prevent unnecessary re-renders
  const loadAdvertiserAccounts = useCallback(async () => {
    console.log('[CampaignForm] loadAdvertiserAccounts called');
    
    if (!user?.id) {
      console.log('[CampaignForm] No user ID available');
      setLoadError('User information not available');
      setAccountsLoaded(true); // Mark as loaded to prevent infinite loop
      return;
    }

    if (accountsLoaded) {
      console.log('[CampaignForm] Accounts already loaded, skipping');
      return;
    }

    setIsLoadingAccounts(true);
    setLoadError(null);

    try {      
      // Fetch the advertiser accounts
      await fetchAdvertiserAccounts();
      setAccountsLoaded(true);
      console.log('[CampaignForm] Successfully fetched advertiser accounts');
    } catch (error) {
      console.error('[CampaignForm] Error loading advertiser accounts:', error);
      setLoadError('Failed to load platform accounts. Please try refreshing the page.');
      setAccountsLoaded(true); // Mark as loaded even on error to prevent infinite loop
    } finally {
      setIsLoadingAccounts(false);
    }
  }, [user?.id, accountsLoaded, fetchAdvertiserAccounts]);

  // Load advertiser accounts when component mounts or user changes
  useEffect(() => {
    loadAdvertiserAccounts();
  }, [loadAdvertiserAccounts]);

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

  const handleAdvertiserSelection = (accountId: string) => {
    console.log('[CampaignForm] handleAdvertiserSelection called with:', accountId);
    console.log('[CampaignForm] Available accounts for selection:', advertiserAccounts);
    
    if (!accountId) {
      // Clear selection
      updateCampaignDetails({ 
        selectedAdvertiserAccountId: '',
        advertiserName: ''
      });
      return;
    }

    const selectedAccount = (advertiserAccounts || []).find(account => account.id === accountId);
    console.log('[CampaignForm] Found selected account:', selectedAccount);
    
    if (selectedAccount) {
      updateCampaignDetails({ 
        selectedAdvertiserAccountId: accountId,
        advertiserName: selectedAccount.advertiserName
      });
    }
    
    if (formErrors.selectedAdvertiserAccountId) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated.selectedAdvertiserAccountId;
        return updated;
      });
    }
  };

  const handleCreateAccount = async (accountData: Omit<AdvertiserAccount, 'id' | 'createdAt'>) => {
    try {
      console.log('[CampaignForm] Creating new account with data:', accountData);
      const newAccount = await createAdvertiserAccount(accountData);
      console.log('[CampaignForm] Created new account:', newAccount);
      
      // Automatically select the newly created account
      updateCampaignDetails({ 
        selectedAdvertiserAccountId: newAccount.id,
        advertiserName: newAccount.advertiserName
      });
      setShowAccountModal(false);
      
      // Refresh the accounts list
      setAccountsLoaded(false);
      await loadAdvertiserAccounts();
    } catch (error) {
      console.error('[CampaignForm] Error creating account:', error);
      throw error;
    }
  };

  const handleRetryLoadAccounts = () => {
    setAccountsLoaded(false);
    setLoadError(null);
    loadAdvertiserAccounts();
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

  const selectedAccount = (advertiserAccounts || []).find(account => account.id === activeCampaign.selectedAdvertiserAccountId);

  // Debug logging for render
  console.log('[CampaignForm] Rendering with state:', {
    isLoadingAccounts,
    accountsLoaded,
    advertiserAccountsLength: (advertiserAccounts || []).length,
    selectedAccountId: activeCampaign.selectedAdvertiserAccountId,
    selectedAccount,
    userId: user?.id,
    loadError
  });

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
            
            {/* Error Display */}
            {loadError && (
              <div className="mb-4 p-3 bg-red-50 rounded-md border border-red-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-red-600">{loadError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRetryLoadAccounts}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {/* Debug Information Panel - Only show if debug info is available */}
            {false && debugInfo && (
              <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Debug Information:</h4>
                <div className="text-xs text-blue-700 space-y-1">
                  <div>Loading Accounts: {isLoadingAccounts ? 'Yes' : 'No'}</div>
                  <div>Accounts Loaded: {accountsLoaded ? 'Yes' : 'No'}</div>
                  <div>Available Accounts: {(advertiserAccounts || []).length}</div>
                  <div>User ID: {user?.id || 'None'}</div>
                  <div>Selected Account ID: {activeCampaign.selectedAdvertiserAccountId || 'None'}</div>
                  <div>Load Error: {loadError || 'None'}</div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-blue-800 font-medium">Session Debug Info</summary>
                    <pre className="mt-2 text-xs bg-blue-100 p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              <select
                value={activeCampaign.selectedAdvertiserAccountId || ''}
                onChange={(e) => handleAdvertiserSelection(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoadingAccounts}
              >
                <option value="">
                  {isLoadingAccounts ? 'Loading accounts...' : 
                   loadError ? 'Error loading accounts' :
                   !advertiserAccounts || advertiserAccounts.length === 0 ? 'No accounts available - add one' : 
                   'Select an account'}
                </option>
                {(advertiserAccounts || []).map(account => (
                  <option key={account.id} value={account.id}>
                    {account.platform} - {account.advertiserName} ({account.advertiserId})
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAccountModal(true)}
                icon={<Plus size={16} />}
              >
                Add New Account
              </Button>
            </div>
            {formErrors.selectedAdvertiserAccountId && (
              <p className="mt-1 text-sm text-red-600">{formErrors.selectedAdvertiserAccountId}</p>
            )}
            
            {selectedAccount && (
              <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Selected: {selectedAccount.platform}
                    </p>
                    <p className="text-sm text-blue-700">
                      {selectedAccount.advertiserName} • ID: {selectedAccount.advertiserId}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAdvertiserSelection('')}
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
      <AdvertiserAccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onSave={handleCreateAccount}
      />
    </form>
  );
};

export default CampaignForm;