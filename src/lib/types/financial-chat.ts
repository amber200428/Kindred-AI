export type StoredMessage = {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
};

export type FinancialChatSummary = {
  id: string;
  title: string;
  createdAt: string;
};
