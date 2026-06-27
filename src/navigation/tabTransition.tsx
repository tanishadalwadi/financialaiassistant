import React from 'react';
import { TabScreenWrapper } from '../components/TabScreenWrapper';

export function withTabTransition<P extends object>(Screen: React.ComponentType<P>): React.FC<P> {
  const Wrapped: React.FC<P> = (props) => (
    <TabScreenWrapper>
      <Screen {...props} />
    </TabScreenWrapper>
  );
  Wrapped.displayName = `WithTabTransition(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
  return Wrapped;
}
