import { useEffect, useRef, useState, Fragment } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { MinusOutlined, PlusOutlined } from "@ant-design/icons";

import useClientRect from "../lib/useClientRect";
import ColorPicker from "../components/ColorPicker";
import styles from "./index.module.css";

import {
  SaveTeams,
  ListTeams,
  ListBuzzerIds,
} from "../wailsjs/wailsjs/go/main/App";
import { main } from "../wailsjs/wailsjs/go/models";
import { EventsOn } from "../wailsjs/wailsjs/runtime/runtime";

// Typescript will figure out whether to use enum as type or as value
type Color = main.Color;
const Color = main.Color;

const BUZZER_ID_TO_NAME: { [key: string]: string } = {
  "11": "White",
  "12": "Orange",
  "13": "Black",
  "14": "Purple",
};

const Main: NextPage = () => {
  const MAX_TEAMS = 8;
  const router = useRouter();

  const [teams, setTeams] = useState([] as main.Team[]);
  const inputRefs = useRef([] as (HTMLInputElement | null)[]);
  const inputRowRef = useRef<HTMLElement>(null);
  const rect = useClientRect(inputRowRef);
  const [nameInputValid, setNameInputValid] = useState(
    {} as { [key: number]: boolean }
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

    const cancel = EventsOn("register", (id: string) => {
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
        style={{
          gridArea:
            "row-add-start/col-del-add-start/row-add-end/col-del-add-end",
        }}
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
      {teams.map((team, index) => {
        const i = index + 1;
        return (
          <Fragment key={i}>
            <button
              id={`team-${i}-del-btn`}
              style={{
                gridArea: `${2 * i + 4}/col-del-add-start/${
                  2 * i + 5
                }/col-del-add-end`,
              }}
              onClick={() => {
                const newTeams = [...teams];
                newTeams.splice(index, 1);
                setTeams(newTeams);
                // Recompute nameValidities since teams may have moved up a row
                const newValid = {} as { [key: number]: boolean };
                newTeams.forEach((team, index) => {
                  newValid[index] = team.name.trim() === "" ? false : true;
                });
                setNameInputValid(newValid);
              }}
            >
              <MinusOutlined style={{ fontSize: "18px", color: "red" }} />
            </button>
            <input
              id={`team-${i}-input`}
              ref={(el) => (inputRefs.current[index] = el)}
              autoComplete="off"
              style={{
                gridArea: `${2 * i + 4}/col-teamname-start/${
                  2 * i + 5
                }/col-teamname-end`,
                outline: nameInputValid[index] === false ? "2px solid red" : "",
                outlineOffset: "2px",
              }}
              value={team.name}
              onChange={(event) => {
                const newTeams = [...teams];
                newTeams[index].name = event.target.value;
                setTeams(newTeams);
              }}
              onFocus={(_event) => {
                const newValid = { ...nameInputValid };
                newValid[index] = true;
                setNameInputValid(newValid);
              }}
              onBlur={(event) => {
                const newValid = { ...nameInputValid };
                newValid[index] =
                  event.target.value.trim() === "" ? false : true;
                setNameInputValid(newValid);
              }}
            />
            <div
              style={{
                gridArea: `${2 * i + 4}/col-colorsel-start/${
                  2 * i + 5
                }/col-colorsel-end`,
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
              id={`team-${i}-buzzer-select`}
              style={{
                gridArea: `${2 * i + 4}/col-buzzersel-start/${
                  2 * i + 5
                }/col-buzzersel-end`,
              }}
              onChange={(event) => {
                const newTeams = [...teams];
                const buzzerId = event.target.value;
                newTeams[index].buzzerId = buzzerId;
                setTeams(newTeams);
              }}
              value={team.buzzerId || "None"}
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
                    {BUZZER_ID_TO_NAME[buzzerId] || buzzerId}
                  </option>
                );
              })}
            </select>
            <div
              id="vert-divider"
              style={{
                gridArea: "row-add-start/col-divider/21/col-divider",
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                width: "1px",
                boxShadow: "0px 0px 1px 1px rgba(255, 255, 255, 0.2)",
              }}
            ></div>
            <div
              id="buzzer-list-title"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontFamily: "Arvo",
                fontSize: "2vh",
                gridArea:
                  "row-add-start/col-buzzers-start/row-add-end/col-buzzers-start",
              }}
            >
              Buzzers
            </div>
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
        style={{ gridArea: "22/col-startbtn-start/23/col-startbtn-end" }}
        onClick={() => {
          const nameValidities = teams.map((t) => {
            return t !== null && t.name.trim() === "" ? false : true;
          });
          if (!nameValidities.every((v) => v === true)) {
            setNameInputValid(Object.assign({}, nameValidities));
            return;
          }

          const anyNoneBuzzers = teams
            .map((t) => t.buzzerId)
            .filter((b) => b == "None" || b == undefined);
          if (anyNoneBuzzers.length > 0) {
            alert("All teams must have a buzzer");
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
