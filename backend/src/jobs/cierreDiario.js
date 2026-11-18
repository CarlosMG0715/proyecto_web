const { cerrarGruposDelDia } = require('../services/servicioCierreDiario')
let running = false
// Comprueba el cambio de fecha cada minuto; recupera cierres pendientes al arrancar.
function iniciarCierreDiario() {
  async function run() {
    if (running) return
    running = true
    try {
      await cerrarGruposDelDia()
    } catch (error) {
      console.error('Cierre diario:', error.message)
    } finally {
      running = false
    }
  }
  void run()
  const timer = setInterval(run, 60000)
  return () => clearInterval(timer)
}
module.exports = { iniciarCierreDiario }
