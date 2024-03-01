import type { NextPage } from "next";
import { useRouter } from "next/router";

import { useEffect, useRef, useState } from "react";

import useClientRect from "../lib/useClientRect";

import { ListTeams } from "../wailsjs/wailsjs/go/main/App";
import { main } from "../wailsjs/wailsjs/go/models";
import { EventsOn } from "../wailsjs/wailsjs/runtime/runtime";

type Team = main.Team;

const Game: NextPage = () => {
  const router = useRouter();
  const [teams, setTeams] = useState([] as Team[]);
  const [played, setPlayed] = useState([] as Team[]);
  const teamRowRef = useRef<HTMLElement>(null);
  const rect = useClientRect(teamRowRef);

  // Get teams from backend
  useEffect(() => {
    ListTeams()
      .then((teams) => {
        setTeams(teams);
      })
      .catch((err) => console.error(err));
  }, []);

  // Listen to buzzer presses
  useEffect(() => {
    const cancel = EventsOn("press", (id: string) => {
      const team = teams.find((team) => team.buzzerId === id);
      if (team) {
        setPlayed((prev) => {
          if (prev.includes(team)) return prev;
          return [...prev, team];
        });
      }
    });

    return cancel;
  }, [teams]);

  // For testing and going back to home screen
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
        case "Space":
          const team = teams.find((team) => team.buzzerId === "Keyboard");
          if (team) {
            setPlayed((prev) => {
              if (prev.includes(team)) return prev;
              return [...prev, team];
            });
          }
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
            className="team-row"
            style={{
              gridArea: `${2 * i} / 2 / ${2 * i + 1} / 3`,
              backgroundColor: `${team.color}`,
              color: "black",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: rect === null ? 0 : 0.25 * rect.height,
            }}
          >
            {team.name}
          </div>
        );
      })}

      <div
        id="div-only-for-ref"
        ref={teamRowRef as any}
        style={{ gridArea: `2/3/3/4`, height: "100%" }}
      ></div>
    </div>
  );
};

export default Game;
