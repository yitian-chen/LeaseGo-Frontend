// 会话列表项
export interface ConversationItem {
  conversationId: number;
  otherUserId: number;
  otherUserName: string;
  avatarUrl?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

// 聊天记录项
export interface ChatMessageItem {
  id: number;
  fromId: number;
  fromName: string;
  message: string;
  createTime: string;
  fromMe: boolean;
}

// 聊天历史响应
export interface ChatHistoryResponse {
  messages: ChatMessageItem[];
  userAvatars: Record<string, string>;
}
