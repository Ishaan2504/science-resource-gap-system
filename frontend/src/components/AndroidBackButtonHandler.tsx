import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/** Keep Android's system back button aligned with the React Router history. */
export function AndroidBackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = useRef(location.pathname);

  useEffect(() => {
    pathname.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

    let disposed = false;
    let listener: Awaited<ReturnType<typeof CapacitorApp.addListener>> | undefined;

    void CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      const hasRouterHistory = Number(window.history.state?.idx) > 0;

      if (hasRouterHistory || canGoBack) {
        window.history.back();
      } else if (pathname.current !== '/dashboard' && pathname.current !== '/login' && pathname.current !== '/') {
        navigate('/dashboard', { replace: true });
      } else {
        void CapacitorApp.exitApp();
      }
    }).then((registeredListener) => {
      if (disposed) void registeredListener.remove();
      else listener = registeredListener;
    });

    return () => {
      disposed = true;
      void listener?.remove();
    };
  }, [navigate]);

  return null;
}
