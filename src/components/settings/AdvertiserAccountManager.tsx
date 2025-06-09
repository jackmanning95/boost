import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { AdvertiserAccount } from './AdvertiserAccountManager';

interface AdvertiserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: Omit<AdvertiserAccount, 'id' | 'createdAt'>) => void;
  account: AdvertiserAccount | null;
}

const PLATFORM_OPTIONS = [
  'Meta',
  'Instagram',
  'TikTok',
  'X/Twitter',
  'LinkedIn',
  'Pinterest',
  'Snapchat',
  'Reddit',
  'DV360',
  'The Trade Desk',
  'StackAdapt',
  'Yahoo! DSP',
  'Amazon DSP',
  'MediaMath',
  'Other (please specify)'
];

const AdvertiserAccountModal: React.FC<AdvertiserAccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  account
}) => {
  const [platform, setPlatform] = useState(account?.platform || '');
  const [advertiserName, setAdvertiserName] = useState(account?.advertiserName || '');
  const [advertiserId, setAdvertiserId] = useState(account?.advertiserId || '');
  const [customPlatform, setCustomPlatform] = useState('');

  useEffect(() => {
    if (account) {
      setPlatform(account.platform);
      setAdvertiserName(account.advertiserName);
      setAdvertiserId(account.advertiserId);
      setCustomPlatform(
        PLATFORM_OPTIONS.includes(account.platform) ? '' : account.platform
      );
    } else {
      setPlatform('');
      setAdvertiserName('');
      setAdvertiserId('');
      setCustomPlatform('');
    }
  }, [account, isOpen]);

  const handleSubmit = () => {
    if (
      (platform === 'Other (please specify)' && customPlatform.trim() === '') ||
      advertiserName.trim() === '' ||
      advertiserId.trim() === ''
    ) {
      alert('Please complete all required fields.');
      return;
    }

    const finalPlatform =
      platform === 'Other (please specify)' ? customPlatform.trim() : platform;

    onSave({
      platform: finalPlatform,
      advertiserName: advertiserName.trim(),
      advertiserId: advertiserId.trim()
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={account ? 'Edit Account' : 'Add New Account'}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Platform</label>
          <select
            className="w-full border p-2 rounded-md"
            value={PLATFORM_OPTIONS.includes(platform) ? platform : 'Other (please specify)'}
            onChange={(e) => {
              const selected = e.target.value;
              setPlatform(selected);
              if (selected !== 'Other (please specify)') setCustomPlatform('');
            }}
          >
            <option value="" disabled>Select a platform</option>
            {PLATFORM_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          {platform === 'Other (please specify)' && (
            <input
              type="text"
              placeholder="Enter custom platform name"
              className="mt-2 w-full border p-2 rounded-md"
              value={customPlatform}
              onChange={(e) => setCustomPlatform(e.target.value)}
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Advertiser Name</label>
          <input
            type="text"
            className="w-full border p-2 rounded-md"
            value={advertiserName}
            onChange={(e) => setAdvertiserName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Advertiser ID</label>
          <input
            type="text"
            className="w-full border p-2 rounded-md"
            value={advertiserId}
            onChange={(e) => setAdvertiserId(e.target.value)}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {account ? 'Save Changes' : 'Add Account'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AdvertiserAccountModal;
