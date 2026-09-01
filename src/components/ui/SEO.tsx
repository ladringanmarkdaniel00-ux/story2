/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  schema?: Record<string, unknown>;
}

const DEFAULT_TITLE = 'DAN - Darlingan';
const DEFAULT_DESCRIPTION = 'Explore curated stories, visual posts, and artisan products on DAN Darlingan.';

export function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  image = '/og-image.jpg',
  url = typeof window !== 'undefined' ? window.location.href : 'https://dan.app',
  type = 'website',
  schema,
}: SEOProps) {
  useEffect(() => {
    // 1. Title
    document.title = title.includes('DAN') ? title : `${title} | DAN`;

    // 2. Standard Meta Tags
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    // 3. OpenGraph
    const ogTags: Record<string, string> = {
      'og:title': title,
      'og:description': description,
      'og:type': type,
      'og:url': url,
      'og:image': image,
    };

    Object.entries(ogTags).forEach(([property, content]) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    });

    // 4. JSON-LD Schema
    if (schema) {
      let script = document.querySelector('#seo-structured-data');
      if (!script) {
        script = document.createElement('script');
        script.id = 'seo-structured-data';
        script.setAttribute('type', 'application/ld+json');
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(schema);
    }
  }, [title, description, image, url, type, schema]);

  return null;
}
