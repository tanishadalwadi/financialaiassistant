import React from 'react';
import 'react-native-gesture-handler';
import { RootNavigation } from './src/navigation';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { AuthProvider } from './src/contexts/AuthContext';
import { ProfileProvider } from './src/contexts/ProfileContext';
import { VoiceAssistantProvider } from './src/contexts/VoiceAssistantContext';

export default function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <ThemeProvider>
          <VoiceAssistantProvider>
            <RootNavigation />
          </VoiceAssistantProvider>
        </ThemeProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
