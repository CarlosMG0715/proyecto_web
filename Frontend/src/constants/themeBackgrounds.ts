import bgLavanda from '@/assets/Fondo tema/1.png'
import bgVolcan from '@/assets/Fondo tema/2.png'
import bgLaguna from '@/assets/Fondo tema/3.png'
import bgGlaciar from '@/assets/Fondo tema/4.png'
import bgAnochecer from '@/assets/Fondo tema/5.png'
import bgFresa from '@/assets/Fondo tema/6.png'
import bgAtardecer from '@/assets/Fondo tema/7.png'
import bgBosque from '@/assets/Fondo tema/8.png'

export const THEME_BACKGROUNDS: Record<string, string> = {
  sprout: bgLavanda,
  red: bgVolcan,
  cap: bgLaguna,
  pilot: bgGlaciar,
  royal: bgAnochecer,
  pink: bgFresa,
  fox: bgAtardecer,
  music: bgBosque,
}

export function getThemeBackground(themeId?: string): string {
  return (themeId && THEME_BACKGROUNDS[themeId]) || bgLavanda
}
