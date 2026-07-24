// types/index.ts - All shared TypeScript types for KEYSTONE

export type WorkOrderStatus =
  | 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'ON_HOLD'
  | 'COMPLETED' | 'CLOSED' | 'CANCELLED';

export type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RoleName =
  | 'ROLE_MANAGER' | 'ROLE_DISPATCHER'
  | 'ROLE_TECHNICIAN' | 'ROLE_CUSTOMER';

export type NotificationType =
  | 'WORK_ORDER_ASSIGNED' | 'WORK_ORDER_UPDATED' | 'WORK_ORDER_COMPLETED'
  | 'WORK_ORDER_CANCELLED' | 'SLA_BREACH_WARNING' | 'SLA_BREACHED'
  | 'PART_LOW_STOCK' | 'GENERAL';

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string;
  isActive: boolean;
  roles: RoleName[];
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: User;
}

// ── Customer & Site ───────────────────────────────────────────────────────────
export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  siteCount: number;
}

export interface Site {
  id: number;
  customerId: number;
  customerName: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  createdAt: string;
}

// ── Work Order ────────────────────────────────────────────────────────────────
export interface StatusHistory {
  id: number;
  oldStatus: WorkOrderStatus | null;
  newStatus: WorkOrderStatus;
  changedByName: string;
  changeReason?: string;
  changedAt: string;
}

export interface WorkOrder {
  id: number;
  woNumber: string;
  title: string;
  description?: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  siteId: number;
  siteName: string;
  customerId: number;
  customerName: string;
  assignedToId?: number;
  assignedToName?: string;
  createdById: number;
  createdByName: string;
  dueDate?: string;
  slaDueDate?: string;
  startedAt?: string;
  completedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  slaBreach: boolean;
  statusHistory?: StatusHistory[];
  totalTimeMinutes?: number;
}

// ── Parts ─────────────────────────────────────────────────────────────────────
export interface Part {
  id: number;
  partNumber: string;
  name: string;
  description?: string;
  unitCost: number;
  stockQty: number;
  minStock: number;
  isActive: boolean;
  lowStock: boolean;
  createdAt: string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalWorkOrders: number;
  newWorkOrders: number;
  assignedWorkOrders: number;
  inProgressWorkOrders: number;
  onHoldWorkOrders: number;
  completedWorkOrders: number;
  closedWorkOrders: number;
  cancelledWorkOrders: number;
  slaBreachedCount: number;
  slaAtRiskCount: number;
  totalCustomers: number;
  totalTechnicians: number;
  lowStockPartsCount: number;
  workOrdersByPriority: Record<WorkOrderPriority, number>;
  weeklyTrend?: Array<{ date: string; count: number }>;
  topTechnicians?: Array<{ name: string; completed: number }>;
}

// ── Notification ──────────────────────────────────────────────────────────────
export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  workOrderId?: number;
  workOrderNumber?: string;
  createdAt: string;
}

// ── API wrappers ──────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: Record<string, string>;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
