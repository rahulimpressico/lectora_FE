import { useEffect } from 'react';

/**
 * Locks body scroll and closes the modal on Escape key press.
 * @param onClose - callback invoked when Escape is pressed
 */
export function useModalEscape(onClose: () => void): void {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handler);
    };
  }, [onClose]);
}
