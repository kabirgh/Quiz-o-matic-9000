/* eslint-disable @next/next/no-img-element */
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

type GameCardProps = {
  name: string;
  font: string;
  imageUrl: string;
  url: string;
  router: ReturnType<typeof useRouter>;
};

const games = [
  {
    name: 'PONG',
    font: 'Pong Score',
    imageUrl: '/images/pong.png',
    url: '/pong',
  },
  {
    name: 'Ninja Run',
    font: 'Courier New',
    imageUrl: '/images/ninjarun.png',
    url: '/ninjarun',
  },
  {
    name: 'Snake',
    font: 'Trebuchet MS',
    imageUrl: '/images/snake.png',
    url: '/snake',
  },
  {
    name: 'Memory',
    font: 'Georgia',
    imageUrl: '/images/memory.png',
    url: '/memory',
  },
];

const GameCard = ({ name, font, imageUrl, url, router }: GameCardProps) => (
  <div
    className="flex items-center p-4 w-[500px] h-20 mb-4 rounded-lg shadow-xl
              transition-all duration-200 hover:translate-y-[-3px] hover:shadow-2xl
              bg-gradient-to-br from-[#FFB6C1] to-[#FFDAB9] group cursor-pointer"
    style={{ border: '1px solid gray' }}
    onClick={() => router.push(url)}
  >
    <div className="pl-4">
      <h3 className="text-2xl" style={{ fontFamily: font }}>
        {name}
      </h3>
    </div>
    <div className="ml-auto">
      <img
        src={imageUrl}
        alt={name}
        className="w-full h-24 object-cover rounded"
      />
    </div>
  </div>
);

const GameList: NextPage = () => {
  const router = useRouter();

  useEffect(() => {
    const keydownHandler = (event: KeyboardEvent) => {
      if (event.code === 'Backspace') {
        router.push('/');
      }
    };
    window.addEventListener('keydown', keydownHandler);
    return () => {
      window.removeEventListener('keydown', keydownHandler);
    };
  }, [router]);

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-[url('/images/pastelsky.png')] bg-no-repeat bg-cover bg-center">
      <div className="flex flex-col items-center gap-4">
        {games.map((game, index) => (
          <GameCard key={index} router={router} {...game} />
        ))}
      </div>
    </div>
  );
};

export default GameList;
