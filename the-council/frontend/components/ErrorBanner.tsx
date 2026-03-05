"use client";

interface ErrorBannerProps {
  message: string | null;
  onDismiss?: () => void;
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start justify-between gap-3">
      <span>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-red-400 hover:text-red-600 transition-colors font-bold leading-none"
          aria-label="Dismiss error"
        >
          &times;
        </button>
      )}
    </div>
  );
}
