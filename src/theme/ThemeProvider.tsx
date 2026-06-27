import React from 'react';
import { colors } from './colors';

export type Theme = {
  colors: typeof colors;
};

const ThemeContext = React.createContext<Theme>({ colors });

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = React.useMemo(() => ({ colors }), []);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => React.useContext(ThemeContext);
