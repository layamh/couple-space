import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Check, Flame, Plus, Sparkles, Trash2 } from 'lucide-react';
import { CandyRain, SectionCard, GradientCard } from '@/components/Common';
import { services } from '@/services';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { brand } from '@/theme';
import type { Wish, WishCheckin } from '@/types';

/** 共同心愿：新增/完成/每日打卡，连续天数与共同进度。 */
export default function Wishlist() {
  const couple = useAppStore((state) => state.couple);
  const notify = useAppStore((state) => state.notify);
  const profile = useAuthStore((state) => state.profile);

  const [wishes, setWishes] = useState<Wish[]>([]);
  const [checkins, setCheckins] = useState<WishCheckin[]>([]);
  const [title, setTitle] = useState('');
  const [candy, setCandy] = useState(0);

  const load = useCallback(async (coupleId: string): Promise<void> => {
    const result = await services.wish.list(coupleId);
    if (result.error || !result.data) return;
    setWishes(result.data.wishes);
    setCheckins(result.data.checkins);
  }, []);

  useEffect(() => {
    if (!couple) return;
    let cancelled = false;
    const unsubscribe = services.wish.subscribe(couple.id, () => {
      if (!cancelled) void load(couple.id);
    });
    void load(couple.id);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [couple?.id, load]);

  if (!couple) return null;
  const doneCount = wishes.filter((wish) => wish.done).length;
  const progress = wishes.length === 0 ? 0 : Math.round((doneCount / wishes.length) * 100);
  const today = format(new Date(), 'yyyy-MM-dd');

  async function addWish(): Promise<void> {
    if (!title.trim()) {
      notify('请先填写心愿内容', 'warning');
      return;
    }
    const result = await services.wish.create(couple!.id, title);
    if (result.error || !result.data) {
      notify(result.error?.message ?? '添加失败', 'error');
      return;
    }
    setWishes((previous) => [result.data!, ...previous.filter((item) => item.id !== result.data!.id)]);
    setTitle('');
    notify('新心愿已加入清单 ✨', 'success');
  }

  async function toggleDone(wish: Wish): Promise<void> {
    const result = await services.wish.update(wish.id, { done: !wish.done });
    if (result.error || !result.data) {
      notify(result.error?.message ?? '更新失败', 'error');
      return;
    }
    setWishes((previous) => previous.map((item) => (item.id === wish.id ? result.data! : item)));
    if (result.data.done) {
      setCandy((value) => value + 1);
      notify('又一个心愿达成啦！🎉', 'success');
    }
  }

  async function checkIn(wish: Wish): Promise<void> {
    const userId = profile?.id ?? 'demo-user';
    const result = await services.wish.checkIn(wish.id, userId);
    if (result.error || !result.data) {
      notify(result.error?.message ?? '打卡失败', 'error');
      return;
    }
    setCheckins((previous) =>
      previous.some((item) => item.id === result.data!.id) ? previous : [...previous, result.data!],
    );
    setCandy((value) => value + 1);
    notify('今日打卡成功，继续加油！🔥', 'success');
  }

  async function remove(wish: Wish): Promise<void> {
    const result = await services.wish.delete(wish.id);
    if (result.error) {
      notify(result.error.message, 'error');
      return;
    }
    setWishes((previous) => previous.filter((item) => item.id !== wish.id));
    setCheckins((previous) => previous.filter((item) => item.wish_id !== wish.id));
    notify('心愿已删除', 'success');
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' }}>
      <CandyRain trigger={candy} count={10} />

      <GradientCard gradient="linear-gradient(145deg,#DCCBF0 0%,#B9A0E0 60%,#F4A6C1 130%)" sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Sparkles size={20} strokeWidth={1.75} color="#fff" />
          <Typography variant="subtitle1">我们的共同进度</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, fontSize: 44 }}>{progress}%</Typography>
          <Typography variant="body2">{doneCount} / {wishes.length} 个心愿已完成</Typography>
        </Box>
        <LinearProgress variant="determinate" value={progress} sx={{ bgcolor: 'rgba(255,255,255,.28)', '& .MuiLinearProgress-bar': { bgcolor: '#FFFDFB' } }} />
        <Typography variant="caption" sx={{ display: 'block', mt: 1.25, opacity: 0.9 }}>
          每一次打卡，都是我们一起变更好的证明 ❤️
        </Typography>
      </GradientCard>

      <SectionCard title="添加新心愿" icon={<Plus size={20} strokeWidth={1.75} />}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void addWish();
            }}
            placeholder="例如：一起去看海"
          />
          <Button variant="contained" onClick={() => void addWish()} sx={{ px: 2, flexShrink: 0 }}>
            添加
          </Button>
        </Box>
      </SectionCard>

      {wishes.map((wish) => {
        const streak = services.wish.getStreak(checkins, wish.id);
        const checkedToday = checkins.some(
          (item) => item.wish_id === wish.id && item.user_id === (profile?.id ?? 'demo-user') && item.checkin_date === today,
        );
        return (
          <Box
            key={wish.id}
            sx={{
              p: 2,
              borderRadius: '20px',
              bgcolor: '#FFFDFB',
              border: '1px solid rgba(239,185,205,.6)',
              boxShadow: 'inset 0 2px 0 rgba(255,255,255,.8), 0 4px 0 #EFB9CD, 0 10px 24px -8px rgba(120,80,100,.2)',
              opacity: wish.done ? 0.72 : 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Checkbox
                checked={wish.done}
                onChange={() => void toggleDone(wish)}
                icon={<Box sx={{ width: 20, height: 20, borderRadius: 8, border: '2px solid rgba(239,185,205,.9)', background: '#FFF9F4' }} />}
                checkedIcon={<Box sx={{ width: 20, height: 20, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'linear-gradient(145deg,#F7B4CC,#EC7FA6)', color: '#fff', boxShadow: '0 2px 0 #D9668F' }}><Check size={18} strokeWidth={1.75} /></Box>}
              />
              <Typography
                variant="body1"
                sx={{ flex: 1, fontSize: 14, fontWeight: 600, textDecoration: wish.done ? 'line-through' : 'none' }}
              >
                {wish.title}
              </Typography>
              <IconButton size="small" aria-label="删除心愿" onClick={() => void remove(wish)} sx={{ color: brand.inkSoft, p: 0.5 }}>
                <Trash2 size={18} strokeWidth={1.75} />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, pl: 0.5 }}>
              <Chip
                size="small"
                icon={<Flame size={18} strokeWidth={1.75} />}
                label={`连续 ${streak} 天`}
                sx={{ bgcolor: 'rgba(255,224,178,.5)', color: '#B87A35', height: 24, fontSize: 11 }}
              />
              <Box sx={{ flex: 1 }} />
              <Button
                size="small"
                variant={checkedToday ? 'outlined' : 'contained'}
                disabled={checkedToday || wish.done}
                onClick={() => void checkIn(wish)}
                sx={{ minHeight: 30, px: 1.5, fontSize: 12 }}
              >
                {checkedToday ? '今日已打卡' : '今日打卡'}
              </Button>
            </Box>
          </Box>
        );
      })}

      {wishes.length === 0 && (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
          还没有心愿，写下第一个想和 TA 一起完成的事吧
        </Typography>
      )}
    </Box>
  );
}
