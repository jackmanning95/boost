import React, { useState } from 'react';
import { MessageCircle, Reply, Send, User } from 'lucide-react';
import { CampaignComment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface CampaignCommentsProps {
  comments: CampaignComment[];
  onAddComment: (content: string, parentCommentId?: string) => Promise<void>;
}

const CampaignComments: React.FC<CampaignCommentsProps> = ({
  comments,
  onAddComment
}) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!replyContent.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddComment(replyContent.trim(), parentCommentId);
      setReplyContent('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderComment = (comment: CampaignComment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-8 mt-3' : 'mb-6'}`}>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User size={16} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="font-medium text-gray-900">
                {comment.user?.name || 'Unknown User'}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                comment.user?.role === 'admin' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {comment.user?.role === 'admin' ? 'Admin' : 'Client'}
              </span>
              <span className="text-sm text-gray-500">
                {formatDate(comment.createdAt)}
              </span>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
            
            {!isReply && (
              <div className="mt-3">
                <button
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                >
                  <Reply size={14} />
                  <span>Reply</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reply Form */}
      {replyingTo === comment.id && (
        <div className="ml-8 mt-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <Input
              as="textarea"
              placeholder="Write a reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={3}
              className="mb-3"
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSubmitReply(comment.id)}
                disabled={!replyContent.trim() || isSubmitting}
                icon={<Send size={14} />}
              >
                Reply
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Render Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3">
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-6">
        <MessageCircle size={20} className="text-blue-600" />
        <h3 className="text-lg font-medium text-gray-900">Comments</h3>
        <span className="text-sm text-gray-500">({comments.length})</span>
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <Input
          as="textarea"
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className="mb-3"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={!newComment.trim() || isSubmitting}
            icon={<Send size={16} />}
            isLoading={isSubmitting}
          >
            Post Comment
          </Button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length > 0 ? (
          comments.map(comment => renderComment(comment))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No comments yet. Start the conversation!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignComments;