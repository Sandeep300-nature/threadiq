import { useEffect, useRef } from 'react';

/**
 * Shared IntersectionObserver singleton to prevent duplicate observer instances.
 * Efficiently handles bidirectional viewport visibility:
 * - Adds 'is-visible' and 'is-revealed' when entering viewport (fade in & upward glide).
 * - Removes 'is-visible' and 'is-revealed' when leaving viewport (smooth fade out).
 * - Never unobserves, so animations smoothly replay when scrolling down AND up.
 */
let sharedObserver = null;
const registeredElements = new Set();

const getSharedObserver = () => {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null;
  }

  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            entry.target.classList.add('is-revealed');
          } else {
            entry.target.classList.remove('is-visible');
            entry.target.classList.remove('is-revealed');
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -20px 0px'
      }
    );
  }

  return sharedObserver;
};

/**
 * Register a DOM element with the shared bidirectional observer.
 */
export const registerScrollReveal = (element) => {
  if (!element || typeof window === 'undefined') return;

  // Reduced motion: keep immediately and permanently visible
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    element.classList.add('is-visible');
    element.classList.add('is-revealed');
    return;
  }

  const observer = getSharedObserver();
  if (!observer) {
    element.classList.add('is-visible');
    element.classList.add('is-revealed');
    return;
  }

  if (!registeredElements.has(element)) {
    registeredElements.add(element);
    observer.observe(element);
  }
};

/**
 * Unregister a DOM element when component unmounts.
 */
export const unregisterScrollReveal = (element) => {
  if (!element) return;
  registeredElements.delete(element);
  if (sharedObserver) {
    sharedObserver.unobserve(element);
  }
};

/**
 * useScrollReveal Hook
 * Viewport-triggered bidirectional animation hook for React components.
 */
export const useScrollReveal = () => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    registerScrollReveal(el);

    return () => {
      unregisterScrollReveal(el);
    };
  }, []);

  return ref;
};
