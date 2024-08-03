import { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FpsView } from 'react-fps';

//
// Types
//
type Player = {
  x: number;
  y: number;
  vx: number;
  color: string;
  obstacles: Obstacle[];
  isGameOver: boolean;
  currentAnimation: 'run' | 'jump';
  currentFrame: number;
  lastFrameUpdate: number;
};

type Obstacle = {
  x: number;
  y: number;
};

type GameScreenState = {
  player: Player;
  obstacles: Obstacle[];
};

//
// Utils
//
const shuffle = (array: number[]): number[] => {
  const a = structuredClone(array);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

//
// Components
//
const PlayerSprite = ({
  x,
  y,
  color,
  currentAnimation,
  currentFrame,
}: Player) => {
  const frameIndex = NINJA_ANIMATIONS[currentAnimation].frames[currentFrame];
  const frameWidth = 72;
  const frameHeight = 48;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: frameWidth,
        height: frameHeight,
        imageRendering: 'pixelated',
        backgroundImage: `url('sprites/runsheet.png')`,
        transform: `scaleY(-1)`,
        rotate: '-90deg',
        backgroundPosition: `-${frameIndex * frameWidth}px 0px`,
        backgroundSize: 'auto 100%',
      }}
    ></div>
  );
};

const ObstacleSprite = ({ x, y }: Obstacle) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: OBSTACLE_SIZE,
      height: OBSTACLE_SIZE,
      backgroundColor: 'red',
    }}
  />
);

const GameScreen = ({ player, obstacles }: GameScreenState) => (
  <div
    style={{
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      border: '1px solid black',
      position: 'relative',
      overflow: 'hidden',
      margin: 16,
    }}
  >
    <PlayerSprite {...player} />
    {obstacles.map((obstacle, index) => (
      <ObstacleSprite key={index} {...obstacle} />
    ))}
  </div>
);

//
// Constants
//
const GAME_HEIGHT = 480;
const GAME_WIDTH = 300;

const OBSTACLE_SIZE = 24;
const OBSTACLE_MIN_GAP = 150;
const OBSTACLE_BAG_DEFAULT = shuffle([0, 0, 1, 1]);

const DEFAULT_OBSTACLES: Obstacle[] = [
  {
    x: 0,
    y: 0,
  },
];

const PLAYER_SIZE = 30;
const PLAYER_VX = 1;

const DEFAULT_PLAYERS: Player[] = [
  {
    x: 0,
    y: GAME_HEIGHT * 0.8,
    vx: 0,
    obstacles: DEFAULT_OBSTACLES,
    isGameOver: false,
    color: 'blue',
    currentAnimation: 'run',
    currentFrame: 0,
    lastFrameUpdate: Date.now(),
  },
  {
    x: 0,
    y: GAME_HEIGHT * 0.8,
    vx: 0,
    obstacles: DEFAULT_OBSTACLES,
    isGameOver: false,
    color: 'green',
    currentAnimation: 'run',
    currentFrame: 0,
    lastFrameUpdate: Date.now(),
  },
  {
    x: 0,
    y: GAME_HEIGHT * 0.8,
    vx: 0,
    obstacles: DEFAULT_OBSTACLES,
    isGameOver: false,
    color: 'red',
    currentAnimation: 'run',
    currentFrame: 0,
    lastFrameUpdate: Date.now(),
  },
  {
    x: 0,
    y: GAME_HEIGHT * 0.8,
    vx: 0,
    obstacles: DEFAULT_OBSTACLES,
    isGameOver: false,
    color: 'yellow',
    currentAnimation: 'run',
    currentFrame: 0,
    lastFrameUpdate: Date.now(),
  },
];

const NINJA_ANIMATIONS = {
  run: {
    url: 'sprites/run/runsheet2.png',
    frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    msPerFrame: 50,
  },
  jump: {
    url: 'sprites/run/jumpsheet.png',
    frames: [0, 1, 2, 3],
    msPerFrame: 1000 / 10,
  },
};

