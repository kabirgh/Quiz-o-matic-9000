import { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import usePongAudio from '../lib/usePongAudio';
import { ListTeams, ReadControllers } from '../wailsjs/wailsjs/go/main/App';

const DEBUG = false;

type Player = {
  x: number;
  y: number;
  name: string;
  color: string;
  buzzerId: string;
  lives: number;
  type: 'player' | 'dummy';
};

type Ball = {
  x: number;
  y: number;
  dx: number;
  dy: number;
};

type Wall = {
  x: number;
  y: number;
  width: number;
  height: number;
  position: 'left' | 'right' | 'top' | 'bottom';
  color?: string;
};

type State = {
  lastTick: number;
  winner: null | Player;
  phase: 'not_started' | 'in_progress' | 'game_over';
  walls: Wall[];
  players: { left: Player; right: Player; top: Player; bottom: Player };
  ball: Ball;
  gameOverText: string;
};

const SCORE_LENGTH = 14;
const SCORE_THICKNESS = 5;
const SCORE_GAP = 9;
const CANVAS_SIZE = 600;
const PADDLE_LENGTH = 80;
const PADDLE_THICKNESS = 8;
const WALL_THICKNESS = PADDLE_THICKNESS;
const WALL_LENGTH = 80;
const WALL_OFFSET = SCORE_LENGTH + 4;
const PADDLE_OFFSET = WALL_OFFSET + WALL_THICKNESS + 8;
// Let the player stop 4 pixels from the wall
const PADDLE_STOP = WALL_OFFSET + WALL_THICKNESS + 4;
const BALL_SIZE = 10;
const INITIAL_BALL_SPEED = 0.18;
const SPEED_MULTIPLIER = 1.1;
const JOYSTICK_SENSITIVITY = 0.6;
const STARTING_LIVES = 2;

// I'm not sure this works, but here just in case it helps at smaller speeds
const COLLISION_EXTENSION = 1000;

const DEFAULT_PLAYERS: {
  left: Player;
  right: Player;
  top: Player;
  bottom: Player;
} = {
  top: {
    x: CANVAS_SIZE / 2 - PADDLE_LENGTH / 2,
    y: 0 + PADDLE_OFFSET,
    name: 'top',
    color: 'white',
    buzzerId: '',
    lives: 0,
    type: 'dummy',
  },
  bottom: {
    x: CANVAS_SIZE / 2 - PADDLE_LENGTH / 2,
    y: CANVAS_SIZE - PADDLE_THICKNESS - PADDLE_OFFSET,
    name: 'bottom',
    color: 'white',
    buzzerId: '',
    lives: 0,
    type: 'dummy',
  },
  left: {
    x: 0 + PADDLE_OFFSET,
    y: CANVAS_SIZE / 2 - PADDLE_LENGTH / 2,
    name: 'left',
    color: 'white',
    buzzerId: 'Controller 1',
    lives: 0,
    type: 'dummy',
  },
  right: {
    x: CANVAS_SIZE - PADDLE_THICKNESS - PADDLE_OFFSET,
    y: CANVAS_SIZE / 2 - PADDLE_LENGTH / 2,
    name: 'right',
    color: 'white',
    buzzerId: '',
    lives: 0,
    type: 'dummy',
  },
};

const DEFAULT_WALLS: Wall[] = [
  {
    x: WALL_OFFSET,
    y: WALL_OFFSET + WALL_THICKNESS,
    width: WALL_THICKNESS,
    height: WALL_LENGTH,
    position: 'left',
  },
  {
    x: WALL_OFFSET + WALL_THICKNESS,
    y: WALL_OFFSET,
    width: WALL_LENGTH,
    height: WALL_THICKNESS,
    position: 'top',
  },
  {
    x: CANVAS_SIZE - WALL_OFFSET - WALL_THICKNESS,
    y: WALL_OFFSET + WALL_THICKNESS,
    width: WALL_THICKNESS,
    height: WALL_LENGTH,
    position: 'right',
  },
  {
    x: CANVAS_SIZE - WALL_OFFSET - WALL_LENGTH - WALL_THICKNESS,
    y: WALL_OFFSET,
    width: WALL_LENGTH,
    height: WALL_THICKNESS,
    position: 'top',
  },
  {
    x: WALL_OFFSET,
    y: CANVAS_SIZE - WALL_OFFSET - WALL_LENGTH - WALL_THICKNESS,
    width: WALL_THICKNESS,
    height: WALL_LENGTH,
    position: 'left',
  },
  {
    x: WALL_OFFSET + WALL_THICKNESS,
    y: CANVAS_SIZE - WALL_OFFSET - WALL_THICKNESS,
    width: WALL_LENGTH,
    height: WALL_THICKNESS,
    position: 'bottom',
  },
  {
    x: CANVAS_SIZE - WALL_OFFSET - WALL_THICKNESS,
    y: CANVAS_SIZE - WALL_OFFSET - WALL_LENGTH - WALL_THICKNESS,
    width: WALL_THICKNESS,
    height: WALL_LENGTH,
    position: 'right',
  },
  {
    x: CANVAS_SIZE - WALL_OFFSET - WALL_LENGTH - WALL_THICKNESS,
    y: CANVAS_SIZE - WALL_OFFSET - WALL_THICKNESS,
    width: WALL_LENGTH,
    height: WALL_THICKNESS,
    position: 'bottom',
  },
];

const Quadrapong: NextPage = () => {
  const router = useRouter();
  const playSound = usePongAudio();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paddleAudioRef = useRef<HTMLAudioElement | null>(null);
  const wallAudioRef = useRef<HTMLAudioElement | null>(null);
  const scoreAudioRef = useRef<HTMLAudioElement | null>(null);
  const [startingLives, setStartingLives] = useState(STARTING_LIVES);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [numActivePlayers, setNumActivePlayers] = useState(0);
  const [initialAngle] = useState(Math.random() * Math.PI * 2);
  const [, setRenderTrigger] = useState({});
  const stateRef = useRef<State>({
    lastTick: 0,
    winner: null,
    phase: 'not_started',
    walls: structuredClone(DEFAULT_WALLS),
    players: structuredClone(DEFAULT_PLAYERS),
    ball: {
      x: CANVAS_SIZE / 2,
      y: CANVAS_SIZE / 2,
      dx: INITIAL_BALL_SPEED * Math.sin(initialAngle),
      dy: INITIAL_BALL_SPEED * Math.cos(initialAngle),
    },
    gameOverText: '',
  });

  const makeWall = useCallback(
    (position: 'left' | 'right' | 'bottom' | 'top') => {
      const { players, walls } = stateRef.current;
      let newWall: Wall | null = null;

      if (position === 'left') {
        newWall = {
          x: WALL_OFFSET,
          y: WALL_OFFSET + WALL_THICKNESS,
          width: WALL_THICKNESS,
          height: CANVAS_SIZE - 2 * WALL_OFFSET - 2 * WALL_THICKNESS,
          color: players.left.color,
          position: 'left',
        };
      } else if (position === 'right') {
        newWall = {
          x: CANVAS_SIZE - WALL_OFFSET - WALL_THICKNESS,
          y: WALL_OFFSET + WALL_THICKNESS,
          width: WALL_THICKNESS,
          height: CANVAS_SIZE - 2 * WALL_OFFSET - 2 * WALL_THICKNESS,
          color: players.right.color,
          position: 'right',
        };
      } else if (position === 'top') {
        newWall = {
          x: WALL_OFFSET + WALL_THICKNESS,
          y: WALL_OFFSET,
          width: CANVAS_SIZE - 2 * WALL_OFFSET - 2 * WALL_THICKNESS,
          height: WALL_THICKNESS,
          color: players.top.color,
          position: 'top',
        };
      } else if (position === 'bottom') {
        newWall = {
          x: WALL_OFFSET + WALL_THICKNESS,
          y: CANVAS_SIZE - WALL_OFFSET - WALL_THICKNESS,
          width: CANVAS_SIZE - 2 * WALL_OFFSET - 2 * WALL_THICKNESS,
          height: WALL_THICKNESS,
          color: players.bottom.color,
          position: 'bottom',
        };
      }

      // Remove existing walls with overlap because
      // collisions get weird with multiple walls
      stateRef.current.walls = walls.filter(
        (wall) =>
          wall.x + wall.width <= newWall!.x ||
          wall.x >= newWall!.x + newWall!.width ||
          wall.y + wall.height <= newWall!.y ||
          wall.y >= newWall!.y + newWall!.height,
      );
      stateRef.current.walls.push(newWall!);
    },
    [],
  );

  // Get teams from backend
  useEffect(() => {
    const state = stateRef.current;

    if (DEBUG) {
      state.players = structuredClone(DEFAULT_PLAYERS);
      setLoadingPlayers(false);
      return;
    }

    ListTeams()
      .then((teams) => {
        const positions: Array<'bottom' | 'top' | 'left' | 'right'> = [
          'bottom',
          'top',
          'right',
          'left',
        ];

        for (let i = 0; i < teams.length; i++) {
          const position = positions[i];
          const team = teams[i];

          state.players[position] = {
            name: team.name,
            color: team.color,
            buzzerId: team.buzzerId || '',
            lives: startingLives,
            x: DEFAULT_PLAYERS[position].x,
            y: DEFAULT_PLAYERS[position].y,
            type: 'player',
          };
        }
        setNumActivePlayers(teams.length);
        setLoadingPlayers(false);
      })
      .catch((err) => console.error(err));
  }, [startingLives, makeWall]); // Re-runs every time startingLives changes, inefficient, eh

  useEffect(() => {
    if (canvasRef.current === null) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    let animationFrameId: number;

    const update = (deltaTime: number) => {
      const { ball, players, walls } = stateRef.current;

      if (stateRef.current.phase !== 'in_progress') {
        return;
      }

      // Move players
      ReadControllers().then((json) => {
        const controllers = JSON.parse(json);

        for (const [position, player] of Object.entries(players)) {
          const controller = controllers[player.buzzerId];
          if (!controller) continue;

          if (position === 'left' || position === 'right') {
            const dy = -controller.LeftJoystick.Y || 0; // invert Y axis
            player.y = Math.max(
              PADDLE_STOP,
              Math.min(
                CANVAS_SIZE - PADDLE_LENGTH - PADDLE_STOP,
                player.y + dy * deltaTime * JOYSTICK_SENSITIVITY,
              ),
            );
          } else {
            const dx = controller.LeftJoystick.X || 0;
            player.x = Math.max(
              PADDLE_STOP,
              Math.min(
                CANVAS_SIZE - PADDLE_LENGTH - PADDLE_STOP,
                player.x + dx * deltaTime * JOYSTICK_SENSITIVITY,
              ),
            );
          }
        }
      });

      // Update ball position
      ball.x += ball.dx * deltaTime;
      ball.y += ball.dy * deltaTime;

      const [bl, br, bt, bb] = [
        ball.x,
        ball.x + BALL_SIZE,
        ball.y,
        ball.y + BALL_SIZE,
      ];

      // Collision with players
      for (const [position, player] of Object.entries(players)) {
        // Only check collision if player is still in the game
        if (player.lives <= 0) {
          continue;
        }

        let [pl, pr, pt, pb] = [
          player.x,
          player.x +
            (position === 'left' || position === 'right'
              ? PADDLE_THICKNESS
              : PADDLE_LENGTH),
          player.y,
          player.y +
            (position === 'left' || position === 'right'
              ? PADDLE_LENGTH
              : PADDLE_THICKNESS),
        ];

        // Avoid tunneling effect from fast balls
        if (position === 'left') {
          pl -= COLLISION_EXTENSION;
        } else if (position === 'right') {
          pr += COLLISION_EXTENSION;
        } else if (position === 'top') {
          pt -= COLLISION_EXTENSION;
        } else if (position === 'bottom') {
          pb += COLLISION_EXTENSION;
        }

        // Check if ball is colliding with player
        if (bb > pt && bt < pb && br > pl && bl < pr) {
          // Reset ball to 'front' of paddle
          if (position === 'left') {
            ball.x = pr;
          } else if (position === 'right') {
            ball.x = pl - BALL_SIZE;
          } else if (position === 'top') {
            ball.y = pb;
          } else if (position === 'bottom') {
            ball.y = pt - BALL_SIZE;
          }

          // Calculate the collision point
          const collisionPoint =
            position === 'left' || position === 'right'
              ? (ball.y + BALL_SIZE / 2 - pt) / (pb - pt)
              : (ball.x + BALL_SIZE / 2 - pl) / (pr - pl);

          // Normalize collision point to [-1, 1]
          const normalizedCollisionPoint = collisionPoint * 2 - 1;

          // Calculate new angle (up to 75 degrees)
          const maxAngle = (Math.PI * 5) / 12; // 75 degrees
          const newAngle =
            normalizedCollisionPoint *
            maxAngle *
            (position === 'left' || position === 'right' ? -1 : 1);

          const speed =
            SPEED_MULTIPLIER * Math.sqrt(ball.dx ** 2 + ball.dy ** 2);

          // Update ball direction based on which paddle was hit
          if (position === 'left' || position === 'right') {
            ball.dx =
              speed * Math.cos(newAngle) * (position === 'left' ? 1 : -1);
            ball.dy = speed * -Math.sin(newAngle);
          } else {
            ball.dx = speed * Math.sin(newAngle);
            ball.dy =
              speed * Math.cos(newAngle) * (position === 'top' ? 1 : -1);
          }

          playSound('paddle');

          return;
        }
      }

      // Collision with walls
      // Unlike player collision, this is always a standard reflection
      for (const wall of walls) {
        let [wl, wr, wt, wb] = [
          wall.x,
          wall.x + wall.width,
          wall.y,
          wall.y + wall.height,
        ];

        // Avoid tunneling effect from fast balls
        if (wall.position === 'left') {
          wl -= COLLISION_EXTENSION;
        } else if (wall.position === 'right') {
          wr += COLLISION_EXTENSION;
        } else if (wall.position === 'top') {
          wt -= COLLISION_EXTENSION;
        } else if (wall.position === 'bottom') {
          wb += COLLISION_EXTENSION;
        }

        // Check if ball is colliding with wall
        if (br > wl && bl < wr && bb > wt && bt < wb) {
          // Reset ball to 'front' of wall
          if (wall.position === 'left') {
            ball.x = wr;
          } else if (wall.position === 'right') {
            ball.x = wl - BALL_SIZE;
          } else if (wall.position === 'top') {
            ball.y = wb;
          } else if (wall.position === 'bottom') {
            ball.y = wt - BALL_SIZE;
          }

          if (wall.width > wall.height) {
            // Horizontal wall
            ball.dy = -ball.dy * SPEED_MULTIPLIER;
            ball.dx = ball.dx * SPEED_MULTIPLIER;
          } else {
            // Vertical wall
            ball.dx = -ball.dx * SPEED_MULTIPLIER;
            ball.dy = ball.dy * SPEED_MULTIPLIER;
          }

          playSound('wall');

          return;
        }
      }

      // Reset ball when out of bounds & reduce player lives
      if (
        bl < WALL_OFFSET ||
        br > CANVAS_SIZE - WALL_OFFSET ||
        bt < WALL_OFFSET ||
        bb > CANVAS_SIZE - WALL_OFFSET
      ) {
        // Reduce lives. Let it go negative, we use the 0 marker to add
        // additional walls to the game area
        if (bl < WALL_OFFSET) {
          players.left.lives -= 1;
          playSound('score');
          if (players.left.lives === 0) {
            makeWall('left');
          }
        }
        if (br > CANVAS_SIZE - WALL_OFFSET) {
          players.right.lives -= 1;
          playSound('score');
          if (players.right.lives === 0) {
            makeWall('right');
          }
        }
        if (bt < WALL_OFFSET) {
          players.top.lives -= 1;
          playSound('score');
          if (players.top.lives === 0) {
            makeWall('top');
          }
        }
        if (bb > CANVAS_SIZE - WALL_OFFSET) {
          console.log('lives before', players.bottom.lives);
          players.bottom.lives -= 1;
          console.log('lives after', players.bottom.lives);
          playSound('score');
          if (players.bottom.lives === 0) {
            console.log('making wall bottom');
            makeWall('bottom');
          }
        }

        ball.x = CANVAS_SIZE / 2;
        ball.y = CANVAS_SIZE / 2;
        ball.dx = 0;
        ball.dy = 0;

        // If there is only one player left & we started with multiple players, game over
        let playersLeft = 0;
        for (const player of Object.values(players)) {
          if (player.lives > 0) {
            playersLeft += 1;
            // Set winner now, will be unset if there is more than one player left
            stateRef.current.winner = player;
          }
        }
        if (playersLeft === 1 && numActivePlayers > 1) {
          stateRef.current.phase = 'game_over';
          stateRef.current.gameOverText =
            `${stateRef.current.winner!.name}   wins!`.toUpperCase();
        } else if (playersLeft === 0 && numActivePlayers == 1) {
          stateRef.current.phase = 'game_over';
          stateRef.current.gameOverText = 'GAME   OVER';
          stateRef.current.winner = null;
        } else {
          stateRef.current.winner = null;
        }

        // Pause before firing ball again
        setTimeout(() => {
          const randomAngle = Math.random() * Math.PI * 2;
          ball.dx = INITIAL_BALL_SPEED * Math.sin(randomAngle);
          ball.dy = INITIAL_BALL_SPEED * Math.cos(randomAngle);
        }, 0);
      }
    };

    const render = () => {
      const { ball, players, walls } = stateRef.current;
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Draw walls
      for (const wall of walls) {
        ctx.fillStyle = wall.color ?? 'white';
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      }

      // Draw player-related elements
      for (const [position, player] of Object.entries(players)) {
        if (player.lives <= 0) {
          // Don't draw player if they're out of the game
          // Walls will be drawn in their place
          continue;
        }

        // Draw player paddle
        ctx.fillStyle = 'white';
        if (position === 'left' || position === 'right') {
          ctx.fillRect(player.x, player.y, PADDLE_THICKNESS, PADDLE_LENGTH);
        } else {
          ctx.fillRect(player.x, player.y, PADDLE_LENGTH, PADDLE_THICKNESS);
        }

        // Draw player lives
        ctx.fillStyle = player.color;
        for (let i = 0; i < player.lives; i++) {
          if (position === 'left') {
            ctx.fillRect(
              0,
              WALL_OFFSET +
                WALL_THICKNESS +
                WALL_LENGTH -
                SCORE_THICKNESS -
                1 -
                i * SCORE_GAP,
              SCORE_LENGTH,
              SCORE_THICKNESS,
            );
          }
          if (position === 'right') {
            ctx.fillRect(
              CANVAS_SIZE - SCORE_LENGTH,
              CANVAS_SIZE -
                WALL_OFFSET -
                WALL_THICKNESS -
                WALL_LENGTH +
                1 +
                i * SCORE_GAP,
              SCORE_LENGTH,
              SCORE_THICKNESS,
            );
          }
          if (position === 'top') {
            ctx.fillRect(
              CANVAS_SIZE -
                WALL_OFFSET -
                WALL_THICKNESS -
                WALL_LENGTH +
                1 +
                i * SCORE_GAP,
              0,
              SCORE_THICKNESS,
              SCORE_LENGTH,
            );
          }
          if (position === 'bottom') {
            ctx.fillRect(
              WALL_OFFSET +
                WALL_THICKNESS +
                WALL_LENGTH -
                SCORE_THICKNESS -
                1 -
                i * SCORE_GAP,
              CANVAS_SIZE - SCORE_LENGTH,
              SCORE_THICKNESS,
              SCORE_LENGTH,
            );
          }
        }
      }

      // Draw (square) ball
      if (stateRef.current.phase !== 'game_over') {
        ctx.fillStyle = 'white';
        ctx.fillRect(ball.x, ball.y, BALL_SIZE, BALL_SIZE);
      }

      if (stateRef.current.phase === 'game_over') {
        ctx.font = '36px Pong Score';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = stateRef.current.winner?.color || 'white';
        ctx.fillText(
          stateRef.current.gameOverText,
          CANVAS_SIZE / 2,
          CANVAS_SIZE / 2,
        );
        return;
      }
    };

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
      render();
      setRenderTrigger({});
      animationFrameId = window.requestAnimationFrame(loop);
    };

    animationFrameId = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [playSound, makeWall, numActivePlayers]);

  const start = useCallback(() => {
    const state = stateRef.current;

    stateRef.current = {
      ...stateRef.current,
      phase: 'in_progress',
      walls: structuredClone(DEFAULT_WALLS),
      players: {
        left: {
          ...state.players.left,
          x: 0 + PADDLE_OFFSET,
          y: CANVAS_SIZE / 2 - PADDLE_LENGTH / 2,
        },
        right: {
          ...state.players.right,
          x: CANVAS_SIZE - PADDLE_THICKNESS - PADDLE_OFFSET,
          y: CANVAS_SIZE / 2 - PADDLE_LENGTH / 2,
        },
        top: {
          ...state.players.top,
          x: CANVAS_SIZE / 2 - PADDLE_LENGTH / 2,
          y: 0 + PADDLE_OFFSET,
        },
        bottom: {
          ...state.players.bottom,
          x: CANVAS_SIZE / 2 - PADDLE_LENGTH / 2,
          y: CANVAS_SIZE - PADDLE_THICKNESS - PADDLE_OFFSET,
        },
      },
    };

    for (const [position, player] of Object.entries(stateRef.current.players)) {
      // If no players
      if (player.type === 'dummy') {
        makeWall(position as any);
      }
    }

    console.log('stateRef.current', stateRef.current);
  }, [makeWall]);

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

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-950">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        // className="border border-solid border-white"
      />
      <div
        className="flex flex-col items-center justify-center"
        style={{
          visibility:
            stateRef.current.phase === 'in_progress' ? 'hidden' : 'visible',
        }}
      >
        <input
          className="w-10 mx-4"
          type="number"
          placeholder="lives"
          value={startingLives}
          min={1}
          max={10}
          onChange={(e) => {
            setStartingLives(e.target.valueAsNumber);
          }}
        />
        <button
          className="text-sm px-3 py-1 mb-0 mt-2"
          disabled={loadingPlayers}
          onClick={() => start()}
        >
          {stateRef.current.phase === 'not_started' ? 'Start' : 'Play again'}
        </button>
      </div>
      <audio
        ref={paddleAudioRef}
        src="/audio/pong/paddle.wav"
        style={{ display: 'none' }}
        preload="auto"
      ></audio>
      <audio
        ref={wallAudioRef}
        src="/audio/pong/wall.wav"
        style={{ display: 'none' }}
        preload="auto"
      ></audio>
      <audio
        ref={scoreAudioRef}
        src="/audio/pong/score.wav"
        style={{ display: 'none' }}
        preload="auto"
      ></audio>
    </div>
  );
};

export default Quadrapong;
