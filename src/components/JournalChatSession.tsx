'use client';

import { useChat } from '@ai-sdk/react';
import type { ChatTransport, UIMessage } from 'ai';
import { type MutableRefObject, type ReactNode, useEffect } from 'react';

export type JournalChatApi = {
  messages: UIMessage[];
  sendMessage: (message: { text: string }) => Promise<void>;
  status: string;
};

type JournalChatSessionProps = {
  transport: ChatTransport<UIMessage>;
  chatRef: MutableRefObject<JournalChatApi | null>;
  initialMessages?: UIMessage[];
  onError: (error: Error) => void;
  children: (ctx: { messages: UIMessage[]; status: string }) => ReactNode;
};

export function JournalChatSession({
  transport,
  chatRef,
  initialMessages = [],
  onError,
  children,
}: JournalChatSessionProps) {
  const { messages, sendMessage, status } = useChat({
    transport,
    messages: initialMessages,
    onError,
  });

  useEffect(() => {
    chatRef.current = { messages, sendMessage, status };
  }, [messages, sendMessage, status, chatRef]);

  return <>{children({ messages, status })}</>;
}
