import { useState, useRef, useEffect } from 'react';
import { Product } from '../types';
import { fileToBase64 } from '../../../utils/fileToBase64';
import { fetchGeoPrice } from '../../../lib/pricing/geoPricingClient';
import { getClientCountry } from '../../../lib/pricing/clientCountry';
import type { DynamicGeoPricePayload } from '../../../lib/pricing/geoPricingEngine';
import * as storageService from '../../../services/supabase/storage.service';

export interface UseEditProductProps {
  product: Product;
  onClose: () => void;
  onProductUpdated: (updates: Partial<Product>) => void;
}

export function useEditProduct({ product, onClose, onProductUpdated }: UseEditProductProps) {
  const [name, setName] = useState(product.name || '');
  const [sku, setSku] = useState(product.sku || '');
  const [title, setTitle] = useState(product.title || '');
  const [price, setPrice] = useState(product.price?.toString() || '');
  const [stock, setStock] = useState(product.stock?.toString() || '0');
  const [department, setDepartment] = useState(product.taxonomy?.department || '');
  const [category, setCategory] = useState(product.taxonomy?.category || '');
  const [subcategory, setSubcategory] = useState(product.taxonomy?.subcategory || '');
  const [productType, setProductType] = useState(product.taxonomy?.productType || '');
  const [productSeries, setProductSeries] = useState(product.taxonomy?.series || '');
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>(product.status || 'active');
  const [description, setDescription] = useState(product.description || '');
  
  const [files, setFiles] = useState<{ file?: File; url: string; isVideo: boolean }[]>(
    (product.mediaUrls || []).map(url => ({ 
      url, 
      isVideo: url.startsWith('data:video/') || url.endsWith('.mp4') || url.endsWith('.webm') 
    }))
  );
  
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [geoPreview, setGeoPreview] = useState<DynamicGeoPricePayload | null>(null);
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchGeoPreview = async () => {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        setGeoPreview(null);
        return;
      }
      setIsGeoLoading(true);
      try {
        const country = await getClientCountry();
        const result = await fetchGeoPrice(
          sku || product.id,
          parsedPrice,
          country.countryCode
        );
        setGeoPreview(result);
      } catch (err) {
        console.error('Geo pricing preview failed', err);
      } finally {
        setIsGeoLoading(false);
      }
    };
    const timeoutId = setTimeout(fetchGeoPreview, 500);
    return () => clearTimeout(timeoutId);
  }, [price, sku, product.id]);

  const handleFiles = async (newFiles: FileList | null) => {
    setErrorMsg('');
    if (!newFiles) return;
    setIsUploading(true);
    try {
      const addedFiles: { file: File; url: string; isVideo: boolean }[] = [];
      
      const promises = Array.from(newFiles).map(async (newFile) => {
        const isVideo = newFile.type.startsWith('video/');
        if (newFile.type.startsWith('image/') || isVideo) {
          const base64Url = await fileToBase64(newFile);
          addedFiles.push({
            file: newFile,
            url: base64Url,
            isVideo
          });
        }
      });
      
      await Promise.all(promises);
      if (addedFiles.length === 0) {
        setErrorMsg('Please upload valid photo or video files.');
        return;
      }
      setFiles(prev => [...prev, ...addedFiles]);
    } catch (err) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Failed to process media files.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const setAsThumbnail = (index: number) => {
    if (index === 0) return;
    setFiles(prev => {
      const newFiles = [...prev];
      const [item] = newFiles.splice(index, 1);
      newFiles.unshift(item);
      return newFiles;
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleSave = async () => {
    if (!title.trim() || !price) {
      setErrorMsg('Title and price are required.');
      return;
    }
    
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMsg('Please enter a valid price.');
      return;
    }
    const parsedStock = parseInt(stock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      setErrorMsg('Please enter a valid initial stock quantity.');
      return;
    }
    if (files.length === 0) {
      setErrorMsg('Please add at least one product media (photo/video).');
      return;
    }
    setIsUploading(true);
    try {
      const uploadedUrls = await Promise.all(
        files.map(async (f) => {
          if (f.file) {
            return await storageService.uploadMedia(f.file, { contentType: 'product' });
          }
          return f.url;
        })
      );
      onProductUpdated({
        sku,
        name,
        title,
        price: parsedPrice,
        stock: parsedStock,
        taxonomy: {
          department,
          category,
          subcategory,
          productType,
          series: productSeries,
        },
        status,
        description,
        mediaUrls: uploadedUrls
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'QuotaExceededError' || err.message.includes('quota')) {
          setErrorMsg('Storage limit reached. Please use smaller images or fewer videos.');
        } else {
          setErrorMsg(err.message);
        }
      } else {
        setErrorMsg('Failed to update product.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return {
    state: {
      name, sku, title, price, stock,
      department, category, subcategory, productType, productSeries,
      status, description, files,
      isUploading, errorMsg, geoPreview, isGeoLoading
    },
    refs: {
      fileInputRef
    },
    actions: {
      setName, setSku, setTitle, setPrice, setStock,
      setDepartment, setCategory, setSubcategory, setProductType, setProductSeries,
      setStatus, setDescription, setErrorMsg,
      handleFiles, setAsThumbnail, removeFile, handleSave
    }
  };
}
