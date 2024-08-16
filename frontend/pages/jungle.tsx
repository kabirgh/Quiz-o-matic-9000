/* eslint-disable @next/next/no-img-element */
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ReadControllers } from '../wailsjs/wailsjs/go/main/App';

const DEBUG = true;

type Player = {
  name: string;
  buzzerId: string;
  color: string;
  score: number;
  // % numbers, 0-100, centre of the player
  x: number;
  y: number;
  state: 'active' | 'stunned';
};

type Animal = {
  name: 'bear' | 'monkey' | 'owl' | 'sloth';
  // absolute numbers, centre of the animal
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
const PLAYER_SIZE = 44;
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
const STARTING_ANIMALS = 10;
// Becomes harder to find positions for animals
// and also to find them around this number
const MAX_ANIMALS = 120;
const ANIMAL_OFFSCREEN_ALLOWANCE = ANIMAL_SIZE / 3;
const ANIMAL_OVERLAP_ALLOWANCE = 0.45 * ANIMAL_SIZE; // 0-ANIMAL_SIZE/2
const JOYSTICK_SENSITIVITY = 0.05;

type ViewfinderProps = {
  color: string;
};
const Viewfinder = ({ color }: ViewfinderProps) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      {/* <!-- Corners --> */}
      <path
        d="M5 25 V20 Q5 5 20 5 H25 M75 5 H80 Q95 5 95 20 V25 M5 75 V80 Q5 95 20 95 H25 M75 95 H80 Q95 95 95 80 V75"
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
  const audioRef = useRef<HTMLAudioElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<State>({
    lastTick: 0,
    phase: 'not_started',
    grid: [],
    players: [
      {
        name: 'Player 1',
        buzzerId: 'Controller 1',
        color: 'red',
        score: 0,
        x: -PLAYER_SIZE,
        y: -PLAYER_SIZE,
        state: 'active',
      },
    ],
    animals: [],
    numAnimals: STARTING_ANIMALS,
  });
  const [, setRenderTrigger] = useState({});

  const isAnimalOverlapping = useCallback((x: number, y: number): boolean => {
    if (!stateRef.current.animals) return false;

    for (const animal of stateRef.current.animals) {
      // Might be undefined if we initialise the array with size
      if (!animal) continue;
      // Allow partial overlap
      const [l1, r1, t1, b1] = [
        x - ANIMAL_SIZE / 2,
        x + ANIMAL_SIZE / 2,
        y - ANIMAL_SIZE / 2,
        y + ANIMAL_SIZE / 2,
      ];
      const [l2, r2, t2, b2] = [
        animal.x - ANIMAL_SIZE / 2 + ANIMAL_OVERLAP_ALLOWANCE,
        animal.x + ANIMAL_SIZE / 2 - ANIMAL_OVERLAP_ALLOWANCE,
        animal.y - ANIMAL_SIZE / 2 + ANIMAL_OVERLAP_ALLOWANCE,
        animal.y + ANIMAL_SIZE / 2 - ANIMAL_OVERLAP_ALLOWANCE,
      ];

      if (l1 < r2 && r1 > l2 && t1 < b2 && b1 > t2) {
        return true;
      }
    }

    return false;
  }, []);

  const generateAnimalPositions = useCallback(() => {
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
          ANIMAL_OFFSCREEN_ALLOWANCE,
          Math.min(
            GAME_SIZE - ANIMAL_OFFSCREEN_ALLOWANCE,
            Math.floor(Math.random() * GAME_SIZE),
          ),
        );
        animal.y = Math.max(
          ANIMAL_OFFSCREEN_ALLOWANCE,
          Math.min(
            GAME_SIZE - ANIMAL_OFFSCREEN_ALLOWANCE,
            Math.floor(Math.random() * GAME_SIZE),
          ),
        );
      } while (
        // Make sure there's not too much overlap
        isAnimalOverlapping(animal.x, animal.y)
      );

      state.animals.push(animal);
    }
  }, [isAnimalOverlapping]);

  const changeNumberOfAnimals = useCallback(
    (numAnimals: number) => {
      stateRef.current.numAnimals = Math.max(
        Math.min(MAX_ANIMALS, numAnimals),
        0,
      );
      generateAnimalPositions();
    },
    [generateAnimalPositions],
  );

  useEffect(() => {
    // Create the background grid
    stateRef.current.grid = Array(GRID_COLS)
      .fill(null)
      .map(() =>
        Array(GRID_COLS)
          .fill(null)
          .map(() => BG_IMAGES[Math.floor(Math.random() * BG_IMAGES.length)]),
      );

    const update = (deltaTime: number) => {
      const state = stateRef.current;
      if (state.phase !== 'in_progress') return;
      if (DEBUG) return;

      ReadControllers().then((json) => {
        const controllers = JSON.parse(json);

        for (const player of state.players) {
          const controller = controllers[player.buzzerId];
          if (!controller) continue;

          const dx = controller.LeftJoystick.X || 0;
          const dy = -controller.LeftJoystick.Y || 0; // invert Y axis

          player.x = Math.max(
            0,
            Math.min(100, player.x + dx * deltaTime * JOYSTICK_SENSITIVITY),
          );
          player.y = Math.max(
            0,
            Math.min(100, player.y + dy * deltaTime * JOYSTICK_SENSITIVITY),
          );

          if (controller.Buttons.A) {
            // Check if player is overlapping with target animal
            const targetAnimal = state.animals[0];
            const [l, r, t, b] = [
              targetAnimal.x - ANIMAL_SIZE / 2,
              targetAnimal.x + ANIMAL_SIZE / 2,
              targetAnimal.y - ANIMAL_SIZE / 2,
              targetAnimal.y + ANIMAL_SIZE / 2,
            ];

            if (
              (player.x * GAME_SIZE) / 100 >= l &&
              (player.x * GAME_SIZE) / 100 <= r &&
              (player.y * GAME_SIZE) / 100 >= t &&
              (player.y * GAME_SIZE) / 100 <= b
            ) {
              player.score++;
              changeNumberOfAnimals(stateRef.current.numAnimals + 10);
              generateAnimalPositions();
            } else {
              // TODO stun player
            }
          }
        }
      });
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
  }, [generateAnimalPositions, changeNumberOfAnimals]);

  useEffect(() => {
    const clickHandler = (event: MouseEvent) => {
      if (stateRef.current.phase !== 'in_progress') return;
      if (!gridRef.current) return;

      // Get the bounding rectangle of the grid
      const rect = gridRef.current.getBoundingClientRect();
      // Calculate the click position relative to the grid
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      // Don't allow clicks outside the grid
      if (x < 0 || x > GAME_SIZE || y < 0 || y > GAME_SIZE) return;
      // Update player position (as percentage of grid size)
      stateRef.current.players[0].x = (x / GAME_SIZE) * 100;
      stateRef.current.players[0].y = (y / GAME_SIZE) * 100;
    };

    window.addEventListener('click', clickHandler);
    return () => {
      window.removeEventListener('click', clickHandler);
    };
  }, []);

  useEffect(() => {
    const keydownHandler = (event: any) => {
      switch (event.code) {
        case 'Backspace':
          router.push('/gamelist');
          break;
      }
    };

    addEventListener('keydown', keydownHandler);
    return () => {
      removeEventListener('keydown', keydownHandler);
    };
  }, [router]);

  const start = useCallback(() => {
    stateRef.current = {
      grid: stateRef.current.grid,
      players: stateRef.current.players.map((player) => ({
        ...player,
        score: 0,
        x: 50,
        y: 50,
      })),
      lastTick: 0,
      phase: 'in_progress',
      animals: [],
      numAnimals: STARTING_ANIMALS,
    };
    generateAnimalPositions();
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
    }
  }, [generateAnimalPositions]);

  return (
    <div className="flex flex-col justify-center items-center h-screen w-full bg-repeat bg-[#8ad2da]">
      <div className="grid grid-cols-[1fr_2fr_1fr]">
        <div id="left-pane"></div>
        <div
          id="middle-pane"
          className="flex items-center justify-center w-full"
        >
          <div
            id="grid-container"
            className="w-full aspect-square rounded-lg overflow-hidden shadow-md relative"
            style={{
              width: GAME_SIZE,
              height: GAME_SIZE,
            }}
          >
            <div
              id="grid-grass-bg"
              ref={gridRef}
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
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  border: `2px solid rgba(0, 0, 0, 0.01)`,
                  borderRadius: '20%',
                }}
              >
                <Viewfinder color={player.color} />
              </div>
            ))}
          </div>
        </div>
        <div id="right-pane" className="flex flex-col items-center mx-16 w-max">
          <div className="flex flex-col justify-center items-center bg-[#666] px-4 py-4 rounded-lg shadow-md h-[100px]">
            <div>Target</div>
            <div>
              <img
                className="w-16 h-auto mt-4"
                src={ANIMAL_SRCS[stateRef.current.animals[0]?.name]}
                alt={stateRef.current.animals[0]?.name}
              />
            </div>
          </div>
          <div className="flex flex-col justify-center items-center bg-[#a0a] px-4 py-4 rounded-lg shadow-md mt-12">
            <div className="mb-2">Scores</div>
            {stateRef.current.players.map((player) => (
              <div key={player.name} className="my-2">
                {player.name}: {player.score}
              </div>
            ))}
          </div>
          <button
            className="text-sm px-3 py-1 mb-0 mt-4"
            style={{
              visibility:
                stateRef.current.phase === 'in_progress' ? 'hidden' : 'visible',
            }}
            onClick={() => start()}
          >
            Start
          </button>
          <button
            onClick={() =>
              changeNumberOfAnimals(stateRef.current.numAnimals + 10)
            }
          >
            Add 10 Animals
          </button>
          <button
            onClick={() =>
              changeNumberOfAnimals(
                Math.max(1, stateRef.current.numAnimals - 10),
              )
            }
          >
            Remove 10 Animals
          </button>
          <div>Number of animals: {stateRef.current.numAnimals}</div>
        </div>
      </div>
      <audio ref={audioRef} src="/audio/jungle/bg.mp3" hidden loop />
    </div>
  );
};

export default JungleSeek;
