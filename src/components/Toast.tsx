interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="toast-enter pointer-events-none fixed bottom-6 left-1/2 z-50 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg"
    >
      {message}
    </div>
  );
}
