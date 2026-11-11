// composable de cuenta regresiva; crea el intervalo al montar y lo limpia al desmontar.
import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Cuenta regresiva hasta las 00:00 de Colombia, igual en local y en Render.
 */
export function useMidnightCountdown() {
  const hours = ref(0)
  const minutes = ref(0)
  const seconds = ref(0)
  const calendar = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  })
  function dateKey(now: Date): string {
    const parts = calendar.formatToParts(now)
    return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-')
  }
  const dayKey = ref(dateKey(new Date()))
  let timer: number | undefined
  const colombiaClock = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  function tick(): void {
    // El reloj usa la zona de Colombia aunque el navegador o servidor tenga otra zona horaria.
    const now = new Date()
    dayKey.value = dateKey(now)
    const parts = colombiaClock.formatToParts(now)
    const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value ?? 0)
    const elapsed = part('hour') * 3600 + part('minute') * 60 + part('second')
    const remaining = elapsed === 0 ? 24 * 3600 : 24 * 3600 - elapsed
    hours.value = Math.floor(remaining / 3600)
    minutes.value = Math.floor((remaining % 3600) / 60)
    seconds.value = remaining % 60
  }

  onMounted(() => {
    tick()
    timer = window.setInterval(tick, 1000)
  })

  onUnmounted(() => {
    if (timer !== undefined) window.clearInterval(timer)
  })

  return { hours, minutes, seconds, dayKey }
}
