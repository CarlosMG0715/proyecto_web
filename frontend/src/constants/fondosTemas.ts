import bgLavanda from '@/assets/theme-backgrounds/1.png'
import bgVolcan from '@/assets/theme-backgrounds/2.png'
import bgLaguna from '@/assets/theme-backgrounds/3.png'
import bgGlaciar from '@/assets/theme-backgrounds/4.png'
import bgAnochecer from '@/assets/theme-backgrounds/5.png'
import bgFresa from '@/assets/theme-backgrounds/6.png'
import bgAtardecer from '@/assets/theme-backgrounds/7.png'
import bgBosque from '@/assets/theme-backgrounds/8.png'

export const FONDOS_TEMAS: Record<string, string> = {
  sprout: bgLavanda,
  red: bgVolcan,
  cap: bgLaguna,
  pilot: bgGlaciar,
  royal: bgAnochecer,
  pink: bgFresa,
  fox: bgAtardecer,
  music: bgBosque,
}

export function obtenerFondoTema(idTema?: string): string {
  return (idTema && FONDOS_TEMAS[idTema]) || bgLavanda
}
