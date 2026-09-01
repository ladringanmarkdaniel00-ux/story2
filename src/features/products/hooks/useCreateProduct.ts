import { useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react';
import { Product } from '../types';
import { fetchGeoPrice } from '../../../lib/pricing/geoPricingClient';
import { getClientCountry } from '../../../lib/pricing/clientCountry';
import type { DynamicGeoPricePayload } from '../../../lib/pricing/geoPricingEngine';
import * as storageService from '../../../services/supabase/storage.service';

export interface CreateProductProps {
  onClose: () => void;
  onProductCreated: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void> | void;
}

export interface MediaItem {
  id: string;
  file: File;
  previewUrl: string;
  isVideo: boolean;
}

export interface FormState {
  sku: string;
  name: string;
  title: string;
  price: string;
  stock: string;
  department: string;
  category: string;
  subcategory: string;
  productType: string;
  series: string;
  status: 'active' | 'draft' | 'archived';
  description: string;
}

const INITIAL_FORM: FormState = {
  sku: '',
  name: '',
  title: '',
  price: '',
  stock: '0',
  department: '',
  category: '',
  subcategory: '',
  productType: '',
  series: '',
  status: 'active',
  description: '',
};

const MAX_FILES = 8;
const MAX_IMAGE_SIZE_MB = 10;
const MAX_VIDEO_SIZE_MB = 50;

export function useCreateProduct({ onClose, onProductCreated }: CreateProductProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [geoPreview, setGeoPreview] = useState<DynamicGeoPricePayload | null>(null);
  const [isGeoLoading, setIsGeoLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaItemsRef = useRef<MediaItem[]>(mediaItems);
  mediaItemsRef.current = mediaItems;

  useEffect(() => {
    const fetchGeoPreview = async () => {
      const parsedPrice = parseFloat(form.price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        setGeoPreview(null);
        return;
      }

      setIsGeoLoading(true);
      try {
        const country = await getClientCountry();
        const result = await fetchGeoPrice(
          form.sku || 'PREVIEW_SKU',
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
  }, [form.price, form.sku]);

  useEffect(() => {
    return () => {
      mediaItemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (mediaItems.length + selectedFiles.length > MAX_FILES) {
      setErrorMsg(`You can upload a maximum of ${MAX_FILES} media files.`);
      return;
    }

    const newItems: MediaItem[] = [];
    const filesArray: File[] = Array.from(selectedFiles);

    for (const file of filesArray) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isVideo && !isImage) {
        setErrorMsg('Only valid image and video formats are supported.');
        continue;
      }

      const limit = isVideo ? MAX_VIDEO_SIZE_MB : MAX_IMAGE_SIZE_MB;
      if (file.size > limit * 1024 * 1024) {
        setErrorMsg(`"${file.name}" exceeds the ${limit}MB size limit.`);
        continue;
      }

      newItems.push({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        isVideo,
      });
    }

    setMediaItems((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const setAsThumbnail = (index: number) => {
    if (index === 0) return;
    setMediaItems((prev) => {
      const updated = [...prev];
      const [item] = updated.splice(index, 1);
      updated.unshift(item);
      return updated;
    });
  };

  const removeFile = (index: number) => {
    setMediaItems((prev) => {
      const updated = [...prev];
      const [removed] = updated.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return updated;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      setErrorMsg('Product title is required.');
      return;
    }

    const parsedPrice = parseFloat(form.price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMsg('Please enter a valid non-negative price.');
      return;
    }

    const parsedStock = parseInt(form.stock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      setErrorMsg('Please enter a valid non-negative stock quantity.');
      return;
    }

    if (mediaItems.length === 0) {
      setErrorMsg('Please upload at least one image or video.');
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedUrls = await Promise.all(
        mediaItems.map(async (item) => {
          return await storageService.uploadMedia(item.file, { contentType: 'product' });
        })
      );

      await onProductCreated({
        sku: form.sku.trim(),
        name: form.name.trim() || trimmedTitle,
        title: trimmedTitle,
        price: parsedPrice,
        stock: parsedStock,
        taxonomy: {
          department: form.department,
          category: form.category,
          subcategory: form.subcategory,
          productType: form.productType,
          series: form.series,
        },
        status: form.status,
        description: form.description.trim(),
        mediaUrls: uploadedUrls,
      });

      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    mediaItems,
    isSubmitting,
    errorMsg,
    geoPreview,
    isGeoLoading,
    fileInputRef,
    MAX_FILES,
    actions: {
      handleChange,
      handleFiles,
      setAsThumbnail,
      removeFile,
      handleSubmit,
    },
  };
}
