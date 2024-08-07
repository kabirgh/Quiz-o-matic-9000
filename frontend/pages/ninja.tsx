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
  currentAnimation: 'run' | 'hit' | 'death';
  currentFrame: number;
  lastFrameUpdate: number;
  wall: 'left' | 'right' | 'none';
};

type Obstacle = {
  x: number;
  y: number;
};

type GameScreenState = {
  player: Player;
  obstacles: Obstacle[];
};

class ObstaclePool {
  private pool: Obstacle[] = [];
  private activeObstacles: Obstacle[] = [];

  constructor(initialSize: number) {
    this.activeObstacles = [...DEFAULT_OBSTACLES];
    for (let i = 0; i < initialSize - DEFAULT_OBSTACLES.length; i++) {
      this.pool.push({ x: 0, y: 0 });
    }
  }

  getObstacle(x: number, y: number): Obstacle {
    let obstacle: Obstacle;
    if (this.pool.length > 0) {
      obstacle = this.pool.pop()!;
    } else {
      obstacle = { x: 0, y: 0 };
    }
    obstacle.x = x;
    obstacle.y = y;
    this.activeObstacles.push(obstacle);
    return obstacle;
  }

  releaseObstacle(obstacle: Obstacle) {
    const index = this.activeObstacles.indexOf(obstacle);
    if (index > -1) {
      this.activeObstacles.splice(index, 1);
      this.pool.push(obstacle);
    }
  }

  updateActiveObstacles(deltaTime: number, speed: number) {
    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      const obstacle = this.activeObstacles[i];
      obstacle.y = Math.round(obstacle.y + speed * deltaTime);
      if (obstacle.y > GAME_HEIGHT) {
        this.releaseObstacle(obstacle);
      }
    }
  }

  getActiveObstacles(): Obstacle[] {
    return this.activeObstacles;
  }
}

//
// Utils
//
// Mutates array in place
const shuffle = (array: number[]): number[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
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
  wall,
}: Player) => {
  const anim = ANIMATIONS[currentAnimation];
  const frameWidth = 72;
  const frameHeight = 72;

  let transform = 'none';
  let rotate = '0deg';
  if (currentAnimation === 'run') {
    transform = wall === 'left' ? `scaleY(-1)` : 'none';
    rotate = '-90deg';
  } else if (currentAnimation === 'hit' || currentAnimation === 'death') {
    transform = wall === 'left' ? `scaleX(-1)` : 'none';
  }

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: frameWidth,
          height: frameHeight,
          imageRendering: 'pixelated',
          backgroundImage: `url('${anim.url}')`,
          transform: transform,
          rotate: rotate,
          backgroundPosition: `-${currentFrame * frameWidth}px 0px`,
          backgroundSize: 'auto 100%',
          border: `1px solid black`,
        }}
      ></div>
      <div
        style={{
          position: 'absolute',
          left: wall === 'left' ? x + anim.hitbox.yb : x + anim.hitbox.yt,
          top: y + anim.hitbox.xf,
          width: PLAYER_SIZE - anim.hitbox.yt - anim.hitbox.yb,
          height: PLAYER_SIZE - anim.hitbox.xf - anim.hitbox.xb,
          border: '1px solid blue',
        }}
      ></div>
    </>
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

// PLAYER_SIZE == width/height of the sprite character including empty space
// Hitbox calculations should use values in ANIMATIONS
const PLAYER_SIZE = 72;
const PLAYER_VX = 1;

const DEFAULT_PLAYERS: Player[] = [
  {
    x: 0,
    y: GAME_HEIGHT * 0.7,
    vx: 0,
    obstacles: DEFAULT_OBSTACLES,
    isGameOver: false,
    color: 'blue',
    currentAnimation: 'run',
    wall: 'left',
    currentFrame: 0,
    lastFrameUpdate: Date.now(),
  },
  {
    x: 0,
    y: GAME_HEIGHT * 0.7,
    vx: 0,
    obstacles: DEFAULT_OBSTACLES,
    isGameOver: false,
    color: 'green',
    currentAnimation: 'run',
    wall: 'left',
    currentFrame: 0,
    lastFrameUpdate: Date.now(),
  },
  {
    x: 0,
    y: GAME_HEIGHT * 0.7,
    vx: 0,
    obstacles: DEFAULT_OBSTACLES,
    isGameOver: false,
    color: 'red',
    currentAnimation: 'run',
    wall: 'left',
    currentFrame: 0,
    lastFrameUpdate: Date.now(),
  },
  {
    x: 0,
    y: GAME_HEIGHT * 0.7,
    vx: 0,
    obstacles: DEFAULT_OBSTACLES,
    isGameOver: false,
    color: 'yellow',
    currentAnimation: 'run',
    wall: 'left',
    currentFrame: 0,
    lastFrameUpdate: Date.now(),
  },
];

