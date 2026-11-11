import banner1 from '@/assets/Banners grupo/1.png'
import banner2 from '@/assets/Banners grupo/2.png'
import banner3 from '@/assets/Banners grupo/3.png'
import banner4 from '@/assets/Banners grupo/4.png'
import banner5 from '@/assets/Banners grupo/5.png'
import joinBanner from '@/assets/Banners grupo/join-banner.jpg'
import sectionBanner1 from '@/assets/CHAT HABITOS GRUPO/1.png'
import sectionBanner2 from '@/assets/CHAT HABITOS GRUPO/2.png'
import sectionBanner3 from '@/assets/CHAT HABITOS GRUPO/3.png'
import sectionBanner4 from '@/assets/CHAT HABITOS GRUPO/4.png'
import sectionBanner5 from '@/assets/CHAT HABITOS GRUPO/5.png'
import sectionBanner6 from '@/assets/CHAT HABITOS GRUPO/6.png'
import windowBanner1 from '@/assets/Habitos Grupo/1.png'
import windowBanner2 from '@/assets/Habitos Grupo/2.png'
import windowBanner3 from '@/assets/Habitos Grupo/3.png'
import windowBanner4 from '@/assets/Habitos Grupo/4.png'
import windowBanner5 from '@/assets/Habitos Grupo/5.png'
import windowBanner6 from '@/assets/Habitos Grupo/6.png'

export const JOIN_GROUP_BANNER_URL = joinBanner

export interface GroupBannerTheme {
  id: string
  name: string
  color: string
  bannerUrl: string
  sectionBannerUrl: string
  windowBannerUrl: string
  filter?: string
}

export const GROUP_BANNER_THEMES: GroupBannerTheme[] = [
  {
    id: 'pink',
    name: 'Rosa Mágico',
    color: '#ec4899',
    bannerUrl: banner1,
    sectionBannerUrl: sectionBanner1,
    windowBannerUrl: windowBanner1,
    filter: 'hue-rotate(52deg) saturate(1.18) brightness(1.06)',
  },
  {
    id: 'purple',
    name: 'Noche Violeta',
    color: '#8b5cf6',
    bannerUrl: banner1,
    sectionBannerUrl: sectionBanner2,
    windowBannerUrl: windowBanner2,
  },
  {
    id: 'green',
    name: 'Bosque Esmeralda',
    color: '#22c55e',
    bannerUrl: banner2,
    sectionBannerUrl: sectionBanner3,
    windowBannerUrl: windowBanner3,
  },
  {
    id: 'amber',
    name: 'Sol Dorado',
    color: '#f5a524',
    bannerUrl: banner3,
    sectionBannerUrl: sectionBanner4,
    windowBannerUrl: windowBanner4,
  },
  {
    id: 'blue',
    name: 'Cielo Estelar',
    color: '#38bdf8',
    bannerUrl: banner4,
    sectionBannerUrl: sectionBanner5,
    windowBannerUrl: windowBanner5,
  },
  {
    id: 'red',
    name: 'Fuego Carmesí',
    color: '#f43f5e',
    bannerUrl: banner5,
    sectionBannerUrl: sectionBanner6,
    windowBannerUrl: windowBanner6,
  },
]

export function getGroupBannerTheme(color?: string): GroupBannerTheme {
  const normalized = (color ?? '').toLowerCase()
  return (
    GROUP_BANNER_THEMES.find((theme) => theme.color.toLowerCase() === normalized) ??
    GROUP_BANNER_THEMES[1]!
  )
}
