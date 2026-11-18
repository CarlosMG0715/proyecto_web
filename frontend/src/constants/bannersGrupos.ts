import banner1 from '@/assets/group-banners/1.png'
import banner2 from '@/assets/group-banners/2.png'
import banner3 from '@/assets/group-banners/3.png'
import banner4 from '@/assets/group-banners/4.png'
import banner5 from '@/assets/group-banners/5.png'
import bannerUnirse from '@/assets/group-banners/banner-unirse.jpg'
import sectionBanner1 from '@/assets/group-chat/1.png'
import sectionBanner2 from '@/assets/group-chat/2.png'
import sectionBanner3 from '@/assets/group-chat/3.png'
import sectionBanner4 from '@/assets/group-chat/4.png'
import sectionBanner5 from '@/assets/group-chat/5.png'
import sectionBanner6 from '@/assets/group-chat/6.png'
import windowBanner1 from '@/assets/group-habits/1.png'
import windowBanner2 from '@/assets/group-habits/2.png'
import windowBanner3 from '@/assets/group-habits/3.png'
import windowBanner4 from '@/assets/group-habits/4.png'
import windowBanner5 from '@/assets/group-habits/5.png'
import windowBanner6 from '@/assets/group-habits/6.png'

export const URL_BANNER_UNIRSE = bannerUnirse

export interface TemaBannerGrupo {
  id: string
  name: string
  color: string
  urlBanner: string
  urlBannerSeccion: string
  urlBannerVentana: string
  filter?: string
}

export const TEMAS_BANNER_GRUPO: TemaBannerGrupo[] = [
  {
    id: 'pink',
    name: 'Rosa Mágico',
    color: '#ec4899',
    urlBanner: banner1,
    urlBannerSeccion: sectionBanner1,
    urlBannerVentana: windowBanner1,
    filter: 'hue-rotate(52deg) saturate(1.18) brightness(1.06)',
  },
  {
    id: 'purple',
    name: 'Noche Violeta',
    color: '#8b5cf6',
    urlBanner: banner1,
    urlBannerSeccion: sectionBanner2,
    urlBannerVentana: windowBanner2,
  },
  {
    id: 'green',
    name: 'Bosque Esmeralda',
    color: '#22c55e',
    urlBanner: banner2,
    urlBannerSeccion: sectionBanner3,
    urlBannerVentana: windowBanner3,
  },
  {
    id: 'amber',
    name: 'Sol Dorado',
    color: '#f5a524',
    urlBanner: banner3,
    urlBannerSeccion: sectionBanner4,
    urlBannerVentana: windowBanner4,
  },
  {
    id: 'blue',
    name: 'Cielo Estelar',
    color: '#38bdf8',
    urlBanner: banner4,
    urlBannerSeccion: sectionBanner5,
    urlBannerVentana: windowBanner5,
  },
  {
    id: 'red',
    name: 'Fuego Carmesí',
    color: '#f43f5e',
    urlBanner: banner5,
    urlBannerSeccion: sectionBanner6,
    urlBannerVentana: windowBanner6,
  },
]

export function obtenerTemaBannerGrupo(color?: string): TemaBannerGrupo {
  const normalized = (color ?? '').toLowerCase()
  return (
    TEMAS_BANNER_GRUPO.find(
      (theme) => theme.color.toLowerCase() === normalized,
    ) ?? TEMAS_BANNER_GRUPO[1]!
  )
}
