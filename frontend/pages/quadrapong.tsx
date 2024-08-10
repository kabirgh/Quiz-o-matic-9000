import { NextPage } from 'next';
import React, { useEffect, useRef, useState } from 'react';

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
  speed: number;
};

type Wall = {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
};

type State = {
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
const PADDLE_SPEED = 15;
const GRACE_DIST = 1;
const STARTING_LIVES = 1;
const SCORE_THICKNESS = 4;
const SCORE_LENGTH = 12;

const DEFAULT_WALLS = [
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
];

const Quadrapong: NextPage = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [initialAngle] = useState(Math.random() * Math.PI * 2);
  const stateRef = useRef<State>({
    phase: 'in_progress',
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

        const [pl, pr, pt, pb] = [
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

        // Check if ball is colliding with player
        if (bb > pt && bt < pb && br > pl && bl < pr) {
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

          // Update ball speed
          ball.speed *= 2;

          // Update ball direction based on which paddle was hit
          if (position === 'left' || position === 'right') {
            ball.dx =
              ball.speed * Math.cos(newAngle) * (position === 'left' ? 1 : -1);
            ball.dy = ball.speed * -Math.sin(newAngle);
          } else {
            ball.dx = ball.speed * Math.sin(newAngle);
            ball.dy =
              ball.speed * Math.cos(newAngle) * (position === 'top' ? 1 : -1);
          }
          return;
        }
      }

      // Collision with walls
      // Unlike player collision, this is always a standard reflection
      for (const wall of walls) {
        const [wl, wr, wt, wb] = [
          wall.x,
          wall.x + wall.width,
          wall.y,
          wall.y + wall.height,
        ];

        if (br > wl && bl < wr && bb > wt && bt < wb) {
          ball.speed *= 2;
          const mult = Math.sqrt(ball.speed);
          if (wall.width > wall.height) {
            // Horizontal wall
            ball.dy = -ball.dy * mult;
            ball.dx = ball.dx * mult;
          } else {
            // Vertical wall
            ball.dx = -ball.dx * mult;
            ball.dy = ball.dy * mult;
          }
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
        let newWall = null;
        if (bl < WALL_OFFSET) {
          players.left.lives -= 1;
          if (players.left.lives === 0) {
            newWall = {
              x: WALL_OFFSET,
              y: WALL_OFFSET + WALL_THICKNESS,
              width: WALL_THICKNESS,
              height: CANVAS_SIZE - 2 * WALL_OFFSET - 2 * WALL_THICKNESS,
              color: players.left.color,
            };
          }
        }
        if (br > CANVAS_SIZE - WALL_OFFSET) {
          players.right.lives -= 1;
          if (players.right.lives === 0) {
            newWall = {
              x: CANVAS_SIZE - WALL_OFFSET - WALL_THICKNESS,
              y: WALL_OFFSET + WALL_THICKNESS,
              width: WALL_THICKNESS,
              height: CANVAS_SIZE - 2 * WALL_OFFSET - 2 * WALL_THICKNESS,
              color: players.right.color,
            };
          }
        }
        if (bt < WALL_OFFSET) {
          players.top.lives -= 1;
          if (players.top.lives === 0) {
            newWall = {
              x: WALL_OFFSET + WALL_THICKNESS,
              y: WALL_OFFSET,
              width: CANVAS_SIZE - 2 * WALL_OFFSET - 2 * WALL_THICKNESS,
              height: WALL_THICKNESS,
              color: players.top.color,
            };
          }
        }
        if (bb > CANVAS_SIZE - WALL_OFFSET) {
          players.bottom.lives -= 1;
          if (players.bottom.lives === 0) {
            newWall = {
              x: WALL_OFFSET + WALL_THICKNESS,
              y: CANVAS_SIZE - WALL_OFFSET - WALL_THICKNESS,
              width: CANVAS_SIZE - 2 * WALL_OFFSET - 2 * WALL_THICKNESS,
              height: WALL_THICKNESS,
              color: players.bottom.color,
            };
          }
        }

        if (newWall) {
          // Remove existing walls with overlap because
          // collisions get weird with multiple walls
          stateRef.current.walls = walls.filter(
            (wall) =>
              wall.x + wall.width <= newWall.x ||
              wall.x >= newWall.x + newWall.width ||
              wall.y + wall.height <= newWall.y ||
              wall.y >= newWall.y + newWall.height,
          );
          stateRef.current.walls.unshift(newWall);
        }

        ball.x = CANVAS_SIZE / 2;
        ball.y = CANVAS_SIZE / 2;
        ball.dx = 0;
        ball.dy = 0;
        ball.speed = INITIAL_BALL_SPEED;

        // Pause before firing ball again
        setTimeout(() => {
          const randomAngle = Math.random() * Math.PI * 2;
          ball.dx = ball.speed * Math.sin(randomAngle);
          ball.dy = ball.speed * Math.cos(randomAngle);
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
      ctx.fillStyle = 'white';
      ctx.fillRect(ball.x, ball.y, BALL_SIZE, BALL_SIZE);
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
