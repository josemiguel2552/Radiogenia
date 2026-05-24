import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="text-center max-w-md px-6">
        <p className="text-7xl font-bold text-gray-200 dark:text-gray-800 mb-2">404</p>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Página no encontrada
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          La página que buscas no existe o ha sido movida.
        </p>
        <Link
          href="/"
          className="inline-flex px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
