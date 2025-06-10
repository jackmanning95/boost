import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import AdvertiserAccountModal from './AdvertiserAccountModal';

export type AdvertiserAccount = {
  id: string;
  platform: string;
  advertiserName: string;
  advertiserId: string;
  createdAt: string;
};

type Props = {
  accounts: AdvertiserAccount[];
  onAdd: (account: Omit<AdvertiserAccount, 'id' | 'createdAt'>) => void;
  onUpdate: (account: AdvertiserAccount) => void;
  onDelete: (id: string) => void;
};

const AdvertiserAccountManager: React.FC<Props> = ({
  accounts,
  onAdd,
  onUpdate,
  onDelete
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AdvertiserAccount | null>(null);

  const handleEdit = (account: AdvertiserAccount) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const handleSave = (data: Omit<AdvertiserAccount, 'id' | 'createdAt'>) => {
    if (editingAccount) {
      onUpdate({ ...editingAccount, ...data });
    } else {
      onAdd(data);
    }
    setIsModalOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-blue-600">Connected Platform IDs</CardTitle>
          <Button variant="primary" onClick={handleAdd}>Add Account</Button>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-gray-600">No accounts added yet.</p>
          ) : (
            <ul className="space-y-4">
              {accounts.map(account => (
                <li
                  key={account.id}
                  className="border border-gray-200 rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">{account.advertiserName}</div>
                    <div className="text-sm text-gray-500">
                      {account.platform} – {account.advertiserId}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="secondary" onClick={() => handleEdit(account)}>Edit</Button>
                    <Button variant="destructive" onClick={() => onDelete(account.id)}>Delete</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
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
