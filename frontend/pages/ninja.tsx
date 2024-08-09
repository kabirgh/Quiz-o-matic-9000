import { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ListTeams } from '../wailsjs/wailsjs/go/main/App';

// Use dummy players. When false, calls ListTeams to get real players
const DEBUG = false;

//
// Types
//
type Player = {
  name: string;
  x: number;
  y: number;
  vx: number;
  score: number;
  color: string;
  obstacles: Obstacle[];
  isGameOver: boolean;
  currentAnimation: 'run' | 'roll' | 'hit' | 'fall';
  currentFrame: number;
  lastFrameUpdate: number;
  wall: 'left' | 'right' | 'none';
};

type Obstacle = {
  x: number;
  y: number;
  currentFrame: number;
  lastFrameUpdate: number;
};

type GameScreenState = {
  player: Player;
  obstacles: Obstacle[];
};

type GameState = {
  players: Player[];
  obstaclePool: ObstaclePool;
  speed: number;
  speedLastUpdated: number;
  obstacleBag: number[];
  lastTick: number;
  gameStartTime: number;
};

class ObstaclePool {
  private pool: Obstacle[] = [];
  private activeObstacles: Obstacle[] = [];

  constructor(initialSize: number) {
    this.activeObstacles = structuredClone(DEFAULT_OBSTACLES);
    for (let i = 0; i < initialSize - this.activeObstacles.length; i++) {
      this.pool.push({ x: 0, y: 0, currentFrame: 0, lastFrameUpdate: 0 });
    }
  }

  getObstacle(x: number, y: number): Obstacle {
    let obstacle: Obstacle;
    if (this.pool.length > 0) {
      obstacle = this.pool.pop()!;
    } else {
      obstacle = { x: 0, y: 0, currentFrame: 0, lastFrameUpdate: 0 };
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
  currentAnimation,
  currentFrame,
  wall,
}: Player) => {
  const { hitbox, url } = ANIMATIONS[currentAnimation];

  let transform = 'none';
  let rotate = '0deg';
  if (currentAnimation === 'run') {
    transform = wall === 'left' ? `scaleY(-1)` : 'none';
    rotate = '-90deg';
  } else if (currentAnimation === 'hit' || currentAnimation === 'fall') {
    transform = wall === 'left' ? `scaleX(-1)` : 'none';
  }

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: PLAYER_SIZE,
          height: PLAYER_SIZE,
          imageRendering: 'pixelated',
          backgroundImage: `url('${url}')`,
          transform: transform,
          rotate: rotate,
          backgroundPosition: `-${currentFrame * PLAYER_SIZE}px 0px`,
          backgroundSize: 'auto 100%',
          // border: `1px solid black`,
        }}
      ></div>
      {/* <div
        style={{
          position: 'absolute',
          left: wall === 'left' ? x + hitbox.yb : x + hitbox.yt,
          top: y + hitbox.xf,
          width: PLAYER_SIZE - hitbox.yt - hitbox.yb,
          height: PLAYER_SIZE - hitbox.xf - hitbox.xb,
          border: '1px solid blue',
        }}
      ></div> */}
    </>
  );
};

const ObstacleSprite = ({ x, y, currentFrame }: Obstacle) => {
  const { hitbox, url } = ANIMATIONS.bat;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: OBSTACLE_SIZE,
          height: OBSTACLE_SIZE,
          imageRendering: 'pixelated',
          backgroundImage: `url('${url}')`,
          backgroundPosition: `-${currentFrame * OBSTACLE_SIZE}px 0px`,
          backgroundSize: 'auto 100%',
          // border: `1px solid black`,
        }}
      ></div>
      {/* <div
        style={{
          position: 'absolute',
          left: x + hitbox.xb,
          top: y + hitbox.yt,
          width: OBSTACLE_SIZE - hitbox.xb - hitbox.xf,
          height: OBSTACLE_SIZE - hitbox.yt - hitbox.yb,
          border: '1px solid blue',
        }}
      ></div> */}
    </>
  );
};

