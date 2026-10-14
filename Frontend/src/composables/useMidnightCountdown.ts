import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Cuenta regresiva hasta las 00:00 (hora en la que corre el cron job de cierre del día).
 */
export function useMidnightCountdown() {
  const hours = ref(0)
  const minutes = ref(0)
  const seconds = ref(0)
  let timer: number | undefined

  function tick(): void {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    const diff = Math.max(0, midnight.getTime() - now.getTime())
    hours.value = Math.floor(diff / 3_600_000)
    minutes.value = Math.floor((diff % 3_600_000) / 60_000)
    seconds.value = Math.floor((diff % 60_000) / 1000)
  }

  onMounted(() => {
    tick()
    timer = window.setInterval(tick, 1000)
  })

  onUnmounted(() => {
    if (timer !== undefined) window.clearInterval(timer)
  })

  return { hours, minutes, seconds }
}
