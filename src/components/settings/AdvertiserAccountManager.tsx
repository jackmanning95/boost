import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { Plus, Briefcase, Search, Edit2, Trash2 } from 'lucide-react';
import AdvertiserAccountModal from './AdvertiserAccountModal';

export interface AdvertiserAccount {
  id: string;
  platform: string;
  advertiserName: string;
  advertiserId: string;
  createdAt: string;
}

interface AdvertiserAccountManagerProps {
  accounts: AdvertiserAccount[];
  onAdd: (account: Omit<AdvertiserAccount, 'id' | 'createdAt'>) => void;
  onUpdate: (account: AdvertiserAccount) => void;
  onDelete: (accountId: string) => void;
}

const AdvertiserAccountManager: React.FC<AdvertiserAccountManagerProps> = ({
  accounts,
  onAdd,
  onUpdate,
  onDelete
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AdvertiserAccount | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAdd = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const handleEdit = (account: AdvertiserAccount) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleSave = (account: Omit<AdvertiserAccount, 'id' | 'createdAt'>) => {
    if (editingAccount) {
      onUpdate({ ...account, id: editingAccount.id, createdAt: editingAccount.createdAt });
    } else {
      onAdd(account);
    }
    setIsModalOpen(false);
  };

  const filteredAccounts = accounts.filter(account => {
    const searchLower = searchQuery.toLowerCase();
    return (
      account.platform.toLowerCase().includes(searchLower) ||
      account.advertiserName.toLowerCase().includes(searchLower) ||
      account.advertiserId.toLowerCase().includes(searchLower)
    );
  });

  const groupedAccounts = filteredAccounts.reduce((acc, account) => {
    if (!acc[account.platform]) {
      acc[account.platform] = [];
    }
    acc[account.platform].push(account);
    return acc;
  }, {} as Record<string, AdvertiserAccount[]>);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Briefcase size={20} className="mr-2 text-blue-600" />
              Manage Advertiser Accounts
            </CardTitle>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAdd}
              icon={<Plus size={16} />}
            >
              Add New Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search accounts..."
                className="w-full pl-10 pr-4 py-2 border rounded-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {Object.entries(groupedAccounts).map(([platform, platformAccounts]) => (
              <div key={platform} className="space-y-2">
                <h3 className="font-medium text-gray-900">{platform}</h3>
                <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                  {platformAccounts.map(account => (
                    <div key={account.id} className="p-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{account.advertiserName}</h4>
                        <p className="text-sm text-gray-600">ID: {account.advertiserId}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(account)}
                          icon={<Edit2 size={16} />}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDelete(account.id)}
                          icon={<Trash2 size={16} />}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {filteredAccounts.length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">
                  {searchQuery
                    ? 'No accounts match your search'
                    : 'No advertiser accounts added yet'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AdvertiserAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        account={editingAccount}
      />
    </>
  );
};

export default AdvertiserAccountManager;