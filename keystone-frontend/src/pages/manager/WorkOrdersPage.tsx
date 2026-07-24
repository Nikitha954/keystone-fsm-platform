import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { workOrderService } from '@/services/workOrderService';
import { WorkOrder, WorkOrderStatus } from '@/types';
import { StatusBadge, PriorityBadge } from '@/components/common/Badges';
import { Search, Plus, Filter, LayoutGrid, List, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLUMNS: WorkOrderStatus[] = ['NEW','ASSIGNED','IN_PROGRESS','ON_HOLD','COMPLETED'];

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | ''>('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await workOrderService.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
        page, size: 10,
      });
      setWorkOrders(result.content);
      setTotalPages(result.totalPages);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { fetchWorkOrders(); }, [fetchWorkOrders]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Work Orders</h1>
          <p className="text-sm text-gray-500">Manage and track all field service jobs</p>
        </div>
        <Link to="/workorders/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Work Order
        </Link>
      </div>

      {/* Filters bar */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search WO number, title..." className="input pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as WorkOrderStatus | ''); setPage(0); }}
          className="input w-44"
        >
          <option value="">All Statuses</option>
          {(['NEW','ASSIGNED','IN_PROGRESS','ON_HOLD','COMPLETED','CLOSED','CANCELLED'] as WorkOrderStatus[]).map(s => (
            <option key={s} value={s}>{s.replace('_',' ')}</option>
          ))}
        </select>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={() => setView('table')}
            className={`p-2 ${view === 'table' ? 'bg-primary-600 text-white' : 'hover:bg-gray-50 text-gray-500'}`}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setView('kanban')}
            className={`p-2 ${view === 'kanban' ? 'bg-primary-600 text-white' : 'hover:bg-gray-50 text-gray-500'}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table view */}
      {view === 'table' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200">
                <tr>
                  {['WO Number','Title','Customer','Site','Priority','Status','Assigned To','Due Date','SLA'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({length: 5}).map((_, i) => (
                    <tr key={i}>
                      {Array.from({length: 9}).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : workOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                      No work orders found
                    </td>
                  </tr>
                ) : workOrders.map(wo => (
                  <tr key={wo.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/workorders/${wo.id}`} className="text-primary-600 font-medium hover:underline">
                        {wo.woNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 max-w-48">
                      <p className="truncate text-gray-800 dark:text-gray-200">{wo.title}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{wo.customerName}</td>
                    <td className="px-4 py-3 text-gray-600">{wo.siteName}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={wo.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={wo.status} /></td>
                    <td className="px-4 py-3 text-gray-600">{wo.assignedToName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {wo.dueDate ? format(new Date(wo.dueDate), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {wo.slaBreach && (
                        <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
                          <AlertTriangle className="w-3 h-3" /> Breached
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">Page {page + 1} of {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary py-1 px-3">Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="btn-secondary py-1 px-3">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Kanban view */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map(status => {
            const items = workOrders.filter(wo => wo.status === status);
            return (
              <div key={status} className="flex-shrink-0 w-72">
                <div className="flex items-center justify-between mb-3">
                  <StatusBadge status={status} />
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {items.map(wo => (
                    <Link key={wo.id} to={`/workorders/${wo.id}`}
                      className="block card p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs text-primary-600 font-mono font-medium">{wo.woNumber}</span>
                        <PriorityBadge priority={wo.priority} />
                      </div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white mb-1 line-clamp-2">{wo.title}</p>
                      <p className="text-xs text-gray-500">{wo.customerName} · {wo.siteName}</p>
                      {wo.assignedToName && (
                        <p className="text-xs text-gray-400 mt-1">→ {wo.assignedToName}</p>
                      )}
                      {wo.slaBreach && (
                        <div className="flex items-center gap-1 mt-2 text-red-500 text-xs">
                          <AlertTriangle className="w-3 h-3" /> SLA Breach
                        </div>
                      )}
                    </Link>
                  ))}
                  {items.length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                      No orders
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
