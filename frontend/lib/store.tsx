import { createContext, useContext, useState } from "react";
import colors from "./colors";

export type Team = {
  name: string;
  color: string | null;
};

const AppContext = createContext({
  teams: [] as Team[],
  setTeams: (_store: Team[]) => {},
});

export const useStore = () => useContext(AppContext);

export const StoreProvider = ({ children }: { children: any }) => {
  const [teams, setTeams] = useState([
    { name: "", color: colors.red },
  ] as Team[]);

  return (
    <AppContext.Provider value={{ teams, setTeams }}>
      {children}
    </AppContext.Provider>
  );
};
