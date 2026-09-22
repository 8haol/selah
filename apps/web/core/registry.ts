import { worshipSlidesManifest } from '@/modules/worship-slides/manifest'

export interface ModuleManifest {
  id: string
  name: string
  description: string
  href: string
  icon: 'music' | 'calendar' | 'ticket' | 'book'
  status: 'ready' | 'soon'
}

export const MODULES: ModuleManifest[] = [
  worshipSlidesManifest,
  { id: 'rota', name: '服事排班', description: '按事工排每周服事人员，冲突提醒。', href: '#', icon: 'calendar', status: 'soon' },
  { id: 'passport', name: 'Life Passport', description: '迎新活动电子护照游戏平台。', href: '#', icon: 'ticket', status: 'soon' },
]
