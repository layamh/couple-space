import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { CalendarDays, Cake, Heart, Plus, Trash2, PartyPopper } from 'lucide-react';
import { GradientCard, SectionCard, CountdownChip } from '@/components/Common';
import { services } from '@/services';
import { useAppStore } from '@/store/useAppStore';
import { brand } from '@/theme';
import type { Anniversary, AnniversaryType } from '@/types';

const TYPE_META: Record<AnniversaryType, { label: string; color: string; icon: typeof Heart }> = {
  anniversary: { label: '纪念日', color: brand.pink, icon: Heart },
  birthday: { label: '生日', color: '#E5A24C', icon: Cake },
  other: { label: '其他', color: brand.purple, icon: PartyPopper },
};

/** 纪念日页：起始日设置、纪念日增删改与倒计时。 */
export default function Anniversary() {
  const couple = useAppStore((state) => state.couple);
  const setCouple = useAppStore((state) => state.setCouple);
  const notify = useAppStore((state) => state.notify);

  const [items, setItems] = useState<Anniversary[]>([]);
  const [startDate, setStartDate] = useState(couple?.start_date ?? '');
  const [editingStart, setEditingStart] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Anniversary | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<AnniversaryType>('anniversary');

  useEffect(() => {
    if (!couple) return;
    let cancelled = false;
    void services.anniversary.list(couple.id).then((result) => {
      if (!cancelled && !result.error && result.data) setItems(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [couple?.id]);

  useEffect(() => {
    if (items.length === 0) return;
    const next = services.anniversary.getNext(items);
    if (next?.daysLeft === 0) notify(`${next.item.title}就是今天！`, 'warning');
  }, [items, notify]);

  if (!couple) return null;
  const days = services.anniversary.getDaysTogether(couple.start_date);
  const ranked = items
    .map((item) => ({ item, daysLeft: services.anniversary.getNext([item])?.daysLeft ?? 0 }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  function openCreate(): void {
    setEditing(null);
    setTitle('');
    setDate(new Date().toISOString().slice(0, 10));
    setType('anniversary');
    setDialogOpen(true);
  }

  function openEdit(item: Anniversary): void {
    setEditing(item);
    setTitle(item.title);
    setDate(item.date);
    setType(item.type);
    setDialogOpen(true);
  }

  async function saveAnniversary(): Promise<void> {
    if (!title.trim()) {
      notify('请填写纪念日名称', 'warning');
      return;
    }
    if (editing) {
      const result = await services.anniversary.update(editing.id, { title: title.trim(), date, type });
      if (result.error || !result.data) {
        notify(result.error?.message ?? '保存失败', 'error');
        return;
      }
      setItems((previous) => previous.map((item) => (item.id === editing.id ? result.data! : item)));
      notify('纪念日已更新', 'success');
    } else {
      const result = await services.anniversary.create({
        couple_id: couple!.id,
        title: title.trim(),
        date,
        type,
      });
      if (result.error || !result.data) {
        notify(result.error?.message ?? '创建失败', 'error');
        return;
      }
      setItems((previous) => [...previous, result.data!].sort((a, b) => a.date.localeCompare(b.date)));
      notify('纪念日已添加', 'success');
    }
    setDialogOpen(false);
  }

  async function remove(item: Anniversary): Promise<void> {
    const result = await services.anniversary.delete(item.id);
    if (result.error) {
      notify(result.error.message, 'error');
      return;
    }
    setItems((previous) => previous.filter((current) => current.id !== item.id));
    notify('纪念日已删除', 'success');
  }

  async function saveStartDate(): Promise<void> {
    if (!startDate) return;
    const result = await services.pairing.updateStartDate(startDate);
    if (result.error || !result.data) {
      notify(result.error?.message ?? '保存失败', 'error');
      return;
    }
    setCouple(result.data);
    setEditingStart(false);
    notify('在一起的日子已更新', 'success');
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <GradientCard sx={{ p: 2.5, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>我们已经在一起</Typography>
        <Typography variant="h2" sx={{ fontWeight: 800, fontSize: 64, lineHeight: 1.2 }}>{days}</Typography>
        <Typography variant="body2" sx={{ opacity: 0.95 }}>天啦 ❤️</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>始于 {couple.start_date}</Typography>
          {editingStart ? (
            <>
              <TextField
                type="date"
                size="small"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                InputProps={{ sx: { bgcolor: 'rgba(255,255,255,.9)', borderRadius: 2, height: 32, fontSize: 12 } }}
              />
              <Button size="small" variant="contained" onClick={() => void saveStartDate()} sx={{ minHeight: 32, px: 1.5 }}>
                保存
              </Button>
            </>
          ) : (
            <Button size="small" onClick={() => setEditingStart(true)} sx={{ color: '#fff', textDecoration: 'underline', minHeight: 28 }}>
              修改起始日
            </Button>
          )}
        </Box>
      </GradientCard>

      <SectionCard
        title="所有纪念日"
        subtitle={`共 ${items.length} 个重要日子`}
        icon={<CalendarDays size={20} strokeWidth={1.75} />}
        action={<Button size="small" variant="contained" startIcon={<Plus size={18} strokeWidth={1.75} />} onClick={openCreate}>新增</Button>}
      >
        {ranked.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
            还没有纪念日，点“新增”记录第一个吧
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {ranked.map(({ item, daysLeft }) => {
              const meta = TYPE_META[item.type] ?? TYPE_META.anniversary;
              const Icon = meta.icon;
              return (
                <Box
                  key={item.id}
                  onClick={() => openEdit(item)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: '14px',
                    background: daysLeft === 0 ? 'rgba(233,131,168,.16)' : 'rgba(255,255,255,.72)',
                    border: '1px solid rgba(239,185,205,.6)',
                    cursor: 'pointer',
                  }}
                >
                  <Box sx={{ width: 38, height: 38, borderRadius: '14px', display: 'grid', placeItems: 'center', background: '#FFFDFB', color: meta.color, flexShrink: 0, boxShadow: 'inset 0 2px 0 rgba(255,255,255,.9), 0 3px 0 #EFB9CD, 0 6px 10px -4px rgba(120,80,100,.18)' }}>
                    <Icon size={20} strokeWidth={1.75} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(`${item.date}T00:00:00`), 'yyyy年M月d日')} · {meta.label}
                    </Typography>
                  </Box>
                  <CountdownChip days={daysLeft} />
                  <IconButton
                    size="small"
                    aria-label="删除纪念日"
                    onClick={(event) => {
                      event.stopPropagation();
                      void remove(item);
                    }}
                    sx={{ color: brand.inkSoft, p: 0.5 }}
                  >
                    <Trash2 size={18} strokeWidth={1.75} />
                  </IconButton>
                </Box>
              );
            })}
          </Box>
        )}
      </SectionCard>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editing ? '编辑纪念日' : '新增纪念日'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField fullWidth label="名称" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：第一次旅行" />
          <TextField fullWidth type="date" label="日期" value={date} onChange={(event) => setDate(event.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField fullWidth select label="类型" value={type} onChange={(event) => setType(event.target.value as AnniversaryType)}>
            <MenuItem value="anniversary">纪念日</MenuItem>
            <MenuItem value="birthday">生日</MenuItem>
            <MenuItem value="other">其他</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={() => void saveAnniversary()}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
