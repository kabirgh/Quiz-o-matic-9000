import type { NextPage } from "next";
import { useStore } from "../lib/store";

// import styles from './game.module.css'

const Game: NextPage = () => {
  const { store, setStore } = useStore();

  const rowSize = 100.0 / store.teams.length;
  const cardSize = 0.9 * rowSize;
  const spacerSize = 0.1 * rowSize;

  return (
    <div
      style={{
        backgroundColor: "#323232",
        height: "100vh",
        width: "100vw",
        display: "grid",
        gridTemplateColumns: "1fr 8fr 1fr",
        gridTemplateRows: `${spacerSize}fr ${store.teams
          .map((_team) => `${cardSize}fr ${spacerSize}fr`)
          .join(" ")}`,
      }}
    >
      {store.teams.map((team, index) => {
        const i = index + 1;
        const id = `row-${i}`;
        return (
          <div
            id={id}
            key={id}
            style={{
              gridArea: `${2 * i} / 2 / ${2 * i + 1} / 3`,
              backgroundColor: `${team.color}`,
              color: "black",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
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