const GameScreen = ({ player, obstacles }: GameScreenState) => (
  <div style={{ margin: 16 }}>
    <div
      style={{
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        backgroundColor: 'white',
        // border: '1px solid #323232',
        borderBottom: 'none', // Remove bottom border to connect with color bar
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          fontFamily: 'Courier New',
          fontSize: 16,
          zIndex: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
        }}
      >
        {player.score}
      </div>
      {player.isGameOver && (
        <div
          style={{
            fontFamily: 'Courier New',
            fontSize: 24,
            fontWeight: 'bold',
          }}
        >
          GAME OVER
        </div>
      )}
      <PlayerSprite {...player} />
      {obstacles.map((obstacle, index) => (
        <ObstacleSprite key={index} {...obstacle} />
      ))}
    </div>
    {/* Color bar */}
    <div
      style={{
        width: GAME_WIDTH,
        height: 32,
        backgroundColor: player.color,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        font: '14px Arvo',
        // border: `1px solid ${player.color}`,
      }}
    >
      {player.name}
    </div>
  </div>
);

//
// Constants
//
const GAME_HEIGHT = 560;
const GAME_WIDTH = 320;

const OBSTACLE_SIZE = 48;
const OBSTACLE_MIN_GAP = 220;
const OBSTACLE_BAG_DEFAULT = shuffle([0, 0, 1, 1]);

const DEFAULT_OBSTACLES: Obstacle[] = [
  {
    x: 0,
    y: -OBSTACLE_SIZE,
    currentFrame: 0,
    lastFrameUpdate: 0,
  },
];

// PLAYER_SIZE == width/height of the sprite character including empty space
// Hitbox calculations should use values in ANIMATIONS
const PLAYER_SIZE = 72;
const PLAYER_VX = 1.2;

