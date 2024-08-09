import { NextPage } from 'next';
import React, { useEffect, useRef, useState } from 'react';

const CANVAS_SIZE = 600;
const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 6;
const WALL_THICKNESS = PADDLE_HEIGHT;
const WALL_LENGTH = 80;
const WALL_OFFSET = 8;
const PADDLE_OFFSET = WALL_OFFSET + WALL_THICKNESS + 8;
// Let the paddle stop 4 pixels from the wall
const PADDLE_STOP = WALL_OFFSET + WALL_THICKNESS + 4;
const BALL_SIZE = 8;
const INITIAL_BALL_SPEED = 3;
const PADDLE_SPEED = 15;
const GRACE_DIST = 1;

type Paddle = {
  x: number;
  y: number;
  vertical: boolean;
  color: string;
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
  paddles: Paddle[];
  ball: Ball;
  score: { top: number; bottom: number; left: number; right: number };
  keys: { [key: string]: boolean };
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
    paddles: [
      {
        x: CANVAS_SIZE / 2 - PADDLE_WIDTH / 2,
        y: 0 + PADDLE_OFFSET,
        vertical: false,
        color: '#E8293C',
      },
      {
        x: CANVAS_SIZE / 2 - PADDLE_WIDTH / 2,
        y: CANVAS_SIZE - PADDLE_HEIGHT - PADDLE_OFFSET,
        vertical: false,
        color: '#5596E6',
      },
      {
        x: 0 + PADDLE_OFFSET,
        y: CANVAS_SIZE / 2 - PADDLE_WIDTH / 2,
        vertical: true,
        color: '#00B4A0',
      },
      {
        x: CANVAS_SIZE - PADDLE_HEIGHT - PADDLE_OFFSET,
        y: CANVAS_SIZE / 2 - PADDLE_WIDTH / 2,
        vertical: true,
        color: '#FDD600',
      },
    ],
    ball: {
      x: CANVAS_SIZE / 2,
      y: CANVAS_SIZE / 2,
      dx: INITIAL_BALL_SPEED * Math.sin(initialAngle),
      dy: INITIAL_BALL_SPEED * Math.cos(initialAngle),
      speed: INITIAL_BALL_SPEED,
    },
    score: { top: 0, bottom: 0, left: 0, right: 0 },
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
      const { ball, keys, paddles, walls } = stateRef.current;

      // Move paddles
      const paddle = paddles[1];

      switch (true) {
        case keys.a:
          paddle.x = Math.max(PADDLE_STOP, paddle.x - PADDLE_SPEED);
          break;
        case keys.d:
          paddle.x = Math.min(
            CANVAS_SIZE - PADDLE_WIDTH - PADDLE_STOP,
            paddle.x + PADDLE_SPEED,
          );
          break;
      }

      // Move ball
      // TODO mimic atari pong ball physics
      ball.x += ball.dx;
      ball.y += ball.dy;

      const [bl, br, bt, bb] = [
        ball.x,
        ball.x + BALL_SIZE,
        ball.y,
        ball.y + BALL_SIZE,
      ];

      // Collision with paddles
      for (const paddle of paddles) {
        if (paddle.vertical) {
          if (
            // bottom of ball > top of paddle
            bb + GRACE_DIST > paddle.y &&
            // top of ball < bottom of paddle
            bt - GRACE_DIST < paddle.y + PADDLE_WIDTH &&
            Math.abs(ball.x - paddle.x) < BALL_SIZE / 2 + PADDLE_HEIGHT / 2
          ) {
            // Angle ranges from -60 to 60 deg based on distance from center of paddle
            // [-1, 1] where -1 is top edge of paddle and 1 is bottom edge of paddle
            const angle =
              (((ball.y + BALL_SIZE / 2 - paddle.y - PADDLE_WIDTH / 2) /
                (PADDLE_WIDTH / 2)) *
                Math.PI) /
              3;
            // x negative if should move left, positive if should move right
            const sign = Math.sign(ball.x - paddle.x);

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
            // right of ball > left of paddle
            br + GRACE_DIST > paddle.x &&
            // left of ball < right of paddle
            bl - GRACE_DIST < paddle.x + PADDLE_WIDTH &&
            Math.abs(ball.y - paddle.y) < BALL_SIZE / 2 + PADDLE_HEIGHT / 2
          ) {
            const angle =
              (((ball.x + BALL_SIZE / 2 - paddle.x - PADDLE_WIDTH / 2) /
                (PADDLE_WIDTH / 2)) *
                Math.PI) /
              3;
            const sign = Math.sign(ball.y - paddle.y);
            ball.speed *= 1.1;
            ball.dx = ball.speed * Math.sin(angle);
            ball.dy = ball.speed * Math.cos(angle) * sign;
          }
        }
      }

      // Collision with walls
      // Unlike paddle collision, this is always a standard reflection
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

      // Draw paddles
      ctx.fillStyle = 'white';
      for (const paddle of state.paddles) {
        if (paddle.vertical) {
          ctx.fillRect(paddle.x, paddle.y, PADDLE_HEIGHT, PADDLE_WIDTH);
        } else {
          ctx.fillRect(paddle.x, paddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);
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
