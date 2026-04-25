import { Component, ReactNode } from "react";

/**
 * DebugErrorBoundary
 *
 * Captura erros lançados pelo DebugErrorThrower (intencional) para que o
 * restante do aplicativo continue renderizando normalmente. Não altera o
 * comportamento do DebugErrorThrower — apenas evita que a tela fique em branco.
 */
interface State {
  hasError: boolean;
}

export class DebugErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Loga apenas — o erro é intencional (debug tool da Lovable).
    console.warn("[DebugErrorBoundary] Erro de debug capturado:", error.message);
  }

  render() {
    // Sempre renderiza nada para esta sub-árvore; o app principal segue normal.
    return this.state.hasError ? null : this.props.children;
  }
}
