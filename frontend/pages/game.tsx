import type { NextPage } from "next";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import type { Team } from "../lib/store";
import { useStore } from "../lib/store";
import useClientRect from "../lib/useClientRect";

// import styles from './game.module.css'

const Game: NextPage = () => {
  const router = useRouter();
  const { teams } = useStore();
  const [played, setPlayed] = useState([] as Team[]);
  const [rect, teamRowRef] = useClientRect();

  useEffect(() => {
    const keydownHandler = (event: any) => {
      switch (event.code) {
        case "KeyR":
          setPlayed([]);
          break;
        case "KeyS":
          setPlayed(teams);
          break;
        case "Backspace":
          setPlayed([]);
          router.push("/");
          break;
      }
    };

    addEventListener("keydown", keydownHandler);
    return () => {
      removeEventListener("keydown", keydownHandler);
    };
  }, [router, teams]);

  const rowSize = 100.0 / teams.length;
  const cardSize = 0.9 * rowSize;
  const spacerSize = 0.1 * rowSize;

  return (
    <div
      style={{
        fontFamily: "Arvo",
        backgroundColor: "#323232",
        height: "100vh",
        width: "100vw",
        display: "grid",
        gridTemplateColumns: "1fr 8fr 1fr",
        gridTemplateRows: `${spacerSize}fr ${teams
          .map((_team) => `${cardSize}fr ${spacerSize}fr`)
          .join(" ")}`,
      }}
    >
      {played.map((team, index) => {
        const i = index + 1;
        const id = `row-${i}`;
        return (
          <div
            id={id}
            key={id}
            ref={teamRowRef as any}
            style={{
              gridArea: `${2 * i} / 2 / ${2 * i + 1} / 3`,
              backgroundColor: `${team.color}`,
              color: "black",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize:
                rect === null || typeof rect !== "object"
                  ? 0
                  : 0.25 * rect.height,
            }}
          >
            {team.name}
          </div>
        );
      })}
    </div>
  );
};

export default Game;
