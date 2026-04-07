// 会话列表项
export interface ConversationItem {
  conversationId: number;
  otherUserId: number;
  otherUserName: string;
  lastMessage: string;
  lastMessageTime: string;
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
