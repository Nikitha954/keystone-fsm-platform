import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { workOrderService } from '@/services/workOrderService';
import { WorkOrder, WorkOrderStatus } from '@/types';
import { StatusBadge, PriorityBadge } from '@/components/common/Badges';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

const TABS: { label: string; status: WorkOrderStatus | undefined }[] = [
  { label: 'All',         status: undefined },
  { label: 'Assigned',    status: 'ASSIGNED' },
  { label: 'In Progress', status: 'IN_PROGRESS' },
  { label: 'On Hold',     status: 'ON_HOLD' },
  { label: 'Completed',   status: 'COMPLETED' },
];

export default function TechnicianWorkOrders() {
  const [jobs, setJobs] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<WorkOrderStatus | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    setLoading(true);
    workOrderService.getMy({ status: activeTab, page, size: 10 })
      .then(data => { setJobs(data.content); setTotalPages(data.totalPages); })
      .finally(() => setLoading(false));
  }, [activeTab, page]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Work Orders</h1>
        <p className="text-sm text-gray-500">All jobs assigned to you</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(tab => (
          <button key={tab.label} onClick={() => { setActiveTab(tab.status); setPage(0); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.status
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['WO #','Title','Customer / Site','Priority','Status','Due Date','SLA',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? Array.from({length: 5}).map((_,i) => (
              <tr key={i}>{Array.from({length:8}).map((_,j) => (
                <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse"/></td>
              ))}</tr>
            )) : jobs.map(wo => (
              <tr key={wo.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-primary-600 font-medium">{wo.woNumber}</td>
                <td className="px-4 py-3 max-w-48"><p className="truncate font-medium text-gray-900">{wo.title}</p></td>
                <td className="px-4 py-3 text-gray-500 text-xs"><p>{wo.customerName}</p><p>{wo.siteName}</p></td>
                <td className="px-4 py-3"><PriorityBadge priority={wo.priority} /></td>
                <td className="px-4 py-3"><StatusBadge status={wo.status} /></td>
                <td className="px-4 py-3 text-gray-500 text-xs">{wo.dueDate ? format(new Date(wo.dueDate), 'MMM d, HH:mm') : '—'}</td>
                <td className="px-4 py-3">{wo.slaBreach && <span className="text-red-500 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>Breach</span>}</td>
                <td className="px-4 py-3"><Link to={`/technician/workorders/${wo.id}`} className="text-xs text-primary-600 font-medium hover:underline">Open →</Link></td>
              </tr>
            ))}
            {!loading && jobs.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No jobs found</td></tr>
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t">
            <p className="text-sm text-gray-500">Page {page + 1} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0,p-1))} disabled={page===0} className="btn-secondary py-1 px-3">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages-1,p+1))} disabled={page===totalPages-1} className="btn-secondary py-1 px-3">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