const ANIMATIONS = {
  run: {
    url: 'sprites/runsheet.png',
    frames: 8,
    hitbox: { xb: 12, xf: 14, yb: 0, yt: 12 },
    msPerFrame: 70,
  },
  hit: {
    url: 'sprites/hitsheet.png',
    frames: 5,
    hitbox: { xb: 0, xf: 0, yb: 0, yt: 0 },
    msPerFrame: 200,
  },
  death: {
    url: 'sprites/deathsheet.png',
    frames: 19,
    hitbox: { xb: 0, xf: 0, yb: 0, yt: 0 },
    msPerFrame: 70,
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
    // Same obstacles used for all players. player.obstacles is usually a reference to the list in the pool
    obstaclePool: new ObstaclePool(20),
    speed: 0.1,
    speedLastUpdated: Date.now(),
    // Ensure we don't choose the same side for new obstacles too many times in a row
    obstacleBag: [...OBSTACLE_BAG_DEFAULT],
    lastTick: 0,
  });

  const updateGameSpeed = useCallback((_deltaTime: number) => {
    const state = gameState.current;
    // Gradually increase the speed of the obstacles
    const now = Date.now();
    if (now - state.speedLastUpdated > 500) {
      state.speed *= 1.015;
      state.speedLastUpdated = now;
    }
  }, []);

  const updateObstacles = useCallback((deltaTime: number) => {
    const state = gameState.current;

    // Don't update obstacles if all players are game over
    let isGameOverForAll = true;
    for (const player of state.players) {
      if (!player.isGameOver) {
        isGameOverForAll = false;
        break;
      }
    }
    if (isGameOverForAll) {
      return;
    }

    state.obstaclePool.updateActiveObstacles(deltaTime, state.speed);
    const activeObstacles = state.obstaclePool.getActiveObstacles();

    if (
      activeObstacles.length === 0 ||
      activeObstacles[activeObstacles.length - 1].y > OBSTACLE_MIN_GAP
    ) {
      const x = state.obstacleBag.pop()! * (GAME_WIDTH - OBSTACLE_SIZE);
      if (state.obstacleBag.length === 0) {
        state.obstacleBag = shuffle([...OBSTACLE_BAG_DEFAULT]);
      }

      state.obstaclePool.getObstacle(
        x,
        -Math.random() * OBSTACLE_MIN_GAP * 0.6,
      );
    }

    // Live players reference the same obstacles list to reduce memory allocations and GC pauses
    for (const player of state.players) {
      if (!player.isGameOver) {
        player.obstacles = activeObstacles;
      }
    }
  }, []);

  const updatePlayers = useCallback((deltaTime: number) => {
    const state = gameState.current;

    for (const player of state.players) {
      if (player.isGameOver) {
        if (player.currentAnimation === 'hit' && player.currentFrame < 4) {
          const targetX = (GAME_WIDTH - PLAYER_SIZE) / 2;
          const moveDistance = (5 * deltaTime) / 16; // Adjust speed as needed
          if (player.x < targetX) {
            player.x = Math.min(player.x + moveDistance, targetX);
          } else if (player.x > targetX) {
            player.x = Math.max(player.x - moveDistance, targetX);
          }

          // Update hit animation frame
          const now = Date.now();
          if (now - player.lastFrameUpdate > ANIMATIONS.hit.msPerFrame) {
            if (player.currentFrame < ANIMATIONS.hit.frames - 1) {
              player.currentFrame++;
              player.lastFrameUpdate = now;
            }
          }
        }

        continue;
      }

      // Calculate the new position
      let newX = Math.round(player.x + player.vx * deltaTime);

      // Check for collisions with left and right walls
      if (newX < 0) {
        newX = 0;
        player.vx = 0; // Stop the player at the left wall
      } else if (newX + PLAYER_SIZE > GAME_WIDTH) {
        newX = GAME_WIDTH - PLAYER_SIZE;
        player.vx = 0; // Stop the player at the right wall
      }

      // Check for collisions with obstacles
      let isColliding = false;
      for (const obstacle of player.obstacles) {
        const { xb, xf, yb, yt } = ANIMATIONS[player.currentAnimation].hitbox;
        if (
          // right edge of player is to the right of the left edge of obstacle
          player.x + PLAYER_SIZE - xb > obstacle.x &&
          // left edge of player is to the left of the right edge of obstacle
          player.x + xf < obstacle.x + OBSTACLE_SIZE &&
          // bottom edge of player is below the top edge of obstacle
          player.y + PLAYER_SIZE - yb > obstacle.y &&
          // top edge of player is above the bottom edge of obstacle
          player.y + yt < obstacle.y + OBSTACLE_SIZE
        ) {
          isColliding = true;
          break;
        }
      }

      if (isColliding) {
        // Copy a snapshot of the obstacles list
        player.obstacles = structuredClone(
          state.obstaclePool.getActiveObstacles(),
        );
        player.isGameOver = true;
        player.currentAnimation = 'hit';
        player.currentFrame = 0;
        player.lastFrameUpdate = Date.now();
        player.vx = 0; // Stop horizontal movement
        continue;
      }

      // Update player position
      player.x = newX;

      if (player.x === 0) {
        player.wall = 'left';
      } else if (player.x + PLAYER_SIZE === GAME_WIDTH) {
        player.wall = 'right';
      } else {
        player.wall = 'none';
      }

      // Update animation frame
      const now = Date.now();
      if (
        player.lastFrameUpdate +
          ANIMATIONS[player.currentAnimation].msPerFrame <
        now
      ) {
        const currentFrame =
          (player.currentFrame + 1) %
          ANIMATIONS[player.currentAnimation].frames;

        player.currentFrame = currentFrame;
        player.lastFrameUpdate = now;
      }
    }
  }, []);

  // On button press, change the player's direction
  const handleJump = useCallback((index: number) => {
    const player = gameState.current.players[index];

    // if game over, do nothing
    if (player.isGameOver) {
      return player;
    }

    let newVx = 0;
    // if the player is already flipping, change direction
    if (player.vx !== 0) {
      newVx = -player.vx;
    }
    // if the player is on the left side of the screen, move right
    else if (player.x === 0) {
      newVx = PLAYER_VX;
    }
    // otherwise (player on the right side of the screen), move left
    else {
      newVx = -PLAYER_VX;
    }

    gameState.current.players[index].vx = newVx;
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
