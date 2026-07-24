import { WorkOrderStatus, WorkOrderPriority } from '@/types';
import clsx from 'clsx';

// ── Status Badge ──────────────────────────────────────────────────────────────
const statusConfig: Record<WorkOrderStatus, { label: string; classes: string }> = {
  NEW:         { label: 'New',         classes: 'bg-gray-100 text-gray-700' },
  ASSIGNED:    { label: 'Assigned',    classes: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'In Progress', classes: 'bg-yellow-100 text-yellow-700' },
  ON_HOLD:     { label: 'On Hold',     classes: 'bg-orange-100 text-orange-700' },
  COMPLETED:   { label: 'Completed',   classes: 'bg-green-100 text-green-700' },
  CLOSED:      { label: 'Closed',      classes: 'bg-purple-100 text-purple-700' },
  CANCELLED:   { label: 'Cancelled',   classes: 'bg-red-100 text-red-700' },
};

export function StatusBadge({ status }: { status: WorkOrderStatus }) {
  const config = statusConfig[status] ?? { label: status, classes: 'bg-gray-100 text-gray-700' };
  return (
    <span className={clsx('status-badge', config.classes)}>{config.label}</span>
  );
}

// ── Priority Badge ────────────────────────────────────────────────────────────
const priorityConfig: Record<WorkOrderPriority, { label: string; classes: string }> = {
  LOW:      { label: 'Low',      classes: 'bg-gray-100 text-gray-600' },
  MEDIUM:   { label: 'Medium',   classes: 'bg-blue-100 text-blue-600' },
  HIGH:     { label: 'High',     classes: 'bg-orange-100 text-orange-600' },
  CRITICAL: { label: 'Critical', classes: 'bg-red-100 text-red-700 font-bold' },
};

export function PriorityBadge({ priority }: { priority: WorkOrderPriority }) {
  const config = priorityConfig[priority] ?? { label: priority, classes: 'bg-gray-100 text-gray-600' };
  return (
    <span className={clsx('priority-badge', config.classes)}>{config.label}</span>
  );
}
