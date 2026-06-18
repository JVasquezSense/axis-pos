"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Error en la aplicación</h1>
          <p style={{ color: "#64748b", marginTop: 8 }}>Ocurrió un fallo crítico. Recarga para continuar.</p>
          <button
            onClick={reset}
            style={{ marginTop: 20, padding: "10px 20px", borderRadius: 10, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 600, cursor: "pointer" }}
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  );
}
