import { NextPage } from 'next';
import React, { useCallback, useEffect, useRef, useState } from 'react';

type Player = {
  x: number;
  y: number;
  name: string;
  color: string;
  lives: number;
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
  winner: null | Player;
  phase: 'not_started' | 'in_progress' | 'game_over';
  walls: Wall[];
  players: { left: Player; right: Player; top: Player; bottom: Player };
  ball: Ball;
  keys: { [key: string]: boolean };
};

const CANVAS_SIZE = 600;
const PADDLE_LENGTH = 80;
const PADDLE_THICKNESS = 6;
const WALL_THICKNESS = PADDLE_THICKNESS;
const WALL_LENGTH = 80;
const WALL_OFFSET = 18;
const PADDLE_OFFSET = WALL_OFFSET + WALL_THICKNESS + 8;
// Let the player stop 4 pixels from the wall
const PADDLE_STOP = WALL_OFFSET + WALL_THICKNESS + 4;
const BALL_SIZE = 8;
const INITIAL_BALL_SPEED = 3;
const SPEED_MULTIPLIER = 1.1;
const PADDLE_SPEED = 15;
const STARTING_LIVES = 1;
const SCORE_THICKNESS = 4;
const SCORE_LENGTH = 12;
// I'm not sure this works, but here just in case it helps at smaller speeds
const COLLISION_EXTENSION = 1000;

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paddleAudioRef = useRef<HTMLAudioElement | null>(null);
  const wallAudioRef = useRef<HTMLAudioElement | null>(null);
  const scoreAudioRef = useRef<HTMLAudioElement | null>(null);

  const [initialAngle] = useState(Math.random() * Math.PI * 2);
  const [, setRenderTrigger] = useState({});
  const stateRef = useRef<State>({
    winner: null,
    phase: 'not_started',
    walls: structuredClone(DEFAULT_WALLS),
    players: {
      top: {
        x: CANVAS_SIZE / 2 - PADDLE_LENGTH / 2,
        y: 0 + PADDLE_OFFSET,
        name: 'top',
        color: '#E8293C',
        lives: STARTING_LIVES,
      },
      bottom: {
        x: CANVAS_SIZE / 2 - PADDLE_LENGTH / 2,
        y: CANVAS_SIZE - PADDLE_THICKNESS - PADDLE_OFFSET,
        name: 'bottom',
        color: '#5596E6',
        lives: STARTING_LIVES,
      },
      left: {
        x: 0 + PADDLE_OFFSET,
        y: CANVAS_SIZE / 2 - PADDLE_LENGTH / 2,
        name: 'left',
        color: '#00B4A0',
        lives: STARTING_LIVES,
      },
      right: {
        x: CANVAS_SIZE - PADDLE_THICKNESS - PADDLE_OFFSET,
        y: CANVAS_SIZE / 2 - PADDLE_LENGTH / 2,
        name: 'right',
        color: '#FDD600',
        lives: STARTING_LIVES,
      },
    },
    ball: {
      x: CANVAS_SIZE / 2,
      y: CANVAS_SIZE / 2,
      dx: INITIAL_BALL_SPEED * Math.sin(initialAngle),
      dy: INITIAL_BALL_SPEED * Math.cos(initialAngle),
    },
    keys: {
      a: false,
      d: false,
      j: false,
      l: false,
      w: false,
      s: false,
      i: false,
      k: false,
    },
  });

  const playSound = useCallback((sound: 'paddle' | 'wall' | 'score') => {
    // Pause all other sounds before playing a new one
    paddleAudioRef.current?.pause();
    wallAudioRef.current?.pause();
    scoreAudioRef.current?.pause();

    switch (sound) {
      case 'paddle':
        if (paddleAudioRef.current === null) return;
        paddleAudioRef.current.currentTime = 0;
        paddleAudioRef.current.play();
        break;
      case 'wall':
        if (wallAudioRef.current === null) return;
        wallAudioRef.current.currentTime = 0;
        wallAudioRef.current.play();
        break;
      case 'score':
        if (scoreAudioRef.current === null) return;
        scoreAudioRef.current.currentTime = 0;
        scoreAudioRef.current.play();
        break;
    }
  }, []);

  useEffect(() => {
    if (canvasRef.current === null) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    let animationFrameId: number;

    const update = () => {
      const { ball, keys, players, walls } = stateRef.current;

      if (stateRef.current.phase !== 'in_progress') {
        return;
      }

      // Move players
      switch (true) {
        case keys.a:
          players.bottom.x = Math.max(
            PADDLE_STOP,
            players.bottom.x - PADDLE_SPEED,
          );
          break;
        case keys.d:
          players.bottom.x = Math.min(
            CANVAS_SIZE - PADDLE_LENGTH - PADDLE_STOP,
            players.bottom.x + PADDLE_SPEED,
          );
          break;
      }

      // Update ball position
      ball.x += ball.dx;
      ball.y += ball.dy;

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
          const newAngle = normalizedCollisionPoint * maxAngle;

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
        let newWall: Wall | null = null;
        if (bl < WALL_OFFSET) {
          players.left.lives -= 1;
          playSound('score');
          if (players.left.lives === 0) {
            newWall = {
              x: WALL_OFFSET,
              y: WALL_OFFSET + WALL_THICKNESS,
              width: WALL_THICKNESS,
              height: CANVAS_SIZE - 2 * WALL_OFFSET - 2 * WALL_THICKNESS,
              color: players.left.color,
              position: 'left',
            };
          }
        }
        if (br > CANVAS_SIZE - WALL_OFFSET) {
          players.right.lives -= 1;
          playSound('score');
          if (players.right.lives === 0) {
            newWall = {
              x: CANVAS_SIZE - WALL_OFFSET - WALL_THICKNESS,
              y: WALL_OFFSET + WALL_THICKNESS,
              width: WALL_THICKNESS,
              height: CANVAS_SIZE - 2 * WALL_OFFSET - 2 * WALL_THICKNESS,
              color: players.right.color,
              position: 'right',
            };
          }
        }
        if (bt < WALL_OFFSET) {
          players.top.lives -= 1;
          playSound('score');
          if (players.top.lives === 0) {
            newWall = {
              x: WALL_OFFSET + WALL_THICKNESS,
              y: WALL_OFFSET,
              width: CANVAS_SIZE - 2 * WALL_OFFSET - 2 * WALL_THICKNESS,
              height: WALL_THICKNESS,
              color: players.top.color,
              position: 'top',
            };
          }
        }
        if (bb > CANVAS_SIZE - WALL_OFFSET) {
          players.bottom.lives -= 1;
          playSound('score');
          if (players.bottom.lives === 0) {
            newWall = {
              x: WALL_OFFSET + WALL_THICKNESS,
              y: CANVAS_SIZE - WALL_OFFSET - WALL_THICKNESS,
              width: CANVAS_SIZE - 2 * WALL_OFFSET - 2 * WALL_THICKNESS,
              height: WALL_THICKNESS,
              color: players.bottom.color,
              position: 'bottom',
            };
          }
        }

        if (newWall) {
          // Remove existing walls with overlap because
          // collisions get weird with multiple walls
          stateRef.current.walls = walls.filter(
            (wall) =>
              // For some reason need the ! to make wails happy
              wall.x + wall.width <= newWall!.x ||
              wall.x >= newWall!.x + newWall!.width ||
              wall.y + wall.height <= newWall!.y ||
              wall.y >= newWall!.y + newWall!.height,
          );
          stateRef.current.walls.push(newWall);
        }

        ball.x = CANVAS_SIZE / 2;
        ball.y = CANVAS_SIZE / 2;
        ball.dx = 0;
        ball.dy = 0;

        // If there is only one player left, game over
        let playersLeft = 0;
        for (const player of Object.values(players)) {
          if (player.lives > 0) {
            playersLeft += 1;
            // Set winner now, will be unset if there is more than one player left
            stateRef.current.winner = player;
          }
        }
        if (playersLeft === 1) {
          stateRef.current.phase = 'game_over';
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
                i * 7,
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
                i * 7,
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
                i * 7,
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
                i * 7,
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
        ctx.fillStyle = stateRef.current.winner!.color;
        ctx.fillText(
          `${stateRef.current.winner!.name}   wins!`.toUpperCase(),
          CANVAS_SIZE / 2,
          CANVAS_SIZE / 2,
        );
        return;
      }
    };

    const loop = () => {
      update();
      render();
      setRenderTrigger({});
      animationFrameId = window.requestAnimationFrame(loop);
    };
    animationFrameId = window.requestAnimationFrame(loop);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key in stateRef.current.keys) {
        stateRef.current.keys[e.key] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key in stateRef.current.keys) {
        stateRef.current.keys[e.key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [playSound]);

  const start = useCallback(() => {
    stateRef.current = {
      ...stateRef.current,
      phase: 'in_progress',
      walls: structuredClone(DEFAULT_WALLS),
    };
    stateRef.current.players.left = {
      ...stateRef.current.players.left,
      lives: STARTING_LIVES,
      x: 0 + PADDLE_OFFSET,
      y: CANVAS_SIZE / 2 - PADDLE_LENGTH / 2,
    };
    stateRef.current.players.right = {
      ...stateRef.current.players.right,
      lives: STARTING_LIVES,
      x: CANVAS_SIZE - PADDLE_THICKNESS - PADDLE_OFFSET,
      y: CANVAS_SIZE / 2 - PADDLE_LENGTH / 2,
    };
    stateRef.current.players.top = {
      ...stateRef.current.players.top,
      lives: STARTING_LIVES,
      x: CANVAS_SIZE / 2 - PADDLE_LENGTH / 2,
      y: 0 + PADDLE_OFFSET,
    };
    stateRef.current.players.bottom = {
      ...stateRef.current.players.bottom,
      lives: STARTING_LIVES,
      x: CANVAS_SIZE / 2 - PADDLE_LENGTH / 2,
      y: CANVAS_SIZE - PADDLE_THICKNESS - PADDLE_OFFSET,
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-950">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        // className="border border-solid border-white"
      />
      <div>
        <button
          className="text-sm px-3 py-1 mb-0 mt-2"
          style={{
            visibility:
              stateRef.current.phase === 'in_progress' ? 'hidden' : 'visible',
          }}
          disabled={false}
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
