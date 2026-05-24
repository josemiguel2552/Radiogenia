"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="antialiased bg-gray-950 text-white flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md px-6">
          <p className="text-6xl mb-4">⚠️</p>
          <h1 className="text-xl font-bold mb-2">Algo salió mal</h1>
          <p className="text-sm text-gray-400 mb-6">
            Ha ocurrido un error inesperado. Puedes intentar recargar la página o contactar con soporte si el problema persiste.
          </p>
          {error.digest && (
            <p className="text-xs text-gray-600 mb-4 font-mono">Ref: {error.digest}</p>
          )}
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
