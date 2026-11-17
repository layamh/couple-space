import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from '@/components/Layout';
import { PairRoute, ProtectedRoute } from '@/components/ProtectedRoute';
import Album from '@/pages/Album';
import Anniversary from '@/pages/Anniversary';
import Chat from '@/pages/Chat';
import Home from '@/pages/Home';
import Location from '@/pages/Location';
import Login from '@/pages/Login';
import Mine from '@/pages/Mine';
import Pairing from '@/pages/Pairing';
import Pet from '@/pages/Pet';
import Settings from '@/pages/Settings';
import Whispers from '@/pages/Whispers';
import Wishlist from '@/pages/Wishlist';

/** 12 条路由：Login/Pairing 独立全屏，其余在 ProtectedRoute + Layout 下。 */
export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<PairRoute />}>
          <Route path="/pairing" element={<Pairing />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="chat" element={<Chat />} />
            <Route path="album" element={<Album />} />
            <Route path="pet" element={<Pet />} />
            <Route path="mine" element={<Mine />} />
            <Route path="anniversary" element={<Anniversary />} />
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="whispers" element={<Whispers />} />
            <Route path="location" element={<Location />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