//
// Game
//
const NinjaRun: NextPage = () => {
  const router = useRouter();
  const [, setRenderTrigger] = useState({});
  const gameState = useRef({
    players: DEFAULT_PLAYERS,
    obstacles: DEFAULT_OBSTACLES,
    speed: 0.1,
    speedLastUpdated: Date.now(),
    // Ensure we don't choose the same side for new obstacles too many times in a row
    obstacleBag: [...OBSTACLE_BAG_DEFAULT],
    lastTick: 0,
  });

  const updateGameSpeed = useCallback((_deltaTime: number) => {
    const state = gameState.current;
    // Gradually increase the speed of the obstacles
    if (Date.now() - state.speedLastUpdated > 500) {
      state.speed *= 1.015;
      state.speedLastUpdated = Date.now();
    }
  }, []);

  const updateObstacles = useCallback((deltaTime: number) => {
    const state = gameState.current;

    // Modify the global obstacle state
    const newObstacles = state.obstacles
      // Move obstacles down the screen
      .map((obstacle) => ({
        ...obstacle,
        y: obstacle.y + state.speed * deltaTime,
      }))
      // Keep only obstacles that are still on the screen
      .filter((obstacle) => obstacle.y <= GAME_HEIGHT);

    if (
      newObstacles.length === 0 || // no obstacles on the screen
      newObstacles[newObstacles.length - 1].y > OBSTACLE_MIN_GAP // lowest obstacle moved far enough
    ) {
      // Spawn randomly on the left or right side of the screen
      const x = state.obstacleBag.pop()! * (GAME_WIDTH - OBSTACLE_SIZE);
      if (state.obstacleBag.length === 0) {
        state.obstacleBag = shuffle([...OBSTACLE_BAG_DEFAULT]);
      }

      // Add a new obstacle
      newObstacles.push({
        x: x,
        // Add some spacing jitter
        y: -Math.random() * OBSTACLE_MIN_GAP * 0.6,
      });
    }

    state.obstacles = newObstacles;
    // Copy obstacle state to player if they're still alive
    state.players = state.players.map((player) => {
      return player.isGameOver
        ? player
        : { ...player, obstacles: structuredClone(newObstacles) };
    });
  }, []);

  // Should be called every frame
  const updatePlayers = useCallback((deltaTime: number) => {
    const state = gameState.current;
    state.players = state.players.map((player) => {
      let newX = player.x + player.vx * deltaTime;

      // Check for collisions with obstacles
      const isColliding = player.obstacles.some((obstacle) => {
        return (
          newX <= obstacle.x + OBSTACLE_SIZE &&
          newX + PLAYER_SIZE >= obstacle.x &&
          player.y <= obstacle.y + OBSTACLE_SIZE &&
          player.y + PLAYER_SIZE >= obstacle.y
        );
      });
      if (isColliding) {
        return { ...player, isGameOver: true };
      }

      // Update animation frame
      if (
        player.lastFrameUpdate +
          NINJA_ANIMATIONS[player.currentAnimation].msPerFrame <
        Date.now()
      ) {
        const currentFrame =
          (player.currentFrame + 1) %
          NINJA_ANIMATIONS[player.currentAnimation].frames.length;

        return {
          ...player,
          x: newX,
          currentFrame,
          lastFrameUpdate: Date.now(),
        };
      }

      // If the player is not moving, don't update the position
      if (player.vx === 0) return player;

      // If the player is moving, update the position
      if (newX <= 0 || newX >= GAME_WIDTH - PLAYER_SIZE) {
        newX = Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, newX));
        return { ...player, x: newX, vx: 0 };
      }

      return { ...player, x: newX };
    });
  }, []);

  // On button press, change the player's direction
  const handleJump = useCallback((index: number) => {
    const state = gameState.current;
    state.players = state.players.map((player, i) => {
      if (i !== index) {
        return player;
      }

      // if game over, do nothing
      if (player.isGameOver) {
        return player;
      }

      // if the player is already flipping, change direction
      if (player.vx !== 0) {
        return { ...player, vx: -player.vx };
      }
      // if the player is on the left side of the screen, move right
      else if (player.x === 0) {
        return { ...player, vx: PLAYER_VX };
      }
      // otherwise (player on the right side of the screen), move left
      else {
        return { ...player, vx: -PLAYER_VX };
      }
    });
  }, []);

  // Button press event listener
  useEffect(() => {
    const keydownHandler = (event: any) => {
      switch (event.code) {
        case 'Backspace':
          router.push('/');
          break;
        case 'KeyA':
          handleJump(0);
          break;
        case 'KeyS':
          handleJump(1);
          break;
        case 'KeyD':
          handleJump(2);
          break;
        case 'KeyF':
          handleJump(3);
          break;
      }
    };

    addEventListener('keydown', keydownHandler);
    return () => {
      removeEventListener('keydown', keydownHandler);
    };
  }, [handleJump, router]);

  // Game loop, runs every frame
  const gameLoop = useCallback(
    (deltaTime: number) => {
      updateGameSpeed(deltaTime);
      updateObstacles(deltaTime);
      updatePlayers(deltaTime);
    },
    [updateGameSpeed, updatePlayers, updateObstacles],
  );

  // Scaffolding for the game loop
  useEffect(() => {
    let animationFrameId: number;

    const physicsProcess = (time: DOMHighResTimeStamp) => {
      const state = gameState.current;
      if (state.lastTick !== 0) {
        const deltaTime = time - state.lastTick;
        // Using deltaTime makes physics frame rate independent
        gameLoop(deltaTime);
        setRenderTrigger({});
      }

      state.lastTick = time;
      animationFrameId = requestAnimationFrame(physicsProcess);
    };

    animationFrameId = requestAnimationFrame(physicsProcess);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameLoop]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="mb-4 text-center">
        <h2 className="text-2xl font-bold">Ninja Run</h2>
        <FpsView />
      </div>
      <div className="flex mb-4">
        {gameState.current.players.map((player, index) => (
          <GameScreen
            key={index}
            player={player}
            obstacles={player.obstacles}
          />
        ))}
      </div>
    </div>
  );
};

export default NinjaRun;
