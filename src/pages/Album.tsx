import { useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Camera, Images, Plus, Trash2, Upload } from 'lucide-react';
import { ImageViewer, SectionCard, SmartImage, EmptyState } from '@/components/Common';
import { services } from '@/services';
import { useAppStore } from '@/store/useAppStore';
import { brand } from '@/theme';
import type { Photo } from '@/types';

/** 情侣相册：时间倒序照片墙、上传、大图预览与删除。 */
export default function Album() {
  const couple = useAppStore((state) => state.couple);
  const notify = useAppStore((state) => state.notify);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [viewer, setViewer] = useState<Photo | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!couple) return;
    let cancelled = false;
    const unsubscribe = services.album.subscribePhotos(couple.id, (photo) => {
      setPhotos((previous) =>
        previous.some((item) => item.id === photo.id)
          ? previous
          : [photo, ...previous].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      );
    });
    void services.album.listPhotos(couple.id).then((result) => {
      if (cancelled || result.error || !result.data) return;
      setPhotos((previous) => {
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

  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const grouped = useMemo(() => {
    const buckets = new Map<string, Photo[]>();
    photos.forEach((photo) => {
      const key = format(parseISO(photo.created_at), 'yyyy年M月');
      buckets.set(key, [...(buckets.get(key) ?? []), photo]);
    });
    return [...buckets.entries()];
  }, [photos]);

  async function upload(): Promise<void> {
    if (!pendingFile || !couple) return;
    setBusy(true);
    const result = await services.album.uploadPhoto(couple.id, pendingFile, caption.trim());
    setBusy(false);
    if (result.error || !result.data) {
      notify(result.error?.message ?? '上传失败', 'error');
      return;
    }
    setPhotos((previous) => [result.data!, ...previous]);
    setUploadOpen(false);
    setPendingFile(null);
    setCaption('');
    notify('照片已保存到我们的相册 📷', 'success');
  }

  async function remove(photo: Photo): Promise<void> {
    const result = await services.album.deletePhoto(photo.id);
    if (result.error) {
      notify(result.error.message, 'error');
      return;
    }
    setPhotos((previous) => previous.filter((item) => item.id !== photo.id));
    setViewer(null);
    notify('照片已删除', 'success');
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <SectionCard
        title="我们的照片墙"
        subtitle={`已收藏 ${photos.length} 个瞬间`}
        icon={<Images size={20} strokeWidth={1.75} />}
        action={
          <Button
            size="small"
            variant="contained"
            startIcon={<Plus size={18} strokeWidth={1.75} />}
            onClick={() => fileRef.current?.click()}
          >
            上传
          </Button>
        }
      >
        <Typography variant="caption" color="text.secondary">
          按时间轴倒序排列，点开照片可以放大查看
        </Typography>
      </SectionCard>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            setPendingFile(file);
            setUploadOpen(true);
          }
          event.target.value = '';
        }}
      />

      {photos.length === 0 ? (
        <EmptyState
          icon={<Camera size={24} strokeWidth={1.75} />}
          title="相册还是空的"
          description="上传第一张合照，开始记录我们的美好瞬间吧"
        />
      ) : (
        grouped.map(([month, items]) => (
          <Box key={month}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.25 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{month}</Typography>
              <Box sx={{ flex: 1, height: 1, background: 'rgba(196,174,232,.28)' }} />
              <Typography variant="caption" color="text.secondary">{items.length} 张</Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.25 }}>
              {items.map((photo) => (
                <Box
                  key={photo.id}
                  className="clay-pressable"
                  sx={{
                    position: 'relative',
                    aspectRatio: '1 / 1',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: 'inset 0 2px 0 rgba(255,255,255,.8), 0 5px 0 #EFB9CD, 0 12px 18px -6px rgba(120,80,100,.24)',
                  }}
                  onClick={() => setViewer(photo)}
                >
                  <SmartImage src={photo.url} alt={photo.caption ?? '我们的照片'} />
                  {photo.caption && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        p: 1.1,
                        background: 'linear-gradient(transparent, rgba(90,70,83,.78))',
                      }}
                    >
                      <Typography variant="caption" sx={{ color: '#fff', fontSize: 11, lineHeight: 1.4, display: 'block' }}>
                        {photo.caption}
                      </Typography>
                    </Box>
                  )}
                  <IconButton
                    aria-label="删除照片"
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation();
                      void remove(photo);
                    }}
                    sx={{ position: 'absolute', top: 6, right: 6, bgcolor: '#FFFDFB', color: brand.ink, p: 0.4, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.9), 0 2px 0 #EFB9CD' }}
                  >
                    <Trash2 size={18} strokeWidth={1.75} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        ))
      )}

      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pb: 1 }}>上传新照片</DialogTitle>
        <DialogContent>
          {pendingFile && (
            <Box sx={{ height: 150, borderRadius: '20px', overflow: 'hidden', mb: 2, background: '#FFF9F0', boxShadow: 'inset 0 2px 5px rgba(120,80,100,.12)' }}>
              <SmartImage src={previewUrl} alt="待上传预览" />
            </Box>
          )}
          <TextField
            fullWidth
            label="写一句照片说明"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="例如：那天的晚霞特别温柔"
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setUploadOpen(false)}>取消</Button>
          <Button variant="contained" disabled={busy} onClick={() => void upload()} startIcon={<Upload size={18} strokeWidth={1.75} />}>
            {busy ? '上传中…' : '保存照片'}
          </Button>
        </DialogActions>
      </Dialog>

      <ImageViewer
        url={viewer?.url ?? null}
        caption={viewer?.caption}
        onClose={() => setViewer(null)}
      />
    </Box>
  );
}
