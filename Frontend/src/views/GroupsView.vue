<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue'
</script>

<template>
  <AppLayout>
    <div class="groups-header">
      <h1>👥 Mis Grupos de Hábitos</h1>
      <button class="create-btn">+ Crear Nuevo Grupo</button>
    </div>

    <div class="groups-grid">
      <div class="group-card">
        <div class="card-header">
          <h3>Grupo de demostración</h3>
          <span class="badge">Código: HABITOS-DEMO</span>
        </div>
        <p class="card-desc">Grupo de prueba sincronizado con la base de datos.</p>
        <div class="card-footer">
          <span class="status">🟢 Racha activa</span>
          <button class="view-btn">Ver Hábitos y Chat →</button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.groups-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

h1 {
  font-size: 1.75rem;
  color: #ffb86c;
  margin: 0;
}

.create-btn {
  background: #bd93f9;
  color: #121214;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
}

.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.group-card {
  background: #1e1e2f;
  border: 1px solid #383852;
  border-radius: 10px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.card-header h3 {
  margin: 0;
  color: #f8f8f2;
}

.badge {
  background: #282a36;
  border: 1px solid #6272a4;
  color: #8be9fd;
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.card-desc {
  color: #a0a0b2;
  font-size: 0.9rem;
  margin: 0;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #282a36;
  padding-top: 0.8rem;
}

.status {
  font-size: 0.85rem;
  color: #50fa7b;
}

.view-btn {
  background: transparent;
  color: #ff79c6;
  border: none;
  font-weight: 600;
  cursor: pointer;
}
</style>
