import React, { useEffect, useRef, useState } from "react";
import { useAuthCheck } from "./api/hooks";
import AuthModal from "./ui/AuthModal";

/**
 * If unauthenticated, it shows the AuthModal as an overlay, but still renders the app behind it.
 * 
 * If authenticated, it silently primes the Coder OIDC session by loading
 * the OIDC callback endpoint in a hidden iframe. This is a workaround:
 * without this, users would see the Coder login screen when opening an embedded terminal.
 * 
 * The iframe is removed as soon as it loads, or after a fallback timeout.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: isAuthenticated, isLoading } = useAuthCheck();
  const [coderAuthDone, setCoderAuthDone] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Only run the Coder OIDC priming once per session, after auth is confirmed
    if (isAuthenticated === true && !coderAuthDone) {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = "https://coder.pad.ws/api/v2/users/oidc/callback";

      // Remove iframe as soon as it loads, or after 2s fallback
      const cleanup = () => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        setCoderAuthDone(true);
      };

      iframe.onload = cleanup;
      document.body.appendChild(iframe);
      iframeRef.current = iframe;

      // Fallback: remove iframe after 5s if onload doesn't fire
      timeoutRef.current = window.setTimeout(cleanup, 5000);

      // Cleanup on unmount or re-run
      return () => {
        if (iframeRef.current && iframeRef.current.parentNode) {
          iframeRef.current.parentNode.removeChild(iframeRef.current);
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, coderAuthDone]);

  // State to control modal visibility and exit animation
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  // Update showAuthModal when authentication status changes
  useEffect(() => {
    if (isAuthenticated === false) {
      setShowAuthModal(true);
      setIsExiting(false);
    } else if (isAuthenticated === true && showAuthModal) {
      // Start exit animation when user becomes authenticated
      setIsExiting(true);
      // Modal will be removed after animation completes via onExitComplete
    }
  }, [isAuthenticated, showAuthModal]);
  
  // Handle exit animation completion
  const handleExitComplete = () => {
    setShowAuthModal(false);
  };

  // Always render children; overlay AuthModal if not authenticated
  return (
    <>
      {children}
      {showAuthModal && (
        <AuthModal 
          isExiting={isExiting} 
          onExitComplete={handleExitComplete} 
        />
      )}
    </>
  );
}
