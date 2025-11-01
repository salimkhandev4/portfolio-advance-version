import { useEffect, useRef, useState } from 'react';
import { isFullscreen as checkFullscreen, exitFullscreen, isFullscreenSupported, isMobile } from '../utils/fullscreen';

/**
 * Custom hook for auto-enabling fullscreen on first user interaction
 * Based on a proven working approach that handles all devices correctly
 */
export const useFirstInteractionFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hasTriggered = useRef(false);

  const requestFullscreenHandler = () => {
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    const elem = document.documentElement;

    try {
      if (elem.requestFullscreen) {
        elem.requestFullscreen({ navigationUI: "hide" }).catch(() => {
          hasTriggered.current = false;
        });
      } else if (elem.webkitRequestFullscreen) {
        // Safari
        elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        // Firefox
        elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        // IE/Edge
        elem.msRequestFullscreen();
      }
    } catch (error) {
      console.log('Fullscreen error:', error);
      hasTriggered.current = false;
    }
  };

  // Monitor fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(checkFullscreen());
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Trigger fullscreen on click (desktop) or touch/click (mobile)
  useEffect(() => {
    if (!isFullscreenSupported()) return;

    const trigger = () => {
      if (!hasTriggered.current && !checkFullscreen()) {
        // Use setTimeout to ensure the click action fully completes first
        // This allows all click handlers, navigation, and UI updates to finish
        // Note: The delay may cause the fullscreen API to require a direct user gesture
        // This is expected behavior - fullscreen will trigger on next user interaction
        setTimeout(() => {
          requestFullscreenHandler().catch(() => {
            // Silently fail - fullscreen requires direct user gesture
            // It will work on the next click/touch
          });
        }, 50);
      }
    };

    // Mobile: listen to touchstart and click
    // Desktop: listen to click only
    const events = isMobile() 
      ? ['touchstart', 'click']  // Mobile devices
      : ['click'];                // Desktop only

    // Add listeners in bubble phase (default) so target handlers run first
    events.forEach(event => {
      document.addEventListener(event, trigger, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, trigger);
      });
    };
  }, []);

  const exitFullscreenHandler = () => {
    exitFullscreen().catch(() => {
      console.log('Failed to exit fullscreen');
    });
  };

  return {
    isFullscreen,
    exitFullscreen: exitFullscreenHandler
  };
};

