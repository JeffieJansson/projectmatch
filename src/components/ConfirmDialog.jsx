import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Reusable confirmation dialog.
 * `error` (optional) is shown inside the dialog, e.g. when the confirmed action failed.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
  loadingLabel = 'Deleting...',
  error = null,
  confirmDisabled = false,
  children = null,
  onConfirm,
  onCancel,
}) {
  const titleId   = useId();
  const messageId = useId();
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);

  // Keep the latest values available to the keydown listener without re-binding it
  const loadingRef  = useRef(loading);
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    loadingRef.current  = loading;
    onCancelRef.current = onCancel;
  });

  // Focus Cancel on open, restore previous focus on close
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    cancelRef.current?.focus();
    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open]);

  // Escape closes, Tab/Shift+Tab stay inside the dialog
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!loadingRef.current) onCancelRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
      if (focusable.length === 0) {
        // Everything is disabled (loading): keep focus on the dialog itself
        e.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      const inside = dialogRef.current.contains(document.activeElement);

      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget && !loading) onCancel?.();
  }

  return createPortal(
    <div style={s.overlay} onMouseDown={handleOverlayClick}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        tabIndex={-1}
        style={s.dialog}
      >
        <h2 id={titleId} style={s.title}>{title}</h2>
        <p id={messageId} style={s.message}>{message}</p>

        {children}

        {error && (
          <p role="alert" style={s.error}>{error}</p>
        )}

        <div style={s.actions}>
          <button
            ref={cancelRef}
            type="button"
            style={{ ...s.btn, ...s.cancelBtn, ...(loading ? s.btnDisabled : {}) }}
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            style={{
              ...s.btn,
              ...(danger ? s.dangerBtn : s.confirmBtn),
              ...(loading || confirmDisabled ? s.btnDisabled : {}),
            }}
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 2000,
    background: 'rgba(8, 4, 20, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    boxSizing: 'border-box',
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    background: '#160d2e',
    border: '1px solid rgba(139,92,246,0.25)',
    borderRadius: 20,
    padding: 24,
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    outline: 'none',
  },
  title: { margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' },
  message: { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#94a3b8', overflowWrap: 'anywhere' },
  error: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.5,
    color: '#fca5a5',
    background: 'rgba(248,113,113,0.1)',
    border: '1px solid rgba(248,113,113,0.3)',
    borderRadius: 10,
    padding: '10px 12px',
  },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  btn: {
    padding: '10px 18px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    border: '1.5px solid transparent',
  },
  cancelBtn: { background: '#1a1035', color: '#cbd5e1', border: '1.5px solid rgba(139,92,246,0.25)' },
  confirmBtn: { background: '#8b5cf6', color: '#fff' },
  dangerBtn: { background: '#dc2626', color: '#fff' },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
};
