import { useEffect, useRef, useState } from 'react';
import { format, isSameDay, isToday, isYesterday, parseISO } from 'date-fns';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ImagePlus, Send, Smile } from 'lucide-react';
import { ImageViewer, SmartImage } from '@/components/Common';
import ClayIcon from '@/components/ClayIcon';
import { services } from '@/services';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { brand } from '@/theme';
import type { Message } from '@/types';

const EMOJIS = ['❤️', '💕', '🌸', '🐱', '🍰', '✨', '🥰', '🌷', '💗', '😘', '🌙', '🎉'];

/** 聊天页：文字/图片/表情消息，Realtime 增量按 id upsert。 */
export default function Chat() {
  const couple = useAppStore((state) => state.couple);
  const partner = useAppStore((state) => state.partner);
  const notify = useAppStore((state) => state.notify);
  const profile = useAuthStore((state) => state.profile);

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!couple) return;
    let cancelled = false;
    const unsubscribe = services.chat.subscribeMessages(couple.id, (message) => {
      setMessages((previous) => {
        const merged = new Map(previous.map((item) => [item.id, item]));
        merged.set(message.id, message);
        return [...merged.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
      });
    });
    void services.chat.listMessages(couple.id, 100).then((result) => {
      if (cancelled || result.error || !result.data) return;
      setMessages((previous) => {
        const merged = new Map(previous.map((item) => [item.id, item]));
        result.data.forEach((item) => merged.set(item.id, item));
        return [...merged.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [couple?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  if (!couple) return null;
  const myId = profile?.id ?? 'demo-user';

  function upsert(message: Message): void {
    setMessages((previous) => {
      const merged = new Map(previous.map((item) => [item.id, item]));
      merged.set(message.id, message);
      return [...merged.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
  }

  async function send(type: 'text' | 'emoji', content: string): Promise<void> {
    const trimmed = content.trim();
    if (!trimmed) return;
    setDraft('');
    setEmojiOpen(false);
    setSending(true);
    const result = await services.chat.sendMessage({ coupleId: couple!.id, type, content: trimmed });
    setSending(false);
    if (result.error || !result.data) {
      notify(result.error?.message ?? '发送失败', 'error');
      setDraft(trimmed);
      return;
    }
    upsert(result.data);
  }

  async function sendImage(file: File): Promise<void> {
    setSending(true);
    const uploaded = await services.chat.uploadImage(couple!.id, file);
    if (uploaded.error || !uploaded.data) {
      setSending(false);
      notify(uploaded.error?.message ?? '图片上传失败', 'error');
      return;
    }
    const result = await services.chat.sendMessage({
      coupleId: couple!.id,
      type: 'image',
      content: '',
      imageUrl: uploaded.data,
    });
    setSending(false);
    if (result.error || !result.data) {
      notify(result.error?.message ?? '发送失败', 'error');
      return;
    }
    upsert(result.data);
  }

  function dayLabel(value: string): string {
    const date = parseISO(value);
    if (isToday(date)) return '今天';
    if (isYesterday(date)) return '昨天';
    return format(date, 'M月d日 EEEE');
  }

  return (
    <Box
      sx={{
        height: 'calc(100vh - 152px)',
        minHeight: 440,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5, pb: 1 }}>
        {messages.length === 0 && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 8 }}>
            还没有消息，说句甜蜜的话开启聊天吧 ❤️
          </Typography>
        )}
        {messages.map((message, index) => {
          const mine = message.sender_id === myId;
          const previous = messages[index - 1];
          const showDate = !previous || !isSameDay(parseISO(previous.created_at), parseISO(message.created_at));
          return (
            <Box key={message.id}>
              {showDate && (
                <Box sx={{ textAlign: 'center', my: 1.75 }}>
                  <Box
                    component="span"
                    sx={{
                      px: 1.5,
                      py: 0.35,
                      borderRadius: '999px',
                      bgcolor: 'rgba(220,203,240,.4)',
                      color: brand.inkSoft,
                      fontSize: 11,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.7), 0 2px 0 #D8C6EC',
                    }}
                  >
                    {dayLabel(message.created_at)}
                  </Box>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', mb: 1.5, alignItems: 'flex-end', gap: 1 }}>
                {!mine && (
                  <Box sx={{ width: 30, height: 30, borderRadius: '12px', display: 'grid', placeItems: 'center', background: 'linear-gradient(145deg,#DCCBF0,#A98AD8)', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0, boxShadow: 'inset 0 2px 0 rgba(255,255,255,.4), 0 3px 0 #8F70BE, 0 5px 8px -3px rgba(120,80,100,.24)' }}>
                    {(partner?.nickname ?? 'TA').slice(0, 1)}
                  </Box>
                )}
                <Box sx={{ maxWidth: '76%' }}>
                  {message.type === 'image' && message.image_url ? (
                    <Box
                      onClick={() => setViewerUrl(message.image_url)}
                      className="clay-pressable"
                      sx={{ width: 180, height: 150, borderRadius: '20px', overflow: 'hidden', cursor: 'pointer', boxShadow: 'inset 0 2px 0 rgba(255,255,255,.8), 0 4px 0 #EFB9CD, 0 10px 16px -6px rgba(120,80,100,.22)' }}
                    >
                      <SmartImage src={message.image_url} alt="聊天图片" />
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        px: 1.6,
                        py: 1.1,
                        borderRadius: mine ? '20px 20px 8px 20px' : '20px 20px 20px 8px',
                        background: mine ? 'linear-gradient(145deg,#F7B4CC,#EC7FA6)' : 'linear-gradient(145deg,#FFFDFB,#FFF8F1)',
                        color: mine ? '#fff' : brand.ink,
                        fontSize: message.type === 'emoji' ? 30 : 14,
                        lineHeight: 1.55,
                        boxShadow: mine
                          ? 'inset 0 2px 0 rgba(255,255,255,.5), 0 4px 0 #D9668F, 0 10px 14px -6px rgba(233,131,168,.42)'
                          : 'inset 0 2px 0 rgba(255,255,255,.85), 0 4px 0 #EFB9CD, 0 10px 14px -6px rgba(120,80,100,.2)',
                        wordBreak: 'break-word',
                      }}
                    >
                      {message.content}
                    </Box>
                  )}
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.35, textAlign: mine ? 'right' : 'left', color: brand.inkSoft, fontSize: 10 }}>
                    {format(new Date(message.created_at), 'HH:mm')}
                  </Typography>
                </Box>
                {mine && (
                  <Box sx={{ width: 30, height: 30, borderRadius: '12px', display: 'grid', placeItems: 'center', background: 'linear-gradient(145deg,#F7B4CC,#EC7FA6)', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0, boxShadow: 'inset 0 2px 0 rgba(255,255,255,.4), 0 3px 0 #D9668F, 0 5px 8px -3px rgba(120,80,100,.24)' }}>
                    {(profile?.nickname ?? '我').slice(0, 1)}
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
        <div ref={endRef} />
      </Box>

      {emojiOpen && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0.5, background: 'linear-gradient(145deg,#FFFDFB,#FFF8F1)', borderRadius: '20px', p: 1.25, mb: 1, boxShadow: 'inset 0 2px 0 rgba(255,255,255,.85), 0 6px 0 #EFB9CD, 0 14px 20px -8px rgba(120,80,100,.24)' }}>
          {EMOJIS.map((emoji) => (
            <IconButton key={emoji} onClick={() => void send('emoji', emoji)} sx={{ fontSize: 22, py: 0.5 }}>
              {emoji}
            </IconButton>
          ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, background: '#FFF9F4', borderRadius: '999px', p: 0.85, boxShadow: 'inset 0 2px 5px rgba(120,80,100,.12), inset 0 -1px 0 rgba(255,255,255,.7), 0 4px 0 #EFB9CD, 0 10px 16px -6px rgba(120,80,100,.2)' }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void sendImage(file);
            event.target.value = '';
          }}
        />
        <IconButton aria-label="发送图片" onClick={() => fileRef.current?.click()} sx={{ p: 0 }}>
          <ClayIcon icon={ImagePlus} box={36} size={20} tone="lavender" />
        </IconButton>
        <IconButton aria-label="表情" onClick={() => setEmojiOpen(!emojiOpen)} sx={{ p: 0 }}>
          <ClayIcon icon={Smile} box={36} size={20} tone="pink" />
        </IconButton>
        <TextField
          fullWidth
          variant="standard"
          placeholder="说点什么…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void send('text', draft);
            }
          }}
          InputProps={{ disableUnderline: true, sx: { fontSize: 14 } }}
        />
        <IconButton
          aria-label="发送"
          disabled={sending || !draft.trim()}
          onClick={() => void send('text', draft)}
          sx={{
            background: 'linear-gradient(145deg,#F7B4CC,#EC7FA6)',
            color: '#fff',
            boxShadow: 'inset 0 2px 1px rgba(255,255,255,.5), 0 4px 0 #D9668F, 0 8px 12px -4px rgba(233,131,168,.5)',
            '&:active': { boxShadow: 'inset 0 2px 1px rgba(255,255,255,.5), 0 1px 0 #D9668F' },
            '&.Mui-disabled': { background: '#EBDCE4', color: '#B9A6B1', boxShadow: 'none' },
          }}
        >
          <Send size={20} strokeWidth={1.75} />
        </IconButton>
      </Box>

      <ImageViewer url={viewerUrl} onClose={() => setViewerUrl(null)} />
    </Box>
  );
}
