'use client';

import { useChat } from '@ai-sdk/react';
import type { ChatTransport, UIMessage } from 'ai';
import { type MutableRefObject, type ReactNode, useEffect } from 'react';

export type JournalChatApi = {
  messages: UIMessage[];
  sendMessage: (message: { text: string }) => Promise<void>;
  setMessages: (
    messages: UIMessage[] | ((messages: UIMessage[]) => UIMessage[]),
  ) => void;
  status: string;
};

type JournalChatSessionProps = {
  chatId: string;
  transport: ChatTransport<UIMessage>;
  chatRef: MutableRefObject<JournalChatApi | null>;
  initialMessages?: UIMessage[];
  onError: (error: Error) => void;
  children: (ctx: { messages: UIMessage[]; status: string }) => ReactNode;
};

export function JournalChatSession({
  chatId,
  transport,
  chatRef,
  initialMessages = [],
  onError,
  children,
}: JournalChatSessionProps) {
  const { messages, sendMessage, setMessages, status } = useChat({
    transport,
    messages: initialMessages,
    onError,
  });

  useEffect(() => {
    setMessages(initialMessages);
  }, [chatId, initialMessages, setMessages]);

  useEffect(() => {
    chatRef.current = { messages, sendMessage, setMessages, status };
  }, [messages, sendMessage, setMessages, status, chatRef]);

  return <>{children({ messages, status })}</>;
}
