import React, { useRef, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ToastContainer } from '../common/Toast';
import { CustomCursor } from '../common/CustomCursor';
import { registerScrollReveal } from '../../hooks/useScrollReveal';

export const AppLayout = () => {
  const mainWrapperRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observeAll = () => {
      const elements = document.querySelectorAll('.scroll-reveal');
      elements.forEach((el) => registerScrollReveal(el));
    };

    observeAll();

    const mutationObserver = new MutationObserver(() => {
      observeAll();
    });

    const mainWrapper = mainWrapperRef.current || document.body;
    mutationObserver.observe(mainWrapper, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
    };
  }, [location.pathname]);

  return (
    <div className="app-container">
      <CustomCursor />
      <Sidebar />
      <div className="main-wrapper" ref={mainWrapperRef}>
        <Topbar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
};
