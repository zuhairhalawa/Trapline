import { useEffect, useRef } from 'react';

export function About({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        e.preventDefault(); // single focusable control inside the dialog
        closeRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="about-title">About TRAPLINE</h2>
        <p>
          TRAPLINE is fictional, security-themed puzzle entertainment. The intruder, honeypot and vault are game pieces on a
          miniature board; nothing here touches a real network, account or file, and it teaches no real attack technique.
        </p>
        <p>
          This is an unreleased playable slice (Stage A2.1) with three levels. Progress and the sound setting are kept only in this
          browser's local storage. There is no account, analytics, advertising or network save. The title-screen picture is
          generated concept art, not gameplay; its licence and public-release approval are still to be decided.
        </p>
        <button ref={closeRef} className="btn primary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}