/**
 * Image Optimization Utilities
 * Handles responsive images, lazy loading, and format conversion
 */

import React, { useState, useEffect } from 'react';

/**
 * Check if WebP is supported
 */
let webpSupported = null;

export function isWebPSupported() {
  if (webpSupported !== null) return webpSupported;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  webpSupported = canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
  return webpSupported;
}

/**
 * Check if AVIF is supported
 */
let avifSupported = null;

export function isAVIFSupported() {
  if (avifSupported !== null) return avifSupported;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  avifSupported = canvas.toDataURL('image/avif') !== canvas.toDataURL('image/png');
  return avifSupported;
}

/**
 * Generate image URL with format preference
 */
export function getOptimalImageUrl(baseUrl, options = {}) {
  const {
    width = null,
    height = null,
    quality = 80,
    format = null,
  } = options;

  if (!baseUrl) return '';

  // Determine best format
  let finalFormat = format;
  if (!finalFormat) {
    if (isAVIFSupported()) {
      finalFormat = 'avif';
    } else if (isWebPSupported()) {
      finalFormat = 'webp';
    } else {
      finalFormat = 'auto';
    }
  }

  // Build optimization params
  const params = new URLSearchParams({
    quality,
    format: finalFormat,
  });

  if (width) params.append('w', width);
  if (height) params.append('h', height);

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Lazy Image Component with native loading
 */
export function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder = null,
  srcSet = null,
  sizes = null,
  onLoad = null,
  onError = null,
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  const handleError = (e) => {
    setError(true);
    if (onError) onError(e);
  };

  return (
    <picture>
      {/* AVIF format */}
      {isAVIFSupported() && (
        <source
          srcSet={getOptimalImageUrl(src, { width, height, format: 'avif' })}
          type="image/avif"
        />
      )}

      {/* WebP format */}
      {isWebPSupported() && (
        <source
          srcSet={getOptimalImageUrl(src, { width, height, format: 'webp' })}
          type="image/webp"
        />
      )}

      {/* Fallback image */}
      <img
        src={error ? placeholder : getOptimalImageUrl(src, { width, height })}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        srcSet={srcSet}
        sizes={sizes}
      />
    </picture>
  );
}

/**
 * Progressive Image Component with blur placeholder
 */
export function ProgressiveImage({
  src,
  blurSrc,
  alt,
  width,
  height,
  className = '',
  onLoad = null,
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: `${width}/${height}` }}>
      {/* Blur placeholder */}
      {blurSrc && !isLoaded && (
        <img
          src={blurSrc}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover blur-sm"
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      <LazyImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`absolute inset-0 w-full h-full object-cover ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-300`}
        onLoad={handleLoad}
      />
    </div>
  );
}

/**
 * Responsive Image Component with srcSet
 */
export function ResponsiveImage({
  src,
  alt,
  breakpoints = [320, 640, 960, 1280, 1920],
  className = '',
  onLoad = null,
}) {
  const generateSrcSet = () => {
    return breakpoints
      .map(bp => `${getOptimalImageUrl(src, { width: bp })} ${bp}w`)
      .join(', ');
  };

  return (
    <LazyImage
      src={src}
      alt={alt}
      className={className}
      srcSet={generateSrcSet()}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 50vw"
      onLoad={onLoad}
    />
  );
}

/**
 * Image Gallery with lazy loading
 */
export function LazyImageGallery({
  images,
  columns = 3,
  gap = 4,
  className = '',
}) {
  return (
    <div
      className={`grid gap-${gap} grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} ${className}`}
    >
      {images.map((image, idx) => (
        <div key={idx} className="aspect-square overflow-hidden rounded-lg">
          <ResponsiveImage
            src={image.src}
            alt={image.alt || `Gallery image ${idx + 1}`}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Image with fallback
 */
export function ImageWithFallback({
  src,
  fallbackSrc,
  alt,
  width,
  height,
  className = '',
}) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isError, setIsError] = useState(false);

  const handleError = () => {
    if (!isError) {
      setIsError(true);
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <LazyImage
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={handleError}
    />
  );
}

/**
 * Batch image preloader
 */
export function preloadImages(urls) {
  return Promise.all(
    urls.map(
      url =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(url);
          img.onerror = () => reject(url);
          img.src = url;
        })
    )
  );
}

/**
 * Hook for lazy image loading
 */
export function useLazyImage(src, options = {}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const imgRef = React.useRef(null);

  useEffect(() => {
    if (!src) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const dataSrc = img.dataset.src;

            if (dataSrc) {
              img.src = dataSrc;
              img.addEventListener('load', () => setIsLoaded(true));
              img.addEventListener('error', () => setError(true));
            }

            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px',
        ...options,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src, options]);

  return {
    imgRef,
    isLoaded,
    error,
  };
}

/**
 * Generate blur placeholder (LQIP)
 * Use with backend: /api/image/placeholder?url=...&size=10
 */
export function generatePlaceholder(originalUrl) {
  const params = new URLSearchParams({
    url: originalUrl,
    size: 10,
    quality: 1,
  });
  return `/api/image/placeholder?${params}`;
}

/**
 * Image optimization configuration
 */
export const imageConfig = {
  breakpoints: {
    mobile: 320,
    tablet: 640,
    desktop: 1024,
    wide: 1280,
    ultrawide: 1920,
  },
  formats: {
    original: 'auto',
    webp: 'webp',
    avif: 'avif',
  },
  quality: {
    high: 90,
    medium: 80,
    low: 60,
  },
};

export default {
  isWebPSupported,
  isAVIFSupported,
  getOptimalImageUrl,
  LazyImage,
  ProgressiveImage,
  ResponsiveImage,
  LazyImageGallery,
  ImageWithFallback,
  preloadImages,
  useLazyImage,
  generatePlaceholder,
  imageConfig,
};
