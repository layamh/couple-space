import React from 'react';
import ReactDOM from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import App from '@/App';
import { theme } from '@/theme';
import '@/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('找不到 #root 挂载节点');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);

// 仅生产环境注册 Service Worker；演示数据内置于 JS 包，因此离线也能完整展示。
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => undefined);
  });
}
