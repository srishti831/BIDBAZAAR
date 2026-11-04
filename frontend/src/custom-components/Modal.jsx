import React, { useEffect } from "react";
import { X } from "lucide-react";

const Modal = ({ open, onClose, title, children, width = "max-w-lg" }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-ink-950/80 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`panel rise relative w-full ${width} bg-ink-800 p-6 shadow-2xl`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-dim hover:bg-ink-600 hover:text-fg"
        >
          <X size={18} />
        </button>
        {title && <h2 className="mb-4 pr-8 text-xl font-bold">{title}</h2>}
        {children}
      </div>
    </div>
  );
};

export default Modal;
