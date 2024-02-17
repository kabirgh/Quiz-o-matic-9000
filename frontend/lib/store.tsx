import { createContext, useContext, useState } from "react";
import { main } from "../wailsjs/wailsjs/go/models";
import colors from "./colors";

export type Team = main.Team;

const AppContext = createContext({
  teams: [] as Team[],
  setTeams: (_store: Team[]) => {},
});

export const useStore = () => useContext(AppContext);

export const StoreProvider = ({ children }: { children: any }) => {
  const [teams, setTeams] = useState([
    { name: "", color: colors.red, buzzer: undefined }, // undefined instead of null to match generated ts model
  ] as Team[]);

  return (
    <AppContext.Provider value={{ teams, setTeams }}>
      {children}
    </AppContext.Provider>
  );
};