const DEFAULT_PLAYERS: Player[] = [
  {
    name: 'Player 1',
    x: 0,
    y: GAME_HEIGHT * 0.7,
    vx: 0,
    score: 0,
    obstacles: DEFAULT_OBSTACLES,
    isGameOver: false,
    color: 'blue',
    currentAnimation: 'run',
    wall: 'left',
    currentFrame: 0,
    lastFrameUpdate: Date.now(),
  },
  {
    name: 'Lizard Wizard',
    x: 0,
    y: GAME_HEIGHT * 0.7,
    vx: 0,
    score: 0,
    obstacles: DEFAULT_OBSTACLES,
    isGameOver: false,
    color: 'green',
    currentAnimation: 'run',
    wall: 'left',
    currentFrame: 0,
    lastFrameUpdate: Date.now(),
  },
  {
    name: 'Surprise Entrant',
    x: 0,
    y: GAME_HEIGHT * 0.7,
    vx: 0,
    score: 0,
    obstacles: DEFAULT_OBSTACLES,
    isGameOver: false,
    color: 'red',
    currentAnimation: 'run',
    wall: 'left',
    currentFrame: 0,
    lastFrameUpdate: Date.now(),
  },
  {
    name: 'Bonk',
    x: 0,
    y: GAME_HEIGHT * 0.7,
    vx: 0,
    score: 0,
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
  roll: {
    url: 'sprites/rollsheet.png',
    frames: 8,
    // Keep same hitbox as run
    hitbox: { xb: 12, xf: 14, yb: 0, yt: 12 },
    msPerFrame: 70,
  },
  hit: {
    url: 'sprites/hitsheet.png',
    frames: 6,
    hitbox: { xb: 0, xf: 0, yb: 0, yt: 0 },
    msPerFrame: 100,
  },
  fall: {
    url: 'sprites/fallsheet.png',
    frames: 3,
    hitbox: { xb: 0, xf: 0, yb: 0, yt: 0 },
    msPerFrame: 70,
  },
  bat: {
    url: 'sprites/batsheet.png',
    frames: 3,
    hitbox: { xb: 4, xf: 4, yb: 4, yt: 4 },
    msPerFrame: 100,
  },
};

//
// Game
//
const NinjaRun: NextPage = () => {
  const router = useRouter();
  const [, setRenderTrigger] = useState({});
  const [initialScreen, setInitialScreen] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [playButtonDisabled, setPlayButtonDisabled] = useState(true);

  const gameState = useRef<GameState>({
    players: [],
    // Same obstacles used for all players. player.obstacles is usually a reference to the list in the pool
    obstaclePool: new ObstaclePool(0),
    speed: 0.15,
    speedLastUpdated: Date.now(),
    // Ensure we don't choose the same side for new obstacles too many times in a row
    obstacleBag: [...OBSTACLE_BAG_DEFAULT],
    lastTick: 0,
    // Set when start game button is pressed
    gameStartTime: 0,
  });

  // Get teams from backend
  useEffect(() => {
    if (DEBUG) {
      gameState.current = {
        players: structuredClone(DEFAULT_PLAYERS),
        obstaclePool: new ObstaclePool(20),
        speed: 0.15,
        speedLastUpdated: Date.now(),
        obstacleBag: [...OBSTACLE_BAG_DEFAULT],
        lastTick: 0,
        gameStartTime: Date.now(),
      };
      setLoadingPlayers(false);
      setPlayButtonDisabled(false);
      return;
    }

    ListTeams()
      .then((teams) => {
        gameState.current.players = teams.map((team) => ({
          name: team.name,
          color: team.color,
          y: GAME_HEIGHT * 0.7,
          x: 0,
          vx: 0,
          score: 0,
          obstacles: [],
          isGameOver: false,
          currentAnimation: 'run',
          wall: 'left',
          currentFrame: 0,
          lastFrameUpdate: Date.now(),
        }));
        setLoadingPlayers(false);
        setPlayButtonDisabled(false);
      })
      .catch((err) => console.error(err));
  }, []);

  const reset = useCallback(() => {
    gameState.current = {
      players: gameState.current.players.map((player) => ({
        ...player,
        y: GAME_HEIGHT * 0.7,
        x: 0,
        vx: 0,
        score: 0,
        obstacles: [],
        isGameOver: false,
        currentAnimation: 'run',
        wall: 'left',
        currentFrame: 0,
        lastFrameUpdate: Date.now(),
      })),
      obstaclePool: new ObstaclePool(20),
      speed: 0.15,
      speedLastUpdated: Date.now(),
      obstacleBag: [...OBSTACLE_BAG_DEFAULT],
      lastTick: 0,
      gameStartTime: Date.now(),
    };
    setPlayButtonDisabled(true);
    setInitialScreen(false);
  }, []);

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
    const now = Date.now();

    // Don't update obstacles if all players are game over
    let isGameOverForAll = true;
    for (const player of state.players) {
      if (!player.isGameOver) {
        isGameOverForAll = false;
        break;
      }
    }
    if (isGameOverForAll) {
      setPlayButtonDisabled(false);
      return;
    }

    // Don't spawn or update obstacles for the first few seconds
    if (now - state.gameStartTime < 2000) {
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

    // Update animation frame
    for (const obstacle of activeObstacles) {
      if (obstacle.lastFrameUpdate + ANIMATIONS.bat.msPerFrame < now) {
        obstacle.currentFrame =
          (obstacle.currentFrame + 1) % ANIMATIONS.bat.frames;
        obstacle.lastFrameUpdate = now;
      }
    }

    // Live players reference the same obstacles list to reduce memory allocations and GC pauses
    for (const player of state.players) {
      if (!player.isGameOver) {
        player.obstacles = activeObstacles;
      } else {
        // Keep animating the obstacles for the game over players
        for (const obstacle of player.obstacles) {
          if (obstacle.lastFrameUpdate + ANIMATIONS.bat.msPerFrame < now) {
            obstacle.currentFrame =
              (obstacle.currentFrame + 1) % ANIMATIONS.bat.frames;
            obstacle.lastFrameUpdate = now;
          }
        }
      }
    }
  }, []);

  const updatePlayers = useCallback((deltaTime: number) => {
    const state = gameState.current;
    const now = Date.now();

    for (const player of state.players) {
      if (player.isGameOver) {
        // Player has fallen off the screen
        if (player.y > GAME_HEIGHT) {
          continue;
        }

        if (
          player.currentAnimation === 'hit' &&
          player.currentFrame < ANIMATIONS.hit.frames - 1
        ) {
          const targetX = (GAME_WIDTH - PLAYER_SIZE) / 2;
          const moveDistance = deltaTime * 0.2;
          if (player.x < targetX) {
            player.x = Math.min(player.x + moveDistance, targetX);
          } else if (player.x > targetX) {
            player.x = Math.max(player.x - moveDistance, targetX);
          }

          // Update hit animation frame
          if (now - player.lastFrameUpdate > ANIMATIONS.hit.msPerFrame) {
            player.currentFrame++;
            player.lastFrameUpdate = now;
          }
        }

        // Switch to fall animation when hit animation is done
        if (
          player.currentAnimation === 'hit' &&
          player.currentFrame === ANIMATIONS.hit.frames - 1
        ) {
          player.currentAnimation = 'fall';
          player.currentFrame = 0;
          player.lastFrameUpdate = Date.now();
        }

        // Fall animation
        if (player.currentAnimation === 'fall') {
          player.y += 0.15 * deltaTime;

          // Update fall animation frame
          const now = Date.now();
          if (now - player.lastFrameUpdate > ANIMATIONS.fall.msPerFrame) {
            player.currentFrame =
              (player.currentFrame + 1) %
              ANIMATIONS[player.currentAnimation].frames;
            player.lastFrameUpdate = now;
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
        const oBox = ANIMATIONS.bat.hitbox;
        if (
          // right edge of player is to the right of the left edge of obstacle
          player.x + PLAYER_SIZE - xb > obstacle.x + oBox.xb &&
          // left edge of player is to the left of the right edge of obstacle
          player.x + xf < obstacle.x + OBSTACLE_SIZE - oBox.xf &&
          // bottom edge of player is below the top edge of obstacle
          player.y + PLAYER_SIZE - yb > obstacle.y + oBox.yt &&
          // top edge of player is above the bottom edge of obstacle
          player.y + yt < obstacle.y + OBSTACLE_SIZE - oBox.yb
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
        player.currentAnimation = 'run';
      } else if (player.x + PLAYER_SIZE === GAME_WIDTH) {
        player.wall = 'right';
        player.currentAnimation = 'run';
      } else {
        player.wall = 'none';
        player.currentAnimation = 'roll';
      }

      // Update animation frame
      if (
        player.lastFrameUpdate +
          ANIMATIONS[player.currentAnimation].msPerFrame <
        now
      ) {
        const currentFrame =
          (player.currentFrame + 1) %
          ANIMATIONS[player.currentAnimation].frames;

        // Also update the score here to avoid another date.now call
        player.score += Math.round(
          Math.max(0, now - player.lastFrameUpdate) / 100,
        );
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#323232]">
      {/* Initial screen should probably be a different component */}
      {initialScreen && (
        <div className="text-center text-white">
          <h2
            style={{
              fontFamily: 'Courier New',
              fontSize: '4rem',
              marginBottom: '2rem',
            }}
          >
            NINJA RUN
          </h2>
        </div>
      )}
      {!initialScreen && (
        <div className="flex">
          {gameState.current.players.map((player, index) => (
            <GameScreen
              key={index}
              player={player}
              obstacles={player.obstacles}
            />
          ))}
        </div>
      )}
      <div>
        <button
          className="text-sm px-3 py-1 mb-0"
          disabled={playButtonDisabled || loadingPlayers}
          onClick={() => reset()}
        >
          {initialScreen ? 'Start' : 'Play again'}
        </button>
      </div>
    </div>
  );
};

export default NinjaRun;
