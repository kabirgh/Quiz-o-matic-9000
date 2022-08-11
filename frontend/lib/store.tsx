import { createContext, useContext, useState } from "react";
import colors from "./colors";

type Team = {
  name: string;
  color: string;
};

type Store = {
  teams: Team[];
  colors: { [key: string]: string };
};

const AppContext = createContext({
  store: {} as Store,
  setStore: (_store: Store) => {},
});

export const useStore = () => useContext(AppContext);

export const StoreProvider = ({ children }: { children: any }) => {
  const [store, setStore] = useState({
    teams: [
      { name: "9/9", color: colors.red },
      { name: "12B", color: colors.blue },
      { name: "Chixie Dix", color: colors.green },
      { name: "King in the Lounge", color: colors.yellow },
      { name: "Jumbo", color: colors.purple },
      // { name: "Monkey bars", color: colors.pink },
      // { name: "Alpha Kenny", color: colors.white },
      // { name: "Zoom angels", color: colors.midBlue },
      // { name: "Clairvoyant", color: colors.orange },
      // { name: "Alpaca", color: colors.lightGreen },
    ],
    colors: colors,
  } as Store);

  return (
    <AppContext.Provider value={{ store, setStore }}>
      {children}
    </AppContext.Provider>
  );
};
