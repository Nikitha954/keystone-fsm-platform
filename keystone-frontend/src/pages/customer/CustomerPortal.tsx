import { useEffect, useState } from 'react';
import { workOrderService } from '@/services/workOrderService';
import { WorkOrder } from '@/types';
import { StatusBadge, PriorityBadge } from '@/components/common/Badges';
import FeedbackModal from '@/components/common/FeedbackModal';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { LogOut, ClipboardList, Shield, Star, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CustomerPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderForFeedback, setSelectedOrderForFeedback] = useState<WorkOrder | null>(null);

  const fetchOrders = () => {
    workOrderService.getMy({ size: 50 })
      .then(data => setOrders(data.content))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleFeedbackSubmit = async (data: { rating: number; feedback: string }) => {
    if (!selectedOrderForFeedback) return;
    try {
      await workOrderService.submitFeedback(selectedOrderForFeedback.id, data);
      toast.success('Thank you for rating our service!', { icon: '⭐' });
      fetchOrders();
    } catch {
      toast.error('Failed to submit feedback');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900">KEYSTONE</p>
            <p className="text-xs text-gray-500">Customer Self-Service Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Welcome, <strong>{user?.firstName}</strong></span>
          <button onClick={handleLogout} className="btn-secondary py-1.5 px-3">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Service Requests & Rating Feedback</h1>
          <p className="text-sm text-gray-500">Track field service work orders, technician ETAs, and submit verified ratings</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="card p-16 text-center text-gray-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No service requests found</p>
            <p className="text-sm">Contact customer support to raise a new maintenance order</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(wo => (
              <div key={wo.id} className="card p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-mono font-semibold text-primary-600">{wo.woNumber}</span>
                      <StatusBadge status={wo.status} />
                      <PriorityBadge priority={wo.priority} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-base mb-1">{wo.title}</h3>
                    {wo.description && <p className="text-sm text-gray-600 line-clamp-2">{wo.description}</p>}

                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                      <span>Site: <strong>{wo.siteName}</strong></span>
                      {wo.assignedToName && <span>Technician: <strong>{wo.assignedToName}</strong></span>}
                      <span>Requested: {format(new Date(wo.createdAt), 'MMM d, yyyy')}</span>
                      {wo.completedAt && <span>Completed: {format(new Date(wo.completedAt), 'MMM d, yyyy')}</span>}
                    </div>

                    {/* Customer Review Section */}
                    {wo.status === 'COMPLETED' && (
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                        {wo.customerRating != null ? (
                          <div className="flex items-center gap-2">
                            <div className="flex text-amber-400">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star
                                  key={s}
                                  className={`w-4 h-4 ${s <= (wo.customerRating ?? 0) ? 'fill-amber-400' : 'text-gray-200'}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-bold text-amber-700">
                              Your Rating: {wo.customerRating}/5 Stars
                            </span>
                            {wo.customerFeedback && (
                              <span className="text-xs text-gray-500 italic ml-2 truncate max-w-md">
                                "{wo.customerFeedback}"
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedOrderForFeedback(wo)}
                            className="btn-primary text-xs py-1.5 px-3 bg-amber-600 hover:bg-amber-700 flex items-center gap-1.5 shadow-xs"
                          >
                            <Star className="w-3.5 h-3.5 fill-white" />
                            Leave Service Review & Rating
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Progress indicator */}
                  <div className="hidden md:flex flex-col items-center gap-1 flex-shrink-0 pt-2">
                    {['NEW','ASSIGNED','IN_PROGRESS','COMPLETED','CLOSED'].map((s, i) => (
                      <div key={s} className="flex items-center gap-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          ['NEW','ASSIGNED','IN_PROGRESS','COMPLETED','CLOSED'].indexOf(wo.status) >= i
                            ? 'bg-primary-600' : 'bg-gray-200'
                        }`} />
                        {i < 4 && <div className={`w-0.5 h-2 ${
                          ['NEW','ASSIGNED','IN_PROGRESS','COMPLETED','CLOSED'].indexOf(wo.status) > i
                            ? 'bg-primary-600' : 'bg-gray-200'
                        }`} />}
                      </div>
                    ))}
                    <p className="text-[11px] font-semibold text-gray-500 mt-1">{wo.status.replace('_',' ')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Feedback Survey Modal */}
      {selectedOrderForFeedback && (
        <FeedbackModal
          isOpen={true}
          onClose={() => setSelectedOrderForFeedback(null)}
          onSubmit={handleFeedbackSubmit}
          workOrderNumber={selectedOrderForFeedback.woNumber}
        />
      )}
    </div>
  );
}
