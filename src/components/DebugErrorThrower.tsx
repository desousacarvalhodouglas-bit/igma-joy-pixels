import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Sem UI. Escuta o evento global "lovable-debug-error" e dispara um Error
 * de forma ASSÍNCRONA (via setTimeout) para que ele seja capturado pelo
 * window.onerror / overlay da Lovable, SEM destruir a árvore React.
 *
 * Antes lançávamos durante o render, o que deixava a tela em branco até a
 * próxima edição. Esta versão mantém o "Try to Fix" funcional e preserva a
 * UI visível.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail !== "string" || detail.length === 0) return;
      // Throw fora do ciclo de render — bubbla para window.onerror
      setTimeout(() => {
        throw new Error(detail);
      }, 0);
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};
