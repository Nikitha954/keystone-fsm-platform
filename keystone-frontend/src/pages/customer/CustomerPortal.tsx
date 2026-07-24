import { useEffect, useState } from 'react';
import { workOrderService } from '@/services/workOrderService';
import { WorkOrder } from '@/types';
import { StatusBadge, PriorityBadge } from '@/components/common/Badges';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { LogOut, ClipboardList, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CustomerPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    workOrderService.getMy({ size: 50 })
      .then(data => setOrders(data.content))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

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
            <p className="text-xs text-gray-500">Customer Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Hello, <strong>{user?.firstName}</strong></span>
          <button onClick={handleLogout} className="btn-secondary py-1.5 px-3">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Maintenance Requests</h1>
          <p className="text-sm text-gray-500">Track the status of your service requests</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="card p-16 text-center text-gray-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No requests yet</p>
            <p className="text-sm">Contact us to raise a maintenance request</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(wo => (
              <div key={wo.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-mono font-semibold text-primary-600">{wo.woNumber}</span>
                      <StatusBadge status={wo.status} />
                      <PriorityBadge priority={wo.priority} />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{wo.title}</h3>
                    {wo.description && <p className="text-sm text-gray-500 line-clamp-2">{wo.description}</p>}
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-400">
                      <span>Site: {wo.siteName}</span>
                      {wo.assignedToName && <span>Technician: {wo.assignedToName}</span>}
                      <span>Raised: {format(new Date(wo.createdAt), 'MMM d, yyyy')}</span>
                      {wo.completedAt && <span>Completed: {format(new Date(wo.completedAt), 'MMM d, yyyy')}</span>}
                    </div>
                  </div>
                  {/* Progress indicator */}
                  <div className="hidden md:flex flex-col items-center gap-1 flex-shrink-0">
                    {['NEW','ASSIGNED','IN_PROGRESS','COMPLETED','CLOSED'].map((s, i) => (
                      <div key={s} className="flex items-center gap-1">
                        <div className={`w-3 h-3 rounded-full ${
                          ['NEW','ASSIGNED','IN_PROGRESS','COMPLETED','CLOSED'].indexOf(wo.status) >= i
                            ? 'bg-primary-600' : 'bg-gray-200'
                        }`} />
                        {i < 4 && <div className={`w-0.5 h-3 ${
                          ['NEW','ASSIGNED','IN_PROGRESS','COMPLETED','CLOSED'].indexOf(wo.status) > i
                            ? 'bg-primary-600' : 'bg-gray-200'
                        }`} />}
                      </div>
                    ))}
                    <p className="text-xs text-gray-400 mt-1">{wo.status.replace('_',' ')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
