import { useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { Images, Package } from 'lucide-react';
import { EmptyState, ImageViewer, SectionCard } from '@/components/Common';
import { AssetThumb, PetImage } from '@/pages/pet/PetAsset';
import { brand } from '@/theme';
import type { PetInventory, PetItem, Postcard } from '@/types';

/** 图鉴 Tab：明信片收集网格、稀有标签、大图预览与土特产库存。 */
export default function PetAlbum({
  postcards,
  inventory,
  items,
}: {
  postcards: Postcard[];
  inventory: PetInventory[];
  items: PetItem[];
}) {
  const [viewer, setViewer] = useState<string | null>(null);
  const [viewerName, setViewerName] = useState('');
  const souvenirs = inventory.filter((entry) => items.find((item) => item.key === entry.item_key)?.category === 'souvenir' && entry.quantity > 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <SectionCard title="旅行明信片" subtitle={`已收集 ${postcards.reduce((sum, card) => sum + card.count, 0)} 张 · ${postcards.length} 个地点`} icon={<Images size={20} strokeWidth={1.75} />}>
        {postcards.length === 0 ? (
          <EmptyState icon={<Images size={24} strokeWidth={1.75} />} title="还没有明信片" description="让布丁出门旅行，它就会寄明信片回来啦" />
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.25 }}>
            {postcards.map((card) => {
              const item = items.find((entry) => entry.key === card.postcard_key);
              const rare = card.rarity === 'rare';
              return (
                <Box
                  key={card.id}
                  onClick={() => {
                    setViewer(item?.asset_path ? `${import.meta.env.BASE_URL}${item.asset_path}` : null);
                    setViewerName(item?.name ?? '旅行明信片');
                  }}
                  sx={{
                    p: 0.75,
                    borderRadius: '16px',
                    cursor: 'zoom-in',
                    bgcolor: '#FFFDFB',
                    border: rare ? `2px solid #E8B45F` : '1px solid rgba(196,174,232,.22)',
                    boxShadow: rare ? '0 0 16px rgba(232,180,95,.28)' : '0 3px 12px rgba(120,80,100,.1)',
                  }}
                >
                  <Box sx={{ borderRadius: '12px', overflow: 'hidden', aspectRatio: '4 / 3' }}>
                    <PetImage group="postcard" assetKey={card.postcard_key} alt={item?.name ?? card.postcard_key} fit="cover" style={{ width: '100%', height: '100%' }} />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, flex: 1, fontSize: 11 }}>{item?.name ?? card.postcard_key}</Typography>
                    {rare && <Chip size="small" label="稀有" sx={{ height: 18, fontSize: 9, bgcolor: '#FFF0C9', color: '#B8862E' }} />}
                    {card.count > 1 && <Chip size="small" label={`×${card.count}`} sx={{ height: 18, fontSize: 9 }} />}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </SectionCard>

      <SectionCard title="土特产" subtitle="旅行带回的小礼物" icon={<Package size={20} strokeWidth={1.75} />}>
        {souvenirs.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>还没有土特产</Typography>
        ) : (
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {souvenirs.map((entry) => (
              <Box key={entry.id} sx={{ width: 84, textAlign: 'center' }}>
                <AssetThumb><PetImage group="item" assetKey="souvenir_parcel" alt="土特产" style={{ width: '86%', height: '86%' }} /></AssetThumb>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontSize: 10 }}>
                  {items.find((item) => item.key === entry.item_key)?.name ?? entry.item_key} ×{entry.quantity}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </SectionCard>

      <ImageViewer url={viewer} caption={viewerName} onClose={() => setViewer(null)} />
    </Box>
  );
}
