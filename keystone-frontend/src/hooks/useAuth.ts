// hooks/useAuth.ts
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { setCredentials, logout } from '@/store/slices/authSlice';
import { authService } from '@/services/authService';
import { RoleName } from '@/types';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated, accessToken } = useSelector((s: RootState) => s.auth);

  const login = async (email: string, password: string) => {
    const data = await authService.login(email, password);
    dispatch(setCredentials({
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    }));
    return data.user;
  };

  const logoutUser = () => dispatch(logout());

  const hasRole = (role: RoleName): boolean =>
    user?.roles?.includes(role) ?? false;

  const isManager    = () => hasRole('ROLE_MANAGER');
  const isDispatcher = () => hasRole('ROLE_DISPATCHER');
  const isTechnician = () => hasRole('ROLE_TECHNICIAN');
  const isCustomer   = () => hasRole('ROLE_CUSTOMER');

  const canAccessAdmin = () => isManager() || isDispatcher();

  return { user, isAuthenticated, accessToken, login, logout: logoutUser,
           hasRole, isManager, isDispatcher, isTechnician, isCustomer, canAccessAdmin };
};
