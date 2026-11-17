import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Camera, Check, Copy, Heart, KeyRound, Link2, Sparkles } from 'lucide-react';
import ClayIcon from '@/components/ClayIcon';
import { services } from '@/services';
import { useAppStore } from '@/store/useAppStore';
import { brand } from '@/theme';

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}

type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

/** 配对引导页：创建空间生成二维码 / 输入邀请码或扫码加入。 */
export default function Pairing() {
  const navigate = useNavigate();
  const setCouple = useAppStore((state) => state.setCouple);
  const notify = useAppStore((state) => state.notify);
  const demoMode = useAppStore((state) => state.demoMode);
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState<'create' | 'join'>(searchParams.get('code') ? 'join' : 'create');
  const [nickname, setNickname] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [code, setCode] = useState((searchParams.get('code') ?? '').toUpperCase().slice(0, 6));
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  function stopScan(): void {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setScanning(false);
  }

  useEffect(() => () => stopScan(), []);

  async function startScan(): Promise<void> {
    const Detector = (window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!Detector) {
      notify('当前浏览器不支持扫码，请手动输入邀请码', 'info');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setScanning(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
        const detector = new Detector({ formats: ['qr_code'] });
        timerRef.current = window.setInterval(() => {
          if (!videoRef.current) return;
          void detector
            .detect(videoRef.current)
            .then((codes) => {
              if (codes.length > 0) {
                setCode(codes[0].rawValue.toUpperCase().slice(0, 6));
                notify('扫码成功，已填入邀请码', 'success');
                stopScan();
              }
            })
            .catch(() => undefined);
        }, 600);
      }, 120);
    } catch {
      notify('无法访问摄像头，请手动输入邀请码', 'warning');
    }
  }

  async function handleCreate(): Promise<void> {
    setBusy(true);
    const result = await services.pairing.createSpace(nickname.trim() || '恋人', startDate);
    setBusy(false);
    if (result.error) {
      notify(result.error.message, 'error');
      return;
    }
    setCouple(result.data);
    setCreated(result.data.code);
    notify('专属空间创建成功，把邀请码发给 TA 吧 💕', 'success');
  }

  async function handleJoin(): Promise<void> {
    if (!/^[A-Z0-9]{6}$/.test(code.trim().toUpperCase())) {
      notify('请输入 6 位邀请码', 'warning');
      return;
    }
    setBusy(true);
    const result = await services.pairing.joinByCode(code);
    setBusy(false);
    if (result.error) {
      notify(result.error.message, 'error');
      return;
    }
    setCouple(result.data);
    notify('配对成功，欢迎来到我们的小宇宙 ❤️', 'success');
  }

  async function copyLink(): Promise<void> {
    if (!created) return;
    const link = services.pairing.buildInviteLink(created);
    try {
      await navigator.clipboard.writeText(link);
      notify('邀请链接已复制', 'success');
    } catch {
      notify(`请手动复制：${link}`, 'info');
    }
  }

  const inviteLink = created ? services.pairing.buildInviteLink(created) : '';

  return (
    <Box sx={{ minHeight: 'calc(100vh - 56px)', px: 2, pt: 3, pb: 4 }}>
      <Box className="mx-auto w-full max-w-[440px]">
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 60,
              height: 60,
              mx: 'auto',
              mb: 1.5,
              borderRadius: '20px',
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(145deg,#FFE3EC,#DCCBF0)',
              boxShadow: 'inset 0 2px 0 rgba(255,255,255,.8), 0 4px 0 #EFB9CD, 0 10px 16px -6px rgba(120,80,100,.22)',
            }}
          >
            <ClayIcon icon={Heart} box={40} size={20} tone="pink" />
          </Box>
          <Typography variant="h5">建立我们的专属空间</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            一个空间只允许两个人加入，配对后即可开始记录
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            p: 0.5,
            mb: 2.5,
            borderRadius: '999px',
            background: '#FFF9F4',
            boxShadow: 'inset 0 2px 5px rgba(120,80,100,.12)',
          }}
        >
          {(['create', 'join'] as const).map((item) => (
            <Box
              key={item}
              onClick={() => setTab(item)}
              sx={{
                flex: 1,
                py: 1.1,
                textAlign: 'center',
                borderRadius: '999px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 14,
                color: tab === item ? '#fff' : brand.inkSoft,
                background: tab === item ? 'linear-gradient(145deg,#F7B4CC,#EC7FA6)' : 'transparent',
                boxShadow: tab === item ? 'inset 0 2px 0 rgba(255,255,255,.5), 0 3px 0 #D9668F' : 'none',
              }}
            >
              {item === 'create' ? '创建空间' : '加入空间'}
            </Box>
          ))}
        </Box>

        {tab === 'create' && !created && (
          <Box sx={{ borderRadius: '22px', bgcolor: '#FFFDFB', p: 2.5, boxShadow: 'inset 0 2px 0 rgba(255,255,255,.8), 0 6px 0 #EFB9CD, 0 14px 24px -8px rgba(120,80,100,.2)' }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              创建后你将获得专属邀请码
            </Typography>
            <TextField
              fullWidth
              label="你的昵称"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="例如：小甜"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="在一起的日子"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2.5 }}
            />
            <Button fullWidth variant="contained" size="large" disabled={busy} onClick={() => void handleCreate()}>
              {busy ? '创建中…' : '创建我们的空间'}
            </Button>
            {demoMode && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>
                演示模式将直接使用固定邀请码 DEMO123
              </Typography>
            )}
          </Box>
        )}

        {tab === 'create' && created && (
          <Box
            sx={{
              borderRadius: '22px',
              bgcolor: '#FFFDFB',
              p: 3,
              textAlign: 'center',
              boxShadow: 'inset 0 2px 0 rgba(255,255,255,.8), 0 8px 0 #EFB9CD, 0 18px 24px -8px rgba(120,80,100,.2)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.75, mb: 1 }}>
              <Check size={20} strokeWidth={1.75} color="#7FBF9A" />
              <Typography variant="subtitle1" sx={{ color: '#6CA985' }}>空间创建成功</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">把邀请码或二维码发给 TA</Typography>
            <Box
              sx={{
                my: 2,
                py: 1.25,
                borderRadius: '16px',
                background: `linear-gradient(145deg, rgba(233,131,168,.16), rgba(196,174,232,.16))`,
              }}
            >
              <Typography variant="h4" sx={{ letterSpacing: 6, fontWeight: 800, color: brand.pinkDeep }}>
                {created}
              </Typography>
            </Box>
            <Box sx={{ bgcolor: '#FFFDFB', p: 2, display: 'inline-block', borderRadius: '16px', border: '1px solid rgba(239,185,205,.7)' }}>
              <QRCode value={inviteLink} size={168} level="M" fgColor="#5A4653" bgColor="#FFFFFF" />
            </Box>
            <Button fullWidth variant="outlined" startIcon={<Link2 size={18} strokeWidth={1.75} />} onClick={() => void copyLink()} sx={{ mt: 2.5 }}>
              复制邀请链接
            </Button>
            <Button fullWidth variant="contained" startIcon={<Sparkles size={18} strokeWidth={1.75} />} onClick={() => navigate('/')} sx={{ mt: 1 }}>
              进入我们的空间
            </Button>
          </Box>
        )}

        {tab === 'join' && (
          <Box sx={{ borderRadius: '22px', bgcolor: '#FFFDFB', p: 2.5, boxShadow: 'inset 0 2px 0 rgba(255,255,255,.8), 0 6px 0 #EFB9CD, 0 14px 24px -8px rgba(120,80,100,.2)' }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>输入 TA 分享的邀请码</Typography>
            <TextField
              fullWidth
              label="6 位邀请码"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="DEMO123"
              InputProps={{ startAdornment: <KeyRound size={18} strokeWidth={1.75} color={brand.inkSoft} /> }}
              inputProps={{ style: { letterSpacing: 4, fontSize: 18, fontWeight: 700 } }}
              sx={{ mb: 2 }}
            />
            <Button fullWidth variant="contained" size="large" disabled={busy} onClick={() => void handleJoin()}>
              {busy ? '加入中…' : '加入空间'}
            </Button>
            <Button fullWidth variant="text" startIcon={<Camera size={18} strokeWidth={1.75} />} onClick={() => void startScan()} sx={{ mt: 1 }}>
              扫描二维码加入
            </Button>
            {scanning && (
              <Box sx={{ mt: 1.5 }}>
                <video ref={videoRef} muted playsInline style={{ width: '100%', borderRadius: 14, maxHeight: 240 }} />
                <Button size="small" onClick={stopScan} sx={{ mt: 1 }}>取消扫码</Button>
              </Box>
            )}
            {demoMode && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>
                演示模式可输入 DEMO123 或任意 6 位字符
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
