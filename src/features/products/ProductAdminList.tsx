import { Product } from './types';
import { ImageIcon, Edit2, Trash2 } from 'lucide-react';

interface ProductAdminListProps {
  products: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  archived: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  draft: 'bg-amber-100 text-amber-800 border-amber-200',
};

function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return (
    cleanUrl.startsWith('data:video/') ||
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.mov')
  );
}

export function ProductAdminList({ products, onEdit, onDelete }: ProductAdminListProps) {
  if (products.length === 0) {
    return (
      <div className="w-full bg-white border border-neutral-200 rounded-xl p-12 text-center text-neutral-500 shadow-sm">
        <p className="text-sm font-medium">No products available</p>
        <p className="text-xs text-neutral-400 mt-1">Add a new product to see it listed here.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-neutral-600">
          <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-900 font-medium whitespace-nowrap">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Media</th>
              <th scope="col" className="px-4 py-3 font-medium">SKU</th>
              <th scope="col" className="px-4 py-3 font-medium">Product</th>
              <th scope="col" className="px-4 py-3 font-medium">Price</th>
              <th scope="col" className="px-4 py-3 font-medium">Stock</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Taxonomy</th>
              <th scope="col" className="px-4 py-3 font-medium">Type</th>
              <th scope="col" className="px-4 py-3 font-medium">Series</th>
              <th scope="col" className="px-4 py-3 font-medium">Description</th>
              <th scope="col" className="px-4 py-3 font-medium">Created</th>
              <th scope="col" className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {products.map((product) => {
              const primaryMedia = product.mediaUrls?.[0];
              const isVideo = isVideoUrl(primaryMedia);
              const statusClass = STATUS_STYLES[product.status || 'draft'] || STATUS_STYLES.draft;

              return (
                <tr key={product.id} className="hover:bg-neutral-50/70 transition-colors">
                  {/* Media Thumbnail */}
                  <td className="px-4 py-3">
                    {primaryMedia ? (
                      isVideo ? (
                        <video
                          src={primaryMedia}
                          className="w-10 h-10 object-cover rounded-md border border-neutral-200 bg-neutral-900"
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={primaryMedia}
                          alt={product.title}
                          className="w-10 h-10 object-cover rounded-md border border-neutral-200 bg-neutral-50"
                        />
                      )
                    ) : (
                      <div className="w-10 h-10 bg-neutral-100 rounded-md border border-neutral-200 flex items-center justify-center text-neutral-400">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}
                  </td>

                  {/* SKU */}
                  <td className="px-4 py-3 font-mono text-xs text-neutral-600">
                    {product.sku || '-'}
                  </td>

                  {/* Title & Name */}
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="font-medium text-neutral-900 truncate" title={product.title}>
                      {product.title}
                    </div>
                    {product.name && (
                      <div className="text-xs text-neutral-500 truncate" title={product.name}>
                        {product.name}
                      </div>
                    )}
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3 font-medium text-neutral-900 whitespace-nowrap">
                    ₱{Number(product.price || 0).toFixed(2)}
                  </td>

                  {/* Stock */}
                  <td className="px-4 py-3 tabular-nums">
                    {product.stock ?? 0}
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${statusClass}`}>
                      {product.status || 'draft'}
                    </span>
                  </td>

                  {/* Taxonomy */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col text-xs space-y-0.5">
                      {product.taxonomy?.department && (
                        <span className="text-neutral-900 font-medium">{product.taxonomy?.department}</span>
                      )}
                      {product.taxonomy?.category && (
                        <span className="text-neutral-600">
                          {product.taxonomy?.department ? '↳ ' : ''}{product.taxonomy?.category}
                        </span>
                      )}
                      {product.taxonomy?.subcategory && (
                        <span className="text-neutral-400">
                          {(product.taxonomy?.department || product.taxonomy?.category) ? '↳ ' : ''}{product.taxonomy?.subcategory}
                        </span>
                      )}
                      {!product.taxonomy?.department && !product.taxonomy?.category && !product.taxonomy?.subcategory && (
                        <span className="text-neutral-400">-</span>
                      )}
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3 text-neutral-700 whitespace-nowrap">
                    {product.taxonomy?.productType || '-'}
                  </td>

                  {/* Series */}
                  <td className="px-4 py-3 text-neutral-700 whitespace-nowrap">
                    {product.taxonomy?.series || '-'}
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3 max-w-[240px]">
                    <div className="truncate text-xs text-neutral-500" title={product.description}>
                      {product.description || '-'}
                    </div>
                  </td>

                  {/* Created Date */}
                  <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">
                    {new Date(product.createdAt).toLocaleDateString()}
                  </td>

                  {/* Row Actions */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(product)}
                          aria-label={`Edit ${product.title}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(product)}
                          aria-label={`Delete ${product.title}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProductAdminList;
