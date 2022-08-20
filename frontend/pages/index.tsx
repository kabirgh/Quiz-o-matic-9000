import { useEffect, useRef, useState } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";

import { useStore } from "../lib/store";
import useClientRect from "../lib/useClientRect";
import colors from "../lib/colors";
import ColorPicker from "../components/ColorPicker";
import styles from "./index.module.css";

import { ListPorts, SetPort } from "../wailsjs/wailsjs/go/main/App";
import { MinusOutlined, PlusOutlined } from "@ant-design/icons";

const Main: NextPage = () => {
  const MAX_TEAMS = 8;
  const router = useRouter();
  const { teams, setTeams } = useStore();
  const [rect, inputRowRef] = useClientRect();
  const [inputValid, setInputValid] = useState(
    {} as { [key: number]: boolean }
  );
  const [portOptions, setPortOptions] = useState([] as string[]);
  const [selectedPort, setSelectedPort] = useState(
    undefined as string | undefined
  );

  useEffect(() => {
    ListPorts()
      .then((ports) => {
        setPortOptions(ports);
        setSelectedPort(ports[0]);
      })
      .catch((err) => console.error(err));
  }, []);

  const getNextUnusedColor = () => {
    const color = Object.values(colors).filter(
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
            setTeams([...teams, { name: "", color: getNextUnusedColor() }]);
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
          <>
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
              onFocus={(event) => {
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
                colors={Object.values(colors)}
                disabled={teams.map((t) => t.color)}
                size={
                  rect === null || typeof rect !== "object"
                    ? 0
                    : 0.95 * rect.height
                }
                selected={team.color}
                handleSelect={(color: string) => {
                  const newTeams = [...teams];
                  newTeams[index].color = color;
                  setTeams(newTeams);
                }}
              />
            </div>
            <button
              id={`team-${i}-register-btn`}
              style={{
                gridArea: `${2 * i + 4}/8/${2 * i + 5}/9`,
              }}
            >
              Register
            </button>
          </>
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
          const validities = teams.map((t, index) => {
            return t !== null && t.name.trim() === "" ? false : true;
          });

          if (validities.every((v) => v === true)) {
            router.push("/game");
          } else {
            setInputValid(Object.assign({}, validities));
          }
        }}
      >
        Start
      </button>
    </div>
  );
};

export default Main;
