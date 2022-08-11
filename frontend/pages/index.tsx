import type { NextPage } from "next";

import { useEffect } from "react";
import Link from "next/link";
import { useStore } from "../lib/store";
import styles from "./index.module.css";
import { Greet } from "../wailsjs/wailsjs/go/main/App";

const Main: NextPage = () => {
  const { store, setStore } = useStore();

  return (
    <div className={styles.app}>
      <div className={styles.mainTitle}>Quiz-o-matic</div>
      <button id="add-btn" style={{ gridArea: "4/2/5/3" }}>
        Add
      </button>
      {store.teams.map((team, index) => {
        const i = index + 1;
        return (
          <>
            <button
              id={`team-${i + 1}-del-btn`}
              style={{ gridArea: `${2 * i + 4}/2/${2 * i + 5}/3` }}
            >
              Del
            </button>
            <input
              id={`team-${i + 1}-input`}
              style={{ gridArea: `${2 * i + 4}/4/${2 * i + 5}/5` }}
              value={team.name}
              onChange={(event) => {
                const teams = [...store.teams];
                teams[index].name = event.target.value;
                setStore({ ...store, teams: teams });
              }}
            />
            <button
              id={`team-${i + 1}-register-btn`}
              style={{ gridArea: `${2 * i + 4}/6/${2 * i + 5}/7` }}
            >
              Register
            </button>
          </>
        );
      })}

      <Link href="/game">
        <button id="start-btn" style={{ gridArea: "22/10/23/11" }}>
          Start
        </button>
      </Link>
    </div>
  );
};

export default Main;
