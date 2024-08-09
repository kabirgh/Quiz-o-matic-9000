import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import ColorPicker from '../components/ColorPicker';
import useClientRect from '../lib/useClientRect';
import {
  ListBuzzerIds,
  ListTeams,
  SaveTeams,
} from '../wailsjs/wailsjs/go/main/App';
import { main } from '../wailsjs/wailsjs/go/models';
import {
  EventsOn,
  WindowFullscreen,
  WindowUnfullscreen,
} from '../wailsjs/wailsjs/runtime/runtime';
import styles from './index.module.css';

// Typescript will figure out whether to use enum as type or as value
type Color = main.Color;
const Color = main.Color;

const Main: NextPage = () => {
  const MAX_TEAMS = 8;
  const router = useRouter();

  const [fullscreen, setFullscreen] = useState(false);
  const [teams, setTeams] = useState([] as main.Team[]);
  const inputRowRef = useRef<HTMLElement>(null);
  const rect = useClientRect(inputRowRef);
  const [nameInputValid, setNameInputValid] = useState(
    {} as { [key: number]: boolean },
  );
  const [buzzerIds, setBuzzerIds] = useState([] as string[]);
  // buzzer id : timeout function
  const [pressedBuzzers, setPressedBuzzers] = useState(
    {} as {
      [key: string]: {
        timeout: NodeJS.Timeout;
        timestamp: number;
      };
    },
  );

  const handleBuzzerPress = useCallback(
    (buzzerId: string) => {
      // Clear existing timeout if there is one
      if (pressedBuzzers[buzzerId]) {
        clearTimeout(pressedBuzzers[buzzerId].timeout);
      }
      // Set new timeout to remove buzzer from pressed state after some time
      const timeout = setTimeout(() => {
        setPressedBuzzers((current) => {
          const updated = { ...current };
          delete updated[buzzerId];
          return updated;
        });
      }, 1000);
      // Update state with new timeout
      setPressedBuzzers((prev) => ({
        ...prev,
        [buzzerId]: { timeout, timestamp: Date.now() },
      }));
    },
    [pressedBuzzers],
  );

  useEffect(() => {
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

  // Listen for buzzers
  useEffect(() => {
    // Get existing buzzers if already connected
    ListBuzzerIds()
      .then((buzzerIds) => {
        setBuzzerIds((prev) => {
          return Array.from(new Set([...prev, ...buzzerIds]));
        });
      })
      .catch((err) => console.error(err));

    const cancel = EventsOn('connect', (id: string) => {
      setBuzzerIds((prev) => {
        return Array.from(new Set([...prev, id]));
      });
    });

    return cancel;
  }, []);

  // Listen for buzzer disconnections
  useEffect(() => {
    const cancel = EventsOn('disconnect', (id: string) => {
      setBuzzerIds((prev) => {
        return prev.filter((buzzerId) => buzzerId !== id);
      });
    });

    return cancel;
  }, []);

  // Listen for buzzer presses
  useEffect(() => {
    const cancel = EventsOn('press', (id: string) => {
      handleBuzzerPress(id);
    });
    return cancel;
  }, [handleBuzzerPress]);

  useEffect(() => {
    const keydownHandler = (event: any) => {
      switch (event.code) {
        case 'KeyF':
          if (event.shiftKey) {
            setFullscreen((prev) => !prev);
          }
          break;
        case 'KeyN':
          if (event.shiftKey) {
            router.push('/ninja');
          }
          break;
        case 'Space':
          handleBuzzerPress('Keyboard');
          break;
      }
    };

    addEventListener('keydown', keydownHandler);
    return () => {
      removeEventListener('keydown', keydownHandler);
    };
  }, [handleBuzzerPress, router]);

  const getNextUnusedColor = (): Color => {
    const color = Object.values(Color).filter(
      (c) => !teams.map((t) => t.color).includes(c),
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
            'row-add-start/col-del-add-start/row-add-end/col-del-add-end',
        }}
        onClick={() => {
          if (teams.length < MAX_TEAMS) {
            setTeams([
              ...teams,
              { name: '', color: getNextUnusedColor(), buzzerId: undefined },
            ]);
          }
        }}
      >
        <PlusOutlined style={{ fontSize: '18px', color: 'green' }} />
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
                  newValid[index] = team.name.trim() === '' ? false : true;
                });
                setNameInputValid(newValid);
              }}
            >
              <MinusOutlined style={{ fontSize: '18px', color: 'red' }} />
            </button>
            <input
              id={`team-${i}-input`}
              autoComplete="off"
              style={{
                gridArea: `${2 * i + 4}/col-teamname-start/${
                  2 * i + 5
                }/col-teamname-end`,
                outline: nameInputValid[index] === false ? '2px solid red' : '',
                outlineOffset: '2px',
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
                  event.target.value.trim() === '' ? false : true;
                setNameInputValid(newValid);
              }}
            />
            <div
              style={{
                gridArea: `${2 * i + 4}/col-colorsel-start/${
                  2 * i + 5
                }/col-colorsel-end`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
              value={team.buzzerId || 'None'}
            >
              {buzzerIds
                .concat('None')
                .concat('dummy')
                .map((buzzerId, buzzerIndex) => {
                  const selectedBuzzerIds = teams
                    .filter((_t, idx) => idx != index)
                    .map((t) => t.buzzerId);

                  return (
                    <option
                      key={buzzerIndex}
                      value={buzzerId}
                      disabled={
                        selectedBuzzerIds.includes(buzzerId) &&
                        buzzerId !== 'None'
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
        id="vert-divider"
        style={{
          gridArea: 'row-add-start/col-divider/21/col-divider',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          width: '1px',
          boxShadow: '0px 0px 1px 1px rgba(255, 255, 255, 0.2)',
        }}
      ></div>

      <div
        id="buzzer-list-title"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'Arvo',
          fontSize: '3vh',
          gridArea:
            'row-add-start/col-buzzers-start/row-add-end/col-buzzers-start',
        }}
      >
        Connected
      </div>
      {buzzerIds.map((buzzerId, index) => {
        const i = index + 1;
        const isPressed = !!pressedBuzzers[buzzerId];
        // Re-render if pressed before animation completes
        const key = isPressed
          ? `${buzzerId}-${i}-${pressedBuzzers[buzzerId].timestamp}`
          : `${buzzerId}-${i}`;
        const className = isPressed ? styles.glowingText : '';

        return (
          <div
            id={`${buzzerId}-${i}`}
            key={key}
            className={className}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontFamily: 'Arvo',
              fontSize: '2vh',
              gridArea: `${2 * i + 4}/col-buzzers-start/${
                2 * i + 5
              }/col-buzzers-end`,
              textShadow: isPressed
                ? '0 0 10px white, 0 0 20px white, 0 0 30px white, 0 0 40px white'
                : 'none',
            }}
          >
            {buzzerId}
          </div>
        );
      })}

      <div
        id="div-only-for-ref"
        ref={inputRowRef as any}
        style={{ gridArea: `6/10/6/11`, height: '100%' }}
      ></div>

      <button
        id="start-btn"
        style={{ gridArea: '22/col-startbtn-start/23/col-startbtn-end' }}
        onClick={() => {
          const nameValidities = teams.map((t) => {
            return t !== null && t.name.trim() === '' ? false : true;
          });
          if (!nameValidities.every((v) => v === true)) {
            setNameInputValid(Object.assign({}, nameValidities));
            return;
          }

          const anyNoneBuzzers = teams
            .map((t) => t.buzzerId)
            .filter((b) => b == 'None' || b == undefined);
          if (anyNoneBuzzers.length > 0) {
            alert('All teams must have a buzzer');
            return;
          }

          SaveTeams(teams);

          router.push('/game');
        }}
      >
        Start
      </button>
    </div>
  );
};

export default Main;
