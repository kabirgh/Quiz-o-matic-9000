import { useEffect, useRef } from 'react';

const useWebAudio = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<{ [key: string]: AudioBuffer }>({});

  useEffect(() => {
    audioContextRef.current = new window.AudioContext();

    const loadSound = async (url: string, name: string) => {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer =
        await audioContextRef.current!.decodeAudioData(arrayBuffer);
      audioBuffersRef.current[name] = audioBuffer;
    };

    loadSound('/audio/pong/paddle.wav', 'paddle');
    loadSound('/audio/pong/wall.wav', 'wall');
    loadSound('/audio/pong/score.wav', 'score');

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playSound = (sound: string) => {
    if (audioContextRef.current && audioBuffersRef.current[sound]) {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffersRef.current[sound];
      source.connect(audioContextRef.current.destination);
      source.start(0);
    }
  };

  return playSound;
};

export default useWebAudio;
