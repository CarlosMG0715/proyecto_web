<script setup lang="ts">
// Layout para vistas de autenticación (Login, Registro)
</script>

<template>
  <div class="auth-layout">
    <div class="auth-card">
      <header class="auth-header">
        <h1>🔥 Hábitos Grupales</h1>
        <p class="subtitle">Monitor de hábitos con detección de deserción</p>
      </header>
      <main class="auth-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e1e2f 0%, #11111b 100%);
  color: #f5f5f7;
  padding: 1.5rem;
  font-family: system-ui, -apple-system, sans-serif;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: #27273a;
  border: 1px solid #383852;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
}

.auth-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.auth-header h1 {
  font-size: 1.75rem;
  margin: 0;
  color: #ffb86c;
}

.subtitle {
  color: #a0a0b2;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.auth-content {
  display: flex;
  flex-direction: column;
}
</style>
