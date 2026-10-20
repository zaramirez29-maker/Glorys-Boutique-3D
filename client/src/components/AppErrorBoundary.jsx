import React from 'react';

export class AppErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Error de renderizado en Glory\'s Boutique:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="app-error" role="alert">
          <section className="app-error-card">
            <h1>No se pudo cargar esta pantalla</h1>
            <p>Ocurrió un error al mostrar el sistema. Recarga la página; si continúa, comparte este mensaje con soporte.</p>
            <pre>{this.state.error.message || 'Error inesperado de la interfaz.'}</pre>
            <button type="button" onClick={() => window.location.reload()}>Recargar página</button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
