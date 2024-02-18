import { useEffect, useRef, useState, Fragment } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { MinusOutlined, PlusOutlined } from "@ant-design/icons";

import useClientRect from "../lib/useClientRect";
import ColorPicker from "../components/ColorPicker";
import styles from "./index.module.css";

import {
  ListPorts,
  SetPort,
  SaveTeams,
  ListTeams,
  ListBuzzerIds,
} from "../wailsjs/wailsjs/go/main/App";
import { main } from "../wailsjs/wailsjs/go/models";
import { EventsOn } from "../wailsjs/wailsjs/runtime/runtime";

// Typescript will figure out whether to use enum as type or as value
type Color = main.Color;
const Color = main.Color;

const Main: NextPage = () => {
  const MAX_TEAMS = 8;
  const router = useRouter();

  // const { teams, setTeams } = useStore();
  const [teams, setTeams] = useState([] as main.Team[]);

  const inputRefs = useRef([] as (HTMLInputElement | null)[]);
  const inputRowRef = useRef<HTMLElement>(null);
  const rect = useClientRect(inputRowRef);
  const [inputValid, setInputValid] = useState(
    {} as { [key: number]: boolean }
  );

  const [portOptions, setPortOptions] = useState([] as string[]);
  const [selectedPort, setSelectedPort] = useState(
    undefined as string | undefined
  );

  const [buzzerOptions, setBuzzerOptions] = useState(["None"] as string[]);

  // Get teams from backend
  useEffect(() => {
    ListTeams()
      .then((teams) => {
        setTeams(teams);
      })
      .catch((err) => console.error(err));
  }, []);

  // Set ports list and select the first one
  useEffect(() => {
    ListPorts()
      .then((ports) => {
        setPortOptions(ports);
        setSelectedPort(ports[0]);
      })
      .catch((err) => console.error(err));
  }, []);

  // Listen for buzzers
  useEffect(() => {
    // Get existing buzzers if already connected
    ListBuzzerIds()
      .then((buzzerIds) => {
        setBuzzerOptions((prev) => {
          return Array.from(new Set([...prev, ...buzzerIds]));
        });
      })
      .catch((err) => console.error(err));

    const cancel = EventsOn("newBuzzer", (id: string) => {
      setBuzzerOptions((prev) => {
        return Array.from(new Set([...prev, id]));
      });
    });

    return cancel;
  }, []);

  // Adjust the ref array to match the number of teams
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, teams.length);
    if (teams.length > 0) {
      const lastInputIndex = teams.length - 1;
      if (inputRefs.current[lastInputIndex]) {
        inputRefs.current[lastInputIndex]?.focus();
      }
    }
  }, [teams]);

  const getNextUnusedColor = (): Color => {
    const color = Object.values(Color).filter(
      (c) => !teams.map((t) => t.color).includes(c)
    )[0];
    return color;
  };

  return (
    <div className={styles.app}>
      <div className={styles.mainTitle}>Quiz-o-matic</div>
      <button
        id="add-btn"
        style={{ gridArea: "4/2/5/3" }}
        onClick={() => {
          if (teams.length < MAX_TEAMS) {
            setTeams([
              ...teams,
              { name: "", color: getNextUnusedColor(), buzzerId: undefined },
            ]);
          }
        }}
      >
        <PlusOutlined style={{ fontSize: "18px", color: "green" }} />
      </button>
      <select
        style={{
          gridArea: "2/10/3/11",
          height: "40%",
          marginTop: "auto", // centers element vertically
          marginBottom: "auto",
        }}
        value={selectedPort}
        onChange={(event) => {
          setSelectedPort(event.target.value);
          console.log("setting port to ", event.target.value);
          SetPort(event.target.value);
        }}
      >
        {portOptions.map((port) => (
          <option key={port} value={port}>
            {port}
          </option>
        ))}
      </select>
      {teams.map((team, index) => {
        const i = index + 1;
        return (
          <Fragment key={i}>
            <button
              id={`team-${i}-del-btn`}
              style={{
                gridArea: `${2 * i + 4}/2/${2 * i + 5}/3`,
              }}
              onClick={() => {
                const newTeams = [...teams];
                newTeams.splice(index, 1);
                setTeams(newTeams);
                // Recompute validities since teams may have moved up a row
                const newValid = {} as { [key: number]: boolean };
                newTeams.forEach((team, index) => {
                  newValid[index] = team.name.trim() === "" ? false : true;
                });
                setInputValid(newValid);
              }}
            >
              <MinusOutlined style={{ fontSize: "18px", color: "red" }} />
            </button>
            <input
              id={`team-${i}-input`}
              ref={(el) => (inputRefs.current[index] = el)}
              autoComplete="off"
              style={{
                gridArea: `${2 * i + 4}/4/${2 * i + 5}/5`,
                outline: inputValid[index] === false ? "2px solid red" : "",
                outlineOffset: "2px",
              }}
              value={team.name}
              onChange={(event) => {
                const newTeams = [...teams];
                newTeams[index].name = event.target.value;
                setTeams(newTeams);
              }}
              onFocus={(_event) => {
                const newValid = { ...inputValid };
                newValid[index] = true;
                setInputValid(newValid);
              }}
              onBlur={(event) => {
                const newValid = { ...inputValid };
                newValid[index] =
                  event.target.value.trim() === "" ? false : true;
                setInputValid(newValid);
              }}
            />
            <div
              style={{
                gridArea: `${2 * i + 4}/6/${2 * i + 5}/7`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ColorPicker
                colors={Object.values(Color)}
                disabled={teams.map((t) => t.color)}
                size={rect === null ? 0 : 0.95 * rect.height}
                selected={team.color}
                handleSelect={(color: string) => {
                  const newTeams = [...teams];
                  newTeams[index].color = color as Color;
                  setTeams(newTeams);
                }}
              />
            </div>
            <select
              id={`team-${i}-select`}
              style={{
                gridArea: `${2 * i + 4}/8/${2 * i + 5}/9`,
              }}
              onChange={(event) => {
                const newTeams = [...teams];
                const buzzerId = event.target.value;
                if (buzzerId === "None") {
                  return;
                }
                newTeams[index].buzzerId = buzzerId;
                setTeams(newTeams);
              }}
            >
              {buzzerOptions.map((buzzerId) => {
                const selectedBuzzerIds = teams
                  .filter((_t, idx) => idx != index)
                  .map((t) => t.buzzerId);

                return (
                  <option
                    key={buzzerId}
                    value={buzzerId}
                    disabled={
                      selectedBuzzerIds.includes(buzzerId) &&
                      buzzerId !== "None"
                    }
                  >
                    {buzzerId}
                  </option>
                );
              })}
            </select>
          </Fragment>
        );
      })}

      <div
        id="div-only-for-ref"
        ref={inputRowRef as any}
        style={{ gridArea: `6/10/6/11`, height: "100%" }}
      ></div>

      <button
        id="start-btn"
        style={{ gridArea: "22/10/23/11" }}
        onClick={() => {
          const validities = teams.map((t) => {
            return t !== null && t.name.trim() === "" ? false : true;
          });

          if (!validities.every((v) => v === true)) {
            setInputValid(Object.assign({}, validities));
            return;
          }

          SaveTeams(teams);

          router.push("/game");
        }}
      >
        Start
      </button>
    </div>
  );
};

export default Main;
