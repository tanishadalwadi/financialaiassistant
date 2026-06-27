import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AIMessage } from '../types/models';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface AIMessageBubbleProps {
  message: AIMessage;
}

/** Normalize model output for calm, readable bubbles (plain text, gentle spacing). */
function formatAssistantBody(raw: string): string {
  let s = raw.replace(/\r\n/g, '\n').trim();
  // Strip common markdown noise on mobile
  s = s.replace(/^#{1,6}\s+/gm, '');
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/__([^_]+)__/g, '$1');
  s = s.replace(/\*([^*]+)\*/g, '$1');
  s = s.replace(/`([^`]+)`/g, '$1');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s;
}

export const AIMessageBubble: React.FC<AIMessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const displayContent = isUser ? message.content : formatAssistantBody(message.content);

  return (
    <View style={[styles.container, { alignSelf: isUser ? 'flex-end' : 'flex-start' }]}>
      {isUser ? (
        <View style={[styles.bubble, styles.user]}>
          <Text style={[styles.text, { color: colors.primaryForeground }]}>{displayContent}</Text>
        </View>
      ) : (
        <View style={[styles.bubble, styles.assistant]}>
          <Text style={[styles.text, styles.assistantText, { color: colors.textPrimary }]}>{displayContent}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: '82%',
    marginBottom: 10,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  user: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  assistant: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    ...typography.body,
  },
  assistantText: {
    lineHeight: 23,
    letterSpacing: 0.15,
    fontWeight: '400',
  },
});
