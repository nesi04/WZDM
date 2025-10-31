// src/components/ui/Modal.tsx
"use client";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

      {/* Panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-3xl rounded-lg bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </DialogTitle>
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable content area */}
          <div className="max-h-[75vh] overflow-y-auto p-4">
            {children}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
