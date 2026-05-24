"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md px-6">
        <p className="text-5xl mb-4">🩻</p>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Error en el panel
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Ha ocurrido un error al cargar esta sección. Tus datos están seguros.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4 font-mono">Ref: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Reintentar
          </button>
          <a
            href="/dashboard"
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
