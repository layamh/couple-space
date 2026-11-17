import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullScreenLoader } from '@/components/Common';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';

/** 主框架守卫：未登录 → Login，已登录未配对 → Pairing。 */
export function ProtectedRoute() {
  const loading = useAuthStore((state) => state.loading);
  const session = useAuthStore((state) => state.session);
  const ready = useAppStore((state) => state.ready);
  const couple = useAppStore((state) => state.couple);
  const location = useLocation();

  if (loading || !ready) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!couple) return <Navigate to="/pairing" replace />;
  return <Outlet />;
}

/** 配对页守卫：未登录 → Login；已配对 → 首页。 */
export function PairRoute() {
  const loading = useAuthStore((state) => state.loading);
  const session = useAuthStore((state) => state.session);
  const ready = useAppStore((state) => state.ready);
  const couple = useAppStore((state) => state.couple);

  if (loading || !ready) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (couple) return <Navigate to="/" replace />;
  return <Outlet />;
}
