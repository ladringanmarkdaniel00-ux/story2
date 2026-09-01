import { Product } from '../../types';

interface DeleteProductModalProps {
  product: Product;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export function DeleteProductModal({
  product,
  onClose,
  onConfirm,
}: DeleteProductModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
        <h3 id="delete-modal-title" className="text-xl font-bold text-neutral-900 mb-2">
          Delete Product
        </h3>
        <p className="text-neutral-600 mb-6 text-sm leading-relaxed">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-neutral-900">{product.title || product.name}</span>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 font-medium text-sm text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(product.id)}
            className="px-5 py-2.5 font-medium text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
