import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta mensagens globais de debug sem derrubar a aplicação.
 */
export const DebugErrorThrower = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        setMessage(detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  useEffect(() => {
    if (message) {
      console.warn("Mensagem de debug recebida:", message);
      setMessage(null);
    }
  }, [message]);

  return null;
};
