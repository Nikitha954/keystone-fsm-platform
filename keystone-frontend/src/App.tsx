import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/auth/LoginPage';
import ManagerDashboard from '@/pages/manager/ManagerDashboard';
import WorkOrdersPage from '@/pages/manager/WorkOrdersPage';
import WorkOrderDetailPage from '@/pages/manager/WorkOrderDetailPage';
import CreateWorkOrderPage from '@/pages/manager/CreateWorkOrderPage';
import CustomersPage from '@/pages/manager/CustomersPage';
import PartsPage from '@/pages/manager/PartsPage';
import UsersPage from '@/pages/manager/UsersPage';
import TechnicianDashboard from '@/pages/technician/TechnicianDashboard';
import TechnicianWorkOrders from '@/pages/technician/TechnicianWorkOrders';
import CustomerPortal from '@/pages/customer/CustomerPortal';
import NotFoundPage from '@/pages/NotFoundPage';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.some(r => user?.roles?.includes(r as any))) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, user } = useAuth();

  const getDefaultRoute = () => {
    if (!user) return '/login';
    if (user.roles.includes('ROLE_MANAGER') || user.roles.includes('ROLE_DISPATCHER')) return '/dashboard';
    if (user.roles.includes('ROLE_TECHNICIAN')) return '/technician';
    if (user.roles.includes('ROLE_CUSTOMER')) return '/portal';
    return '/login';
  };

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <LoginPage />
      } />

      {/* Manager / Dispatcher routes */}
      <Route path="/" element={
        <ProtectedRoute roles={['ROLE_MANAGER','ROLE_DISPATCHER']}>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<ManagerDashboard />} />
        <Route path="workorders" element={<WorkOrdersPage />} />
        <Route path="workorders/new" element={<CreateWorkOrderPage />} />
        <Route path="workorders/:id" element={<WorkOrderDetailPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="parts" element={
          <ProtectedRoute roles={['ROLE_MANAGER']}>
            <PartsPage />
          </ProtectedRoute>
        } />
        <Route path="users" element={
          <ProtectedRoute roles={['ROLE_MANAGER']}>
            <UsersPage />
          </ProtectedRoute>
        } />
      </Route>

      {/* Technician routes */}
      <Route path="/technician" element={
        <ProtectedRoute roles={['ROLE_TECHNICIAN']}>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<TechnicianDashboard />} />
        <Route path="workorders" element={<TechnicianWorkOrders />} />
        <Route path="workorders/:id" element={<WorkOrderDetailPage />} />
      </Route>

      {/* Customer portal */}
      <Route path="/portal" element={
        <ProtectedRoute roles={['ROLE_CUSTOMER']}>
          <CustomerPortal />
        </ProtectedRoute>
      } />

      <Route path="/unauthorized" element={
        <div className="flex items-center justify-center h-screen text-gray-500">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-red-500 mb-2">403</h1>
            <p className="text-lg">Access Denied</p>
          </div>
        </div>
      } />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
