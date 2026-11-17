import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Heart, KeyRound, Mail, ShieldCheck, Sparkles, UserPlus } from 'lucide-react';
import ClayIcon from '@/components/ClayIcon';
import { services } from '@/services';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { brand } from '@/theme';

/** 登录 / 注册页：演示模式提供一键体验入口。 */
export default function Login() {
  const navigate = useNavigate();
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);
  const demoMode = useAppStore((state) => state.demoMode);
  const setCouple = useAppStore((state) => state.setCouple);
  const notify = useAppStore((state) => state.notify);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);

  /** 演示入口：直接进入已配对的空间，或走完整的配对引导流程。 */
  async function enterDemo(withPairing: boolean): Promise<void> {
    setBusy(true);
    const result = await signIn(withPairing ? 'new@couple.space' : 'demo@couple.space', 'demo1234');
    if (result.error) {
      notify(result.error.message, 'error');
      setBusy(false);
      return;
    }
    if (!withPairing) {
      const created = await services.pairing.createSpace('小甜', format(subDays(new Date(), 528), 'yyyy-MM-dd'));
      if (created.error) {
        notify(created.error.message, 'error');
        setBusy(false);
        return;
      }
      setCouple(created.data);
    }
    setBusy(false);
    navigate(withPairing ? '/pairing' : '/');
  }

  async function handleSubmit(): Promise<void> {
    if (!email.trim() || password.length < 6) {
      notify('请填写邮箱和至少 6 位密码', 'warning');
      return;
    }
    setBusy(true);
    const result =
      mode === 'login'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, nickname.trim() || '恋人');
    setBusy(false);
    if (result.error) {
      notify(result.error.message, 'error');
      return;
    }
    notify(mode === 'login' ? '欢迎回来 ❤️' : '注册成功，来绑定你们的空间吧', 'success');
    navigate('/pairing');
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        px: 2.5,
        pt: 6,
        pb: 4,
        background: `radial-gradient(circle at 80% 0%, rgba(196,174,232,.3), transparent 42%), linear-gradient(165deg, ${brand.blush}, #fff 60%)`,
      }}
    >
      <Box className="mx-auto w-full max-w-[440px]">
        <Box sx={{ textAlign: 'center', mb: 3.5 }}>
          <Box
            className="clay-jelly"
            sx={{
              width: 88,
              height: 88,
              mx: 'auto',
              mb: 2,
              borderRadius: '28px',
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(145deg,#FFE3EC,#DCCBF0)',
              boxShadow: 'inset 0 3px 0 rgba(255,255,255,.8), 0 8px 0 #EFB9CD, 0 18px 28px -10px rgba(120,80,100,.3)',
            }}
          >
            <ClayIcon icon={Heart} box={44} size={24} tone="pink" />
          </Box>
          <Typography variant="h4" sx={{ letterSpacing: 1, color: brand.ink }}>
            Couple Space
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            只属于我们两个人的私密小宇宙
          </Typography>
        </Box>

        {demoMode && (
          <Box
            sx={{
              borderRadius: '22px',
              p: 2.5,
              mb: 2.5,
              color: '#fff',
              background: `linear-gradient(145deg, ${brand.pink} 0%, ${brand.pinkDeep} 52%, ${brand.purple} 100%)`,
              boxShadow: '0 10px 26px rgba(233,131,168,.26)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ position: 'absolute', top: -18, right: 6, opacity: 0.22 }}>
              <Heart size={24} strokeWidth={1.75} color="#fff" />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Sparkles size={20} strokeWidth={1.75} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                演示模式
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.94, mb: 2 }}>
              无需配置，内置聊天、相册、宠物、纪念日等完整假数据，立即体验全部功能。
            </Typography>
            <Button
              fullWidth
              variant="contained"
              disabled={busy}
              onClick={() => void enterDemo(false)}
              sx={{ background: '#FFFDFB', color: brand.pinkDeep, '&:hover': { background: '#FFF5F8' } }}
            >
              一键进入演示空间
            </Button>
            <Button
              fullWidth
              size="small"
              disabled={busy}
              onClick={() => void enterDemo(true)}
              sx={{ mt: 0.75, color: '#fff', border: '1px solid rgba(255,255,255,.55)' }}
              variant="outlined"
              startIcon={<UserPlus size={18} strokeWidth={1.75} />}
            >
              体验配对流程
            </Button>
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 2 }}>
          <Divider sx={{ flex: 1 }} />
          <Typography variant="caption" color="text.secondary">
            或使用邮箱{mode === 'login' ? '登录' : '注册'}
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>

        <Box sx={{ borderRadius: '22px', bgcolor: '#FFFDFB', p: 2.5, boxShadow: 'inset 0 2px 0 rgba(255,255,255,.8), 0 6px 0 #EFB9CD, 0 14px 24px -8px rgba(120,80,100,.2)' }}>
          <TextField
            fullWidth
            label="邮箱"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="hello@example.com"
            InputProps={{ startAdornment: <Mail size={18} strokeWidth={1.75} color={brand.inkSoft} /> }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="密码"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 6 位"
            InputProps={{ startAdornment: <KeyRound size={18} strokeWidth={1.75} color={brand.inkSoft} /> }}
            sx={{ mb: mode === 'register' ? 2 : 0 }}
          />
          {mode === 'register' && (
            <TextField
              fullWidth
              label="昵称"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="你的小昵称"
              sx={{ mb: 0 }}
            />
          )}
          <Button
            fullWidth
            variant="contained"
            size="large"
            disabled={busy}
            onClick={() => void handleSubmit()}
            sx={{ mt: 2.5, py: 1.3 }}
          >
            {busy ? '请稍候…' : mode === 'login' ? '登录' : '注册并继续'}
          </Button>
          <Typography
            variant="body2"
            align="center"
            sx={{ mt: 2, color: brand.purple, cursor: 'pointer', fontWeight: 600 }}
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? '还没有账号？点此注册 →' : '已有账号？返回登录 →'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.75, mt: 3 }}>
          <ShieldCheck size={18} strokeWidth={1.75} color={brand.inkSoft} />
          <Typography variant="caption" color="text.secondary">
            数据仅你们两人可见，隐私由 Supabase RLS 保护
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
