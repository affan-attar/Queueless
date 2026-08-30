export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  error = '',
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
      <div className="card w-full max-w-sm p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-paper">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-500">{description}</p>

        {error && (
          <p className="mt-3 text-sm text-signal-stop">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Joining...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}