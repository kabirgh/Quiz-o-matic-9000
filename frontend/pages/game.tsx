import type { NextPage } from "next";
import { useRouter } from "next/router";

import { useCallback, useEffect, useRef, useState } from "react";

import useClientRect from "../lib/useClientRect";
import { perceptualToAmplitude } from "../lib/perceptual";

import { ListTeams } from "../wailsjs/wailsjs/go/main/App";
import { main } from "../wailsjs/wailsjs/go/models";
import {
  EventsOn,
  WindowFullscreen,
  WindowUnfullscreen,
} from "../wailsjs/wailsjs/runtime/runtime";

type Team = main.Team;

const VOLUME_STEP = 0.1;

const Game: NextPage = () => {
  const router = useRouter();
  const [fullscreen, setFullscreen] = useState(true);
  const [teams, setTeams] = useState([] as Team[]);
  const [played, setPlayed] = useState([] as Team[]);
  const [volume, setVolume] = useState(0.5);
  const teamRowRef = useRef<HTMLElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const rect = useClientRect(teamRowRef);

  // Update UI and play sound when a team presses the buzzer
  const handleTeamBuzzerPress = useCallback(
    (teamId: string) => {
      const team = teams.find((team) => team.buzzerId === teamId);
      if (!team) {
        return;
      }
      setPlayed((prev) => {
        if (prev.includes(team)) {
          return prev;
        }
        const newPlayed = [...prev, team];

        if (!audioRef.current) {
          return prev;
        }
        audioRef.current.pause(); // Pause the currently playing sound
        audioRef.current.currentTime = 0; // Reset playback to the start
        audioRef.current.play(); // Play the sound again

        return newPlayed;
      });
    },
    [teams]
  );

  useEffect(() => {
    // Fullscreen window
    if (fullscreen) {
      WindowFullscreen();
    } else {
      WindowUnfullscreen();
    }
  }, [fullscreen]);

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
      handleTeamBuzzerPress(id);
    });
    return cancel;
  }, [handleTeamBuzzerPress]);

  // For testing and going back to home screen
  useEffect(() => {
    const keydownHandler = (event: any) => {
      switch (event.code) {
        case "KeyF":
          setFullscreen((prev) => !prev);
          break;
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
        case "ArrowUp":
          setVolume((prev) => Math.min(prev + VOLUME_STEP, 1));
          break;
        case "ArrowDown":
          setVolume((prev) => Math.max(prev - VOLUME_STEP, 0));
          break;
        case "Space":
          handleTeamBuzzerPress("Keyboard");
          break;
      }
    };

    addEventListener("keydown", keydownHandler);
    return () => {
      removeEventListener("keydown", keydownHandler);
    };
  }, [router, teams, handleTeamBuzzerPress]);

  // Update volume of hidden audio element
  useEffect(() => {
    if (!audioRef.current) {
      return;
    }
    audioRef.current.volume = perceptualToAmplitude(volume);
  }, [volume]);

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
      <audio
        ref={audioRef}
        src="/audio/bell.mp3"
        style={{ display: "none" }}
      ></audio>
    </div>
  );
};

export default Game;
