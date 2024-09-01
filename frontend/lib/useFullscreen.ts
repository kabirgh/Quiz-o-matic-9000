import { useCallback, useEffect, useState } from 'react';

import {
  WindowFullscreen,
  WindowUnfullscreen,
} from '../wailsjs/wailsjs/runtime/runtime';

export function useFullscreen(startFullscreen: boolean) {
  const [fullscreen, setFullscreen] = useState(startFullscreen);

  const toggleFullscreen = useCallback(() => {
    setFullscreen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (fullscreen) {
      WindowFullscreen();
    } else {
      WindowUnfullscreen();
    }
  }, [fullscreen]);

  useEffect(() => {
    const keydownHandler = (event: KeyboardEvent) => {
      if (event.code === 'KeyF' && event.shiftKey) {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', keydownHandler);
    return () => {
      window.removeEventListener('keydown', keydownHandler);
    };
  }, [toggleFullscreen]);

  return { fullscreen, toggleFullscreen };
}
