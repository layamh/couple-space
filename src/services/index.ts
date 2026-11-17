import type { CoupleServices } from '@/services/contracts';
import { createMockServices } from '@/services/mock';
import { createRealServices } from '@/services/real';

/** 唯一的模式判定入口：任一环境变量缺失即进入演示模式。 */
export const isDemoMode =
  !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

/** 全局服务单例：上层页面、组件、store 只依赖此抽象接口。 */
export const services: CoupleServices = isDemoMode
  ? createMockServices()
  : createRealServices();

export * from '@/services/contracts';
