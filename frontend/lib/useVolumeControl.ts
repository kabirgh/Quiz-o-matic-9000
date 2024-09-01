import { useEffect, useState } from 'react';

const VOLUME_STEP = 0.1;

const perceptualToAmplitude = (value: number): number => {
  return Math.pow(value, 3);
};

export const useVolumeControl = (initialVolume: number) => {
  const [volume, setVolume] = useState(initialVolume);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
          setVolume((prev) => Math.min(prev + VOLUME_STEP, 1));
          break;
        case 'ArrowDown':
          setVolume((prev) => Math.max(prev - VOLUME_STEP, 0));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const amplitudeVolume = perceptualToAmplitude(volume);

  return { volume: amplitudeVolume };
};
