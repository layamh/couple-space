import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Cloud, CloudRain, Heart, MessageCircleHeart, PartyPopper, Smile, Trash2 } from 'lucide-react';
import { CandyRain, GradientCard, SectionCard, EmptyState } from '@/components/Common';
import { services } from '@/services';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { brand } from '@/theme';
import type { MoodTag, Whisper } from '@/types';

const MOODS: Array<{ value: MoodTag; label: string; icon: typeof Heart; color: string }> = [
  { value: 'happy', label: '开心', icon: Smile, color: '#E5A24C' },
  { value: 'sweet', label: '甜蜜', icon: Heart, color: brand.pinkDeep },
  { value: 'calm', label: '平静', icon: Cloud, color: brand.purple },
  { value: 'sad', label: '想念', icon: CloudRain, color: '#7FA8C9' },
  { value: 'excited', label: '雀跃', icon: PartyPopper, color: '#7FBF9A' },
];

/** 悄悄话留言板：心情标签、发布撒糖、按时间倒序展示。 */
export default function Whispers() {
  const couple = useAppStore((state) => state.couple);
  const partner = useAppStore((state) => state.partner);
  const notify = useAppStore((state) => state.notify);
  const profile = useAuthStore((state) => state.profile);

  const [items, setItems] = useState<Whisper[]>([]);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<MoodTag>('sweet');
  const [candy, setCandy] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!couple) return;
    let cancelled = false;
    const unsubscribe = services.whisper.subscribe(couple.id, (whisper) => {
      setItems((previous) =>
        previous.some((item) => item.id === whisper.id)
          ? previous
          : [whisper, ...previous].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      );
    });
    void services.whisper.list(couple.id).then((result) => {
      if (cancelled || result.error || !result.data) return;
      setItems((previous) => {
        const merged = new Map(previous.map((item) => [item.id, item]));
        result.data.forEach((item) => merged.set(item.id, item));
        return [...merged.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [couple?.id]);

  if (!couple) return null;
  const myId = profile?.id ?? 'demo-user';

  async function publish(): Promise<void> {
    if (!content.trim()) {
      notify('写点什么再发布吧', 'warning');
      return;
    }
    setBusy(true);
    const result = await services.whisper.create(couple!.id, myId, content, mood);
    setBusy(false);
    if (result.error || !result.data) {
      notify(result.error?.message ?? '发布失败', 'error');
      return;
    }
    setItems((previous) => [result.data!, ...previous.filter((item) => item.id !== result.data!.id)]);
    setContent('');
    setCandy((value) => value + 1);
    notify('悄悄话已送达 TA 的心里 💕', 'success');
  }

  async function remove(whisper: Whisper): Promise<void> {
    const result = await services.whisper.delete(whisper.id);
    if (result.error) {
      notify(result.error.message, 'error');
      return;
    }
    setItems((previous) => previous.filter((item) => item.id !== whisper.id));
    notify('留言已删除', 'success');
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' }}>
      <CandyRain trigger={candy} count={16} />

      <GradientCard gradient="linear-gradient(145deg,#F4A6C1,#E983A8 52%,#C4AEE8)" sx={{ p: 2.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <MessageCircleHeart size={20} strokeWidth={1.75} color="#fff" />
          <Typography variant="subtitle1">写下此刻的心情</Typography>
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.9 }}>
          只有我们两个人能看到，想说什么都可以
        </Typography>
      </GradientCard>

      <SectionCard title="发布悄悄话" icon={<Heart size={20} strokeWidth={1.75} />}>
        <TextField
          fullWidth
          multiline
          minRows={3}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="今天最想对 TA 说的话…"
          sx={{ mb: 1.5 }}
        />
        <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5, flexWrap: 'wrap' }}>
          {MOODS.map((item) => {
            const Icon = item.icon;
            const selected = mood === item.value;
            return (
              <Chip
                key={item.value}
                size="small"
                icon={<Icon size={18} strokeWidth={1.75} />}
                label={item.label}
                onClick={() => setMood(item.value)}
                sx={{
                  bgcolor: selected ? `${item.color}26` : 'rgba(255,255,255,.8)',
                  border: selected ? `1.5px solid ${item.color}` : '1px solid rgba(196,174,232,.24)',
                  color: selected ? item.color : brand.inkSoft,
                }}
              />
            );
          })}
        </Box>
        <Button fullWidth variant="contained" disabled={busy} onClick={() => void publish()} startIcon={<PartyPopper size={18} strokeWidth={1.75} />}>
          {busy ? '发送中…' : '撒朵小花，发布悄悄话'}
        </Button>
      </SectionCard>

      {items.length === 0 ? (
        <EmptyState icon={<MessageCircleHeart size={24} strokeWidth={1.75} />} title="还没有悄悄话" description="写下第一句只属于你们的心里话吧" />
      ) : (
        items.map((item) => {
          const mine = item.author_id === myId;
          const moodMeta = MOODS.find((entry) => entry.value === item.mood) ?? MOODS[1];
          const MoodIcon = moodMeta.icon;
          return (
            <Box
              key={item.id}
              sx={{
                p: 2,
                borderRadius: '20px',
                bgcolor: mine ? 'rgba(233,131,168,.1)' : 'rgba(196,174,232,.1)',
                border: `1px solid ${mine ? 'rgba(233,131,168,.22)' : 'rgba(196,174,232,.22)'}`,
                position: 'relative',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '12px',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 13,
                    background: mine ? `linear-gradient(145deg, ${brand.pink}, ${brand.pinkDeep})` : `linear-gradient(145deg, ${brand.purple}, #DCCBF0)`,
                  }}
                >
                  {(mine ? (profile?.nickname ?? '我') : (partner?.nickname ?? 'TA')).slice(0, 1)}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {mine ? (profile?.nickname ?? '我') : (partner?.nickname ?? 'TA')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(item.created_at), 'M月d日 HH:mm')}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  icon={<MoodIcon size={18} strokeWidth={1.75} />}
                  label={moodMeta.label}
                  sx={{ bgcolor: '#FFFDFB', color: moodMeta.color, height: 24, fontSize: 11 }}
                />
                {mine && (
                  <IconButton size="small" aria-label="删除留言" onClick={() => void remove(item)} sx={{ color: brand.inkSoft, p: 0.4 }}>
                    <Trash2 size={18} strokeWidth={1.75} />
                  </IconButton>
                )}
              </Box>
              <Typography variant="body2" sx={{ lineHeight: 1.85, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {item.content}
              </Typography>
            </Box>
          );
        })
      )}
    </Box>
  );
}
