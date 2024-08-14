/* eslint-disable @next/next/no-img-element */
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';

type Player = {
  name: string;
  color: string;
  score: number;
  // % numbers
  x: number;
  y: number;
};

type Animal = {
  name: 'bear' | 'monkey' | 'owl' | 'sloth';
  // absolute numbers
  x: number;
  y: number;
};

type State = {
  lastTick: number;
  phase: 'not_started' | 'in_progress' | 'game_over';
  grid: string[][];
  players: Player[];
  animals: Animal[];
  numAnimals: number;
};

const GAME_SIZE = 600;
const PLAYER_SIZE = 40;
const GRID_COLS = 12;
const ANIMAL_SIZE = 64;
const BG_IMAGES = ['/images/jungle/g1n.png', '/images/jungle/g2n.png'];
const ANIMALS: Animal[] = [
  { name: 'bear', x: 0, y: 0 },
  { name: 'monkey', x: 0, y: 0 },
  { name: 'owl', x: 0, y: 0 },
  { name: 'sloth', x: 0, y: 0 },
];
const ANIMAL_SRCS = {
  bear: '/images/jungle/bear.png',
  monkey: '/images/jungle/monkey.png',
  owl: '/images/jungle/owl.png',
  sloth: '/images/jungle/sloth.png',
};

type ViewfinderProps = {
  color: string;
};
const Viewfinder = ({ color }: ViewfinderProps) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      {/* <!-- Corners --> */}
      <path
        d="M5 25 V5 H25 M75 5 H95 V25 M5 75 V95 H25 M75 95 H95 V75"
        stroke={color}
        strokeWidth="7"
        fill="none"
      />
      {/* <!-- Center crosshair --> */}
      <line x1="35" y1="50" x2="65" y2="50" stroke={color} strokeWidth="5" />
      <line x1="50" y1="35" x2="50" y2="65" stroke={color} strokeWidth="5" />
    </svg>
  );
};

const JungleSeek: NextPage = () => {
  const router = useRouter();
  const stateRef = useRef<State>({
    lastTick: 0,
    phase: 'not_started',
    grid: [],
    players: [
      {
        name: 'Player 1',
        color: 'red',
        score: 0,
        x: 50,
        y: 50,
      },
    ],
    animals: [],
    numAnimals: 60,
  });
  const [, setRenderTrigger] = useState({});

  useEffect(() => {
    // Create the background grid
    stateRef.current.grid = Array(GRID_COLS)
      .fill(null)
      .map(() =>
        Array(GRID_COLS)
          .fill(null)
          .map(() => BG_IMAGES[Math.floor(Math.random() * BG_IMAGES.length)]),
      );

    const isAnimalOverlapping = (x: number, y: number): boolean => {
      if (!stateRef.current.animals) return false;

      for (const animal of stateRef.current.animals) {
        // Might be undefined if we initialise the array with size
        if (!animal) continue;
        // Allow partial overlap
        if (
          Math.abs(animal.x - x) < ANIMAL_SIZE / 2 &&
          Math.abs(animal.y - y) < ANIMAL_SIZE / 2
        ) {
          return true;
        }
      }

      return false;
    };

    const generateAnimalPositions = () => {
      const state = stateRef.current;
      // Reset animals
      state.animals = [];

      // Select one animal to be the target
      const targetAnimal = structuredClone(
        ANIMALS[Math.floor(Math.random() * ANIMALS.length)],
      );
      // Place the target animal randomly
      targetAnimal.x = Math.floor(Math.random() * GAME_SIZE);
      targetAnimal.y = Math.floor(Math.random() * GAME_SIZE);
      state.animals[0] = targetAnimal;

      // Remove the target animal from the list of animals
      const animals = ANIMALS.filter(
        (animal) => animal.name !== targetAnimal.name,
      );

      // Place animals randomly
      for (let i = 1; i < state.numAnimals; i++) {
        const animal = structuredClone(animals[i % animals.length]);
        // Place the animal randomly
        do {
          // Clamp to avoid placing the animal outside the game area
          animal.x = Math.max(
            ANIMAL_SIZE / 2,
            Math.min(
              GAME_SIZE - ANIMAL_SIZE / 2,
              Math.floor(Math.random() * GAME_SIZE),
            ),
          );
          animal.y = Math.max(
            ANIMAL_SIZE / 2,
            Math.min(
              GAME_SIZE - ANIMAL_SIZE / 2,
              Math.floor(Math.random() * GAME_SIZE),
            ),
          );
        } while (
          // Make sure there's not too much overlap
          isAnimalOverlapping(animal.x, animal.y)
        );

        state.animals.push(animal);
      }
    };
    generateAnimalPositions();

    const update = (deltaTime: number) => {
      // Update game state
    };

    let animationFrameId: number;
    const loop = (time: DOMHighResTimeStamp) => {
      // Initialize lastTick if it's the first frame
      if (stateRef.current.lastTick === 0) {
        stateRef.current.lastTick = time;
        animationFrameId = window.requestAnimationFrame(loop);
        return;
      }

      const deltaTime = time - stateRef.current.lastTick;
      stateRef.current.lastTick = time;

      update(deltaTime);
      setRenderTrigger({});
      animationFrameId = window.requestAnimationFrame(loop);
    };

    animationFrameId = window.requestAnimationFrame(loop);
  }, []);

  return (
    <div className="min-h-screen w-full bg-repeat bg-[#8ad2da]">
      <div className="flex items-center justify-center min-h-screen">
        {/* Grid container */}
        <div
          className="w-full aspect-square rounded-lg overflow-hidden shadow-md relative"
          style={{
            width: GAME_SIZE,
            height: GAME_SIZE,
          }}
        >
          {/* Grass bg */}
          <div
            className="grid w-full h-full"
            style={{
              gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            }}
          >
            {stateRef.current.grid.flat().map((image, index) => (
              <div key={index} className="relative">
                <img
                  src={image}
                  alt={`Tile ${index}`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          {/* Animals */}
          {stateRef.current.animals.map((animal, i) => (
            <img
              key={i}
              src={ANIMAL_SRCS[animal.name]}
              alt={animal.name}
              className="absolute"
              style={{
                top: `${animal.y}px`,
                left: `${animal.x}px`,
                width: 'auto',
                height: ANIMAL_SIZE,
                transform: `translate(-50%, -50%)`,
              }}
            />
          ))}
          {/* Player cursors */}
          {stateRef.current.players.map((player) => (
            <div
              key={player.name}
              style={{
                position: 'absolute',
                top: `${player.y}%`,
                left: `${player.x}%`,
                width: `${(PLAYER_SIZE / GAME_SIZE) * 100}%`,
                height: `${(PLAYER_SIZE / GAME_SIZE) * 100}%`,
                transform: 'translate(-50%, -50%)', // Center the player on its position
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                border: `2px solid rgba(255, 255, 255, 0.01)`,
              }}
            >
              <Viewfinder color={player.color} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JungleSeek;
