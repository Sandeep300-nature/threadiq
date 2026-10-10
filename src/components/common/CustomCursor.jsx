import React, { useEffect, useRef } from 'react';

/**
 * Noir-Style Custom Cursor Component
 * Recreates the iconic Noir Automotive circular cursor:
 * - Outer circle: thin light-grey outline (64px diameter), transparent interior, smooth trailing delay.
 * - Inner dot: solid white circular center (14px diameter), direct responsive tracking.
 * - Non-blocking: pointer-events: none, high z-index (99999).
 * - Interactive hover response: subtle scale reduction when hovering buttons, links, and inputs.
 * - Hides default cursor only on supported desktop environments.
 * - Respects prefers-reduced-motion and touch-only devices.
 */
export const CustomCursor = () => {
  const ringRef = useRef(null);
  const dotRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Accessibility: Check prefers-reduced-motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // 2. Hardware check: Only enable on devices with hover and fine pointer (mouse/trackpad)
    if (window.matchMedia && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return;
    }

    // Add class to body to hide native cursor
    document.body.classList.add('has-custom-cursor');

    let targetX = -100;
    let targetY = -100;
    let ringX = -100;
    let ringY = -100;
    let dotX = -100;
    let dotY = -100;
    let isVisible = false;
    let isHovering = false;
    let rafId = null;

    const ring = ringRef.current;
    const dot = dotRef.current;

    const updateVisibility = (visible) => {
      if (isVisible !== visible) {
        isVisible = visible;
        if (ring) ring.style.opacity = visible ? '1' : '0';
        if (dot) dot.style.opacity = visible ? '1' : '0';
      }
    };

    const handlePointerMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;

      if (!isVisible) {
        // Snap initial position on first move to prevent flying in from off-screen
        if (ringX < 0) {
          ringX = targetX;
          ringY = targetY;
          dotX = targetX;
          dotY = targetY;
        }
        updateVisibility(true);
      }
    };

    const handleMouseOver = (e) => {
      const target = e.target;
      if (!target) return;
      const isInteractive = Boolean(
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'INPUT' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('select') ||
        target.closest('[role="button"]') ||
        target.getAttribute('role') === 'button'
      );

      if (isInteractive !== isHovering) {
        isHovering = isInteractive;
        if (ring) {
          if (isHovering) {
            ring.classList.add('cursor-hover');
          } else {
            ring.classList.remove('cursor-hover');
          }
        }
        if (dot) {
          if (isHovering) {
            dot.classList.add('cursor-hover');
          } else {
            dot.classList.remove('cursor-hover');
          }
        }
      }
    };

    const handleMouseLeave = () => {
      updateVisibility(false);
    };

    const handleMouseEnter = () => {
      updateVisibility(true);
    };

    const animate = () => {
      // Outer ring: subtle delay (0.14 lerp factor for smooth, elegant trailing)
      ringX += (targetX - ringX) * 0.14;
      ringY += (targetY - ringY) * 0.14;

      // Inner dot: fast, direct tracking (0.50 lerp factor for immediate responsiveness)
      dotX += (targetX - dotX) * 0.50;
      dotY += (targetY - dotY) * 0.50;

      if (ring) {
        ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      }
      if (dot) {
        dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%)`;
      }

      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('mouseover', handleMouseOver, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    rafId = requestAnimationFrame(animate);

    return () => {
      document.body.classList.remove('has-custom-cursor');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="custom-cursor-root" aria-hidden="true">
      <div ref={ringRef} className="custom-cursor-ring" />
      <div ref={dotRef} className="custom-cursor-dot" />
    </div>
  );
};
