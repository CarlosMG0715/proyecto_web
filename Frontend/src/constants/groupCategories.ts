import type { IconName } from '@/components/ui/AppIcon.vue'

export interface GroupCategoryOption {
  label: string
  icon: IconName
  defaultHabit: string
}

export const GROUP_CATEGORIES: GroupCategoryOption[] = [
  { label: 'Programación', icon: 'code', defaultHabit: 'Avanzar en programación' },
  { label: 'Ejercicio', icon: 'activity', defaultHabit: 'Entrenamiento diario' },
  { label: 'Lectura', icon: 'globe', defaultHabit: 'Lectura diaria' },
  { label: 'Estudio', icon: 'monitor', defaultHabit: 'Sesión de estudio' },
  { label: 'Salud', icon: 'heart', defaultHabit: 'Hábito de bienestar' },
  { label: 'Otro', icon: 'target', defaultHabit: 'Meta del equipo' },
]
