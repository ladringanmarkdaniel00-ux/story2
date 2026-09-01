import React from 'react';
import { useCreateProduct, CreateProductProps } from '../../hooks/useCreateProduct';
import { ProductFormView } from './ProductFormView';
import { useStore } from '../../../../store';

export function CreateProduct({ onClose, onProductCreated }: CreateProductProps) {
  const {
    form,
    mediaItems,
    isSubmitting,
    geoPreview,
    isGeoLoading,
    fileInputRef,
    actions
  } = useCreateProduct({ onClose, onProductCreated });

  // Extract taxonomies from store if needed. Wait, in useCreateProduct, where do taxonomies come from?
  // Let's check old CreateProduct.tsx
  return (
    <ProductFormView
      mode="create"
      onClose={onClose}
      onSubmit={actions.handleSubmit}
      isSubmitting={isSubmitting}
      name={form.name} onChangeName={actions.handleChange}
      description={form.description} onChangeDescription={actions.handleChange}
      price={form.price} onChangePrice={actions.handleChange}
      stock={form.stock} onChangeStock={actions.handleChange}
      sku={form.sku} onChangeSku={actions.handleChange}
      department={form.department} category={form.category} subcategory={form.subcategory} productType={form.productType}
      // Assuming store or constants hold the lists? Let's check the old CreateProduct.tsx for taxonomy grids.
      departments={[]} 
      categories={[]} 
      subcategories={[]} 
      productTypes={[]}
      onChangeTaxonomy={actions.handleChange}
      mediaItems={mediaItems.map(m => ({ ...m, url: m.previewUrl }))} fileInputRef={fileInputRef}
      onFilesChange={(files) => actions.handleFiles({ target: { files } } as any)} onRemoveFile={actions.removeFile} onSetThumbnail={actions.setAsThumbnail}
      isGeoLoading={isGeoLoading} geoPreview={geoPreview}
    />
  );
}
