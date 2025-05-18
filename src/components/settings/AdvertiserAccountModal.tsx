import React, { useState, useEffect } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { X } from 'lucide-react';
import { AdvertiserAccount } from './AdvertiserAccountManager';

interface AdvertiserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: Omit<AdvertiserAccount, 'id' | 'createdAt'>) => void;
  account?: AdvertiserAccount | null;
}

const PLATFORMS = ['Meta', 'The Trade Desk', 'DV360', 'Amazon DSP'];

const AdvertiserAccountModal: React.FC<AdvertiserAccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  account
}) => {
  const [platform, setPlatform] = useState('');
  const [advertiserName, setAdvertiserName] = useState('');
  const [advertiserId, setAdvertiserId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (account) {
      setPlatform(account.platform);
      setAdvertiserName(account.advertiserName);
      setAdvertiserId(account.advertiserId);
    } else {
      setPlatform('');
      setAdvertiserName('');
      setAdvertiserId('');
    }
    setErrors({});
  }, [account, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!platform) {
      newErrors.platform = 'Platform is required';
    }
    if (!advertiserName) {
      newErrors.advertiserName = 'Advertiser name is required';
    }
    if (!advertiserId) {
      newErrors.advertiserId = 'Advertiser ID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSave({
        platform,
        advertiserName,
        advertiserId
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">
            {account ? 'Edit Advertiser Account' : 'Add New Advertiser Account'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Platform
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className={`w-full rounded-md border ${
                errors.platform ? 'border-red-500' : 'border-gray-300'
              } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">Select a platform</option>
              {PLATFORMS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {errors.platform && (
              <p className="mt-1 text-sm text-red-600">{errors.platform}</p>
            )}
          </div>

          <Input
            label="Advertiser Name"
            value={advertiserName}
            onChange={(e) => setAdvertiserName(e.target.value)}
            error={errors.advertiserName}
            placeholder="e.g., Client A"
          />

          <Input
            label="Advertiser ID"
            value={advertiserId}
            onChange={(e) => setAdvertiserId(e.target.value)}
            error={errors.advertiserId}
            placeholder="Enter the platform-specific ID"
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {account ? 'Save Changes' : 'Add Account'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdvertiserAccountModal;