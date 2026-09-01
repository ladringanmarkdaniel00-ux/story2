import React from 'react';
import { useEditProduct, UseEditProductProps } from '../../hooks/useEditProduct';
import { ProductFormView } from './ProductFormView';
import { Product } from '../../types';

export function EditProduct(props: UseEditProductProps & {
  departments?: string[];
  categories?: string[];
  subcategories?: string[];
  productTypes?: string[];
  series?: string[];
}) {
  const { state, refs, actions } = useEditProduct({
    product: props.product,
    onClose: props.onClose,
    onProductUpdated: props.onProductUpdated
  });

  return (
    <ProductFormView
      mode="edit"
      onClose={props.onClose}
      onSubmit={actions.handleSave}
      isSubmitting={state.isUploading}
      name={state.name} onChangeName={(e) => actions.setName(e.target.value)}
      description={state.description} onChangeDescription={(e) => actions.setDescription(e.target.value)}
      price={state.price} onChangePrice={(e) => actions.setPrice(e.target.value)}
      stock={state.stock} onChangeStock={(e) => actions.setStock(e.target.value)}
      sku={state.sku} onChangeSku={(e) => actions.setSku(e.target.value)}
      department={state.department} category={state.category} subcategory={state.subcategory} productType={state.productType}
      departments={props.departments ?? []} 
      categories={props.categories ?? []} 
      subcategories={props.subcategories ?? []} 
      productTypes={props.productTypes ?? []}
      onChangeTaxonomy={(e) => {
        const { name, value } = e.target;
        if (name === 'department') actions.setDepartment(value);
        if (name === 'category') actions.setCategory(value);
        if (name === 'subcategory') actions.setSubcategory(value);
        if (name === 'productType') actions.setProductType(value);
      }}
      mediaItems={state.files.map(f => ({ url: f.url, isVideo: f.isVideo }))} 
      fileInputRef={refs.fileInputRef}
      onFilesChange={actions.handleFiles} onRemoveFile={actions.removeFile} onSetThumbnail={actions.setAsThumbnail}
      isGeoLoading={state.isGeoLoading} geoPreview={state.geoPreview}
    />
  );
}
