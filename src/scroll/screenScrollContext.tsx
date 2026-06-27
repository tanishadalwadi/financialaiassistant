import React, { createContext, type RefObject } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { View } from 'react-native';

export type ScreenScrollContextValue = {
  scrollY: SharedValue<number>;
  contentRef: RefObject<View | null>;
};

export const ScreenScrollContext = createContext<ScreenScrollContextValue | null>(null);
