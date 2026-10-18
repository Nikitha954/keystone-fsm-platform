// components/common/FeedbackModal.tsx
import React, { useState } from 'react';
import { Star, X, Check, MessageSquare } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { rating: number; feedback: string }) => void;
  workOrderNumber: string;
}

export default function FeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  workOrderNumber,
}: FeedbackModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [tags, setTags] = useState<string[]>(['On-Time Arrival', 'Knowledgeable Technician']);

  if (!isOpen) return null;

  const quickTags = [
    'On-Time Arrival',
    'Knowledgeable Technician',
    'Clean Work Area',
    'Quick Resolution',
    'Polite & Professional',
  ];

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tagText = tags.length > 0 ? ` [${tags.join(', ')}] ` : '';
    onSubmit({ rating, feedback: `${feedback}${tagText}`.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="p-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 fill-amber-200 text-amber-200" />
            <h3 className="font-semibold text-lg">Customer Satisfaction Survey</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Service Call</p>
            <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5">{workOrderNumber}</p>
            <p className="text-sm text-gray-500 mt-2">How satisfied were you with the quality of service provided?</p>
          </div>

          {/* Interactive Star Rating */}
          <div className="flex items-center justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-125 focus:outline-none"
              >
                <Star
                  className={`w-9 h-9 transition-colors ${
                    (hoverRating || rating) >= star
                      ? 'fill-amber-400 text-amber-400 drop-shadow'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-center text-xs font-semibold text-amber-600 dark:text-amber-400">
            {rating === 5 && '⭐⭐⭐⭐⭐ Excellent'}
            {rating === 4 && '⭐⭐⭐⭐ Very Good'}
            {rating === 3 && '⭐⭐⭐ Satisfactory'}
            {rating === 2 && '⭐⭐ Needs Improvement'}
            {rating === 1 && '⭐ Poor'}
          </p>

          {/* Service Quality Tags */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Highlights (click to add):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    tags.includes(t)
                      ? 'bg-amber-500 text-white border-amber-600 font-medium'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-amber-400'
                  }`}
                >
                  {tags.includes(t) ? '✓ ' : '+ '}
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Comments Textarea */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
              Customer Feedback Comments
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us what the technician did well or how we can improve..."
              rows={3}
              className="w-full text-sm p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">
              Cancel
            </button>
            <button type="submit" className="btn-primary bg-amber-600 hover:bg-amber-700 text-sm flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              Submit Review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
