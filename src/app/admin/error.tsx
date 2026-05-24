"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md px-6">
        <p className="text-5xl mb-4">🔧</p>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Error en administración
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Ha ocurrido un error al cargar el panel de administración.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4 font-mono">Ref: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
