/**
 * VoiceAssistantContext
 *
 * Globally mounts a single `KovaVoiceAssistant` modal and lets any screen
 * launch voice control by calling `useVoiceAssistant().open()`.
 *
 * Architecture:
 *   - Screens that already fetch user/goals/Supabase helpers register a
 *     `VoiceActionContext` snapshot via `useVoiceContextRegistrar(...)`.
 *   - `open()` reads the most recently registered context. No re-subscribing
 *     to `useGoalsTransactions` from the global header → no duplicate
 *     network traffic.
 *   - Screens without their own data (e.g. Profile) still get a working
 *     launcher: the last-registered context is sticky across navigation,
 *     and execution always uses the live Supabase auth session anyway.
 *
 * The same `open()` API can later be backed by a Gemini function-calling
 * parser without changing callers.
 */
import React from 'react';
import { CommonActions } from '@react-navigation/native';
import { KovaVoiceAssistant } from '../components/KovaVoiceAssistant';
import { rootNavigationRef } from '../navigation';
import type { VoiceActionContext } from '../lib/voice/types';

interface VoiceAssistantValue {
  isOpen: boolean;
  /** Open the modal. Uses the most recently registered action context. */
  open: () => void;
  close: () => void;
  /** True when a screen has registered a usable action context. */
  hasActionContext: boolean;
  /** Internal — used by `useVoiceContextRegistrar`. Do not call from screens. */
  _registerContext: (ctx: VoiceActionContext | null) => void;
}

const VoiceAssistantCtx = React.createContext<VoiceAssistantValue | null>(null);

export const VoiceAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  // We keep this in a ref so screen-side registrations don't trigger re-renders
  // of every consumer of `useVoiceAssistant()`. The modal is the only consumer
  // that needs the live ctx and it reads through `getActionContext()` on open.
  const ctxRef = React.useRef<VoiceActionContext | null>(null);
  const [hasActionContext, setHasActionContext] = React.useState(false);

  const close = React.useCallback(() => setIsOpen(false), []);

  const open = React.useCallback(() => {
    setIsOpen(true);
  }, []);

  const _registerContext = React.useCallback((ctx: VoiceActionContext | null) => {
    if (!ctx) {
      ctxRef.current = null;
      setHasActionContext(false);
      return;
    }
    ctxRef.current = withDefaults(ctx, () => setIsOpen(false));
    setHasActionContext(true);
  }, []);

  const value = React.useMemo<VoiceAssistantValue>(
    () => ({ isOpen, open, close, hasActionContext, _registerContext }),
    [isOpen, open, close, hasActionContext, _registerContext],
  );

  return (
    <VoiceAssistantCtx.Provider value={value}>
      {children}
      <KovaVoiceAssistant
        visible={isOpen}
        onClose={close}
        actionContext={ctxRef.current}
      />
    </VoiceAssistantCtx.Provider>
  );
};

/** Wires the provider's `askCoach` default that closes the modal then navigates. */
function withDefaults(
  ctx: VoiceActionContext,
  closeModal: () => void,
): VoiceActionContext {
  return {
    ...ctx,
    askCoach:
      ctx.askCoach ??
      ((prompt: string) => {
        closeModal();
        requestAnimationFrame(() => {
          if (!rootNavigationRef.isReady()) return;
          rootNavigationRef.dispatch(
            CommonActions.navigate({
              name: 'MainTabs',
              params: {
                screen: 'Coach',
                params: { preloadedPrompt: prompt },
              },
            }),
          );
        });
      }),
  };
}

export function useVoiceAssistant(): VoiceAssistantValue {
  const ctx = React.useContext(VoiceAssistantCtx);
  if (!ctx) {
    throw new Error('useVoiceAssistant must be used inside <VoiceAssistantProvider>');
  }
  return ctx;
}
