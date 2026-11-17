import { useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import DemoBanner from '@/components/DemoBanner';
import { AppRouter } from '@/router';
import { isDemoMode, services } from '@/services';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';

/** 顶层容器：初始化会话、建立一次全局订阅、渲染路由与全局提示。 */
export default function App() {
  const session = useAuthStore((state) => state.session);
  const initAuth = useAuthStore((state) => state.init);
  const couple = useAppStore((state) => state.couple);
  const setCouple = useAppStore((state) => state.setCouple);
  const setPartner = useAppStore((state) => state.setPartner);
  const setPet = useAppStore((state) => state.setPet);
  const setDemoMode = useAppStore((state) => state.setDemoMode);
  const setReady = useAppStore((state) => state.setReady);
  const snackbar = useAppStore((state) => state.snackbar);
  const closeSnackbar = useAppStore((state) => state.closeSnackbar);

  useEffect(() => {
    setDemoMode(isDemoMode);
    void initAuth();
  }, [initAuth, setDemoMode]);

  // 会话变化时加载当前情侣空间；顶层只做一次，页面只读取 store。
  useEffect(() => {
    let cancelled = false;
    if (!session) {
      setCouple(null);
      setPartner(null);
      setPet(null);
      setReady(true);
      return;
    }

    void (async () => {
      const current = await services.pairing.getMyCouple();
      if (cancelled) return;
      setCouple(current);
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user.id, setCouple, setPartner, setPet, setReady]);

  // 配对信息一旦出现（登录恢复或刚创建/加入），立即补齐伴侣与宠物，保证首页首屏完整。
  useEffect(() => {
    if (!couple) {
      setPartner(null);
      setPet(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const partner = await services.pairing.getPartner(couple);
      const petResult = await services.pet.getPet(couple.id);
      if (cancelled) return;
      setPartner(partner);
      if (!petResult.error && petResult.data) setPet(petResult.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [couple?.id, setPartner, setPet]);

  // 全局增量订阅：配对信息、宠物状态。聊天/相册/心愿等由对应页面订阅。
  useEffect(() => {
    if (!couple) return;
    const unsubscribers = [
      services.pairing.subscribeCouple(couple.id, (updated) => setCouple(updated)),
      services.pet.subscribePet(couple.id, (updated) => setPet(updated)),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [couple?.id, setCouple, setPet]);

  return (
    <>
      <DemoBanner />
      <AppRouter />
      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={3200}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ top: { xs: '56px', sm: '68px' } }}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbar?.severity ?? 'info'}
          variant="filled"
          sx={{ borderRadius: '12px', minWidth: 220, boxShadow: '0 8px 24px rgba(120,80,100,.18)' }}
        >
          {snackbar?.message ?? ''}
        </Alert>
      </Snackbar>
    </>
  );
}
