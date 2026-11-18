// Las fechas de hábitos se calculan en la zona del grupo, no en la del navegador.
function claveFecha(date = new Date(), timeZone = 'America/Bogota') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
const convertirAFecha = (key) => new Date(`${key}T00:00:00Z`)
const desplazarDia = (key, amount) =>
  new Date(convertirAFecha(key).getTime() + amount * 86400000).toISOString().slice(0, 10)
module.exports = { claveFecha, convertirAFecha, desplazarDia }
