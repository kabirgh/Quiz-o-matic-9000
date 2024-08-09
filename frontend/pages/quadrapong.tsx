import { NextPage } from 'next';
import React, { useEffect, useRef, useState } from 'react';

const CANVAS_SIZE = 600;
const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 6;
const WALL_THICKNESS = PADDLE_HEIGHT;
const WALL_LENGTH = 80;
const WALL_OFFSET = 8;
const PADDLE_OFFSET = WALL_OFFSET + WALL_THICKNESS + 8;
// Let the player stop 4 pixels from the wall
const PADDLE_STOP = WALL_OFFSET + WALL_THICKNESS + 4;
const BALL_SIZE = 8;
const INITIAL_BALL_SPEED = 3;
const PADDLE_SPEED = 15;
const GRACE_DIST = 1;

type Player = {
  x: number;
  y: number;
  name: string;
  color: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  score: number;
};

type Ball = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  speed: number;
};

type State = {
  walls: { x: number; y: number; width: number; height: number }[];
  players: Player[];
  ball: Ball;
  keys: { [key: string]: boolean };
};

const roundBetween = (num: number, min: number, max: number) => {
  return Math.round((num - min) / (max - min)) * (max - min) + min;
};

const Quadrapong: NextPage = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [initialAngle] = useState(Math.random() * Math.PI * 2);
  const stateRef = useRef<State>({
    walls: [
      {
        x: WALL_OFFSET,
        y: WALL_OFFSET + WALL_THICKNESS,
        width: WALL_THICKNESS,
        height: WALL_LENGTH,
      },
      {
        x: WALL_OFFSET + WALL_THICKNESS,
        y: WALL_OFFSET,
        width: WALL_LENGTH,
        height: WALL_THICKNESS,
      },
      {
        x: CANVAS_SIZE - WALL_OFFSET - WALL_THICKNESS,
        y: WALL_OFFSET + WALL_THICKNESS,
        width: WALL_THICKNESS,
        height: WALL_LENGTH,
      },
      {
        x: CANVAS_SIZE - WALL_OFFSET - WALL_LENGTH - WALL_THICKNESS,
        y: WALL_OFFSET,
        width: WALL_LENGTH,
        height: WALL_THICKNESS,
      },
      {
        x: WALL_OFFSET,
        y: CANVAS_SIZE - WALL_OFFSET - WALL_LENGTH - WALL_THICKNESS,
        width: WALL_THICKNESS,
        height: WALL_LENGTH,
      },
      {
        x: WALL_OFFSET + WALL_THICKNESS,
        y: CANVAS_SIZE - WALL_OFFSET - WALL_THICKNESS,
        width: WALL_LENGTH,
        height: WALL_THICKNESS,
      },
      {
        x: CANVAS_SIZE - WALL_OFFSET - WALL_THICKNESS,
        y: CANVAS_SIZE - WALL_OFFSET - WALL_LENGTH - WALL_THICKNESS,
        width: WALL_THICKNESS,
        height: WALL_LENGTH,
      },
      {
        x: CANVAS_SIZE - WALL_OFFSET - WALL_LENGTH - WALL_THICKNESS,
        y: CANVAS_SIZE - WALL_OFFSET - WALL_THICKNESS,
        width: WALL_LENGTH,
        height: WALL_THICKNESS,
      },
    ],
    players: [
      {
        x: CANVAS_SIZE / 2 - PADDLE_WIDTH / 2,
        y: 0 + PADDLE_OFFSET,
        position: 'top',
        name: 'top',
        color: '#E8293C',
        score: 4,
      },
      {
        x: CANVAS_SIZE / 2 - PADDLE_WIDTH / 2,
        y: CANVAS_SIZE - PADDLE_HEIGHT - PADDLE_OFFSET,
        position: 'bottom',
        name: 'bottom',
        color: '#5596E6',
        score: 4,
      },
      {
        x: 0 + PADDLE_OFFSET,
        y: CANVAS_SIZE / 2 - PADDLE_WIDTH / 2,
        position: 'left',
        name: 'left',
        color: '#00B4A0',
        score: 4,
      },
      {
        x: CANVAS_SIZE - PADDLE_HEIGHT - PADDLE_OFFSET,
        y: CANVAS_SIZE / 2 - PADDLE_WIDTH / 2,
        position: 'right',
        name: 'right',
        color: '#FDD600',
        score: 4,
      },
    ],
    ball: {
      x: CANVAS_SIZE / 2,
      y: CANVAS_SIZE / 2,
      dx: INITIAL_BALL_SPEED * Math.sin(initialAngle),
      dy: INITIAL_BALL_SPEED * Math.cos(initialAngle),
      speed: INITIAL_BALL_SPEED,
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

  useEffect(() => {
    if (canvasRef.current === null) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    let animationFrameId: number;

    const update = () => {
      const { ball, keys, players, walls } = stateRef.current;

      // Move players
      const player = players[1];

      switch (true) {
        case keys.a:
          player.x = Math.max(PADDLE_STOP, player.x - PADDLE_SPEED);
          break;
        case keys.d:
          player.x = Math.min(
            CANVAS_SIZE - PADDLE_WIDTH - PADDLE_STOP,
            player.x + PADDLE_SPEED,
          );
          break;
      }

      // Move ball
      ball.x += ball.dx;
      ball.y += ball.dy;

      const [bl, br, bt, bb] = [
        ball.x,
        ball.x + BALL_SIZE,
        ball.y,
        ball.y + BALL_SIZE,
      ];

      // Collision with players
      for (const player of players) {
        if (player.position === 'left' || player.position === 'right') {
          if (
            // bottom of ball > top of player
            bb + GRACE_DIST > player.y &&
            // top of ball < bottom of player
            bt - GRACE_DIST < player.y + PADDLE_WIDTH &&
            Math.abs(ball.x - player.x) < BALL_SIZE / 2 + PADDLE_HEIGHT / 2
          ) {
            // If ball is inside player, move it towards the game area
            if (
              player.position === 'left' &&
              ball.x < player.x + PADDLE_HEIGHT
            ) {
              ball.x = player.x + PADDLE_HEIGHT;
            } else if (player.position === 'right' && ball.x > player.x) {
              ball.x = player.x;
            }
            // Angle ranges from -60 to 60 deg based on distance from center of player
            // [-1, 1] where -1 is top edge of player and 1 is bottom edge of player
            const angle =
              (((ball.y + BALL_SIZE / 2 - player.y - PADDLE_WIDTH / 2) /
                (PADDLE_WIDTH / 2)) *
                Math.PI) /
              3;
            // x negative if should move left, positive if should move right
            const sign = Math.sign(ball.x - player.x);

            // For a reflection like
            // |  /|
            // | / |
            // |/th|
            // |--------
            // |
            //
            // - dx = INITIAL_BALL_SPEED cos t
            // - dy = INITIAL_BALL_SPEED sin t
            // First increase the speed
            ball.speed *= 1.1;
            ball.dx = ball.speed * Math.cos(angle) * sign;
            ball.dy = ball.speed * Math.sin(angle);
          }
        } else {
          if (
            // right of ball > left of player
            br + GRACE_DIST > player.x &&
            // left of ball < right of player
            bl - GRACE_DIST < player.x + PADDLE_WIDTH &&
            Math.abs(ball.y - player.y) < BALL_SIZE / 2 + PADDLE_HEIGHT / 2
          ) {
            // If ball is inside player, move it towards the game area
            if (
              player.position === 'top' &&
              ball.y < player.y + PADDLE_HEIGHT
            ) {
              ball.y = player.y + PADDLE_HEIGHT;
            } else if (player.position === 'bottom' && ball.y > player.y) {
              ball.y = player.y;
            }

            const angle =
              (((ball.x + BALL_SIZE / 2 - player.x - PADDLE_WIDTH / 2) /
                (PADDLE_WIDTH / 2)) *
                Math.PI) /
              3;
            const sign = Math.sign(ball.y - player.y);
            ball.speed *= 1.1;
            ball.dx = ball.speed * Math.sin(angle);
            ball.dy = ball.speed * Math.cos(angle) * sign;
          }
        }
      }

      // Collision with walls
      // Unlike player collision, this is always a standard reflection
      for (const wall of walls) {
        if (
          // right of ball > left of wall
          br > wall.x &&
          // left of ball < right of wall
          bl < wall.x + wall.width &&
          // bottom of ball > top of wall
          bb + BALL_SIZE > wall.y &&
          // top of ball < bottom of wall
          bt < wall.y + wall.height
        ) {
          ball.speed *= 1.1;
          if (wall.width > wall.height) {
            // horizontal wall
            ball.dy = -ball.dy;
          } else {
            // vertical wall
            ball.dx = -ball.dx;
          }
        }
      }

      // Reset ball when out of bounds
      if (
        ball.x < 0 ||
        ball.x > CANVAS_SIZE ||
        ball.y < 0 ||
        ball.y > CANVAS_SIZE
      ) {
        ball.x = CANVAS_SIZE / 2;
        ball.y = CANVAS_SIZE / 2;
        ball.dx = 0;
        ball.dy = 0;
        ball.speed = INITIAL_BALL_SPEED;
        // Start moving after some time
        setTimeout(() => {
          const randomAngle = Math.random() * Math.PI * 2;
          ball.dx = ball.speed * Math.sin(randomAngle);
          ball.dy = ball.speed * Math.cos(randomAngle);
        }, 0);
      }
    };

    const render = () => {
      const state = stateRef.current;
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Draw corner walls
      ctx.fillStyle = 'white';
      for (const wall of state.walls) {
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      }

      // Draw players
      ctx.fillStyle = 'white';
      for (const player of state.players) {
        if (player.position === 'left' || player.position === 'right') {
          ctx.fillRect(player.x, player.y, PADDLE_HEIGHT, PADDLE_WIDTH);
        } else {
          ctx.fillRect(player.x, player.y, PADDLE_WIDTH, PADDLE_HEIGHT);
        }
      }

      // Draw (square) ball
      ctx.fillRect(state.ball.x, state.ball.y, BALL_SIZE, BALL_SIZE);
    };

    const loop = () => {
      update();
      render();
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
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-800">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        // className="border border-solid border-white"
      />
    </div>
  );
};

export default Quadrapong;
