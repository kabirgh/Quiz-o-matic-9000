import { createContext, useContext, useState } from "react";

const AppContext = createContext({});

export const useStore = () => useContext(AppContext);

export const StoreProvider = ({ children }: { children: any }) => {
  // Usage: const [x, setX] = useState(0);
  // Then pass in x and setX in value prop of AppContext.Provider
  return <AppContext.Provider value={{}}>{children}</AppContext.Provider>;
};
