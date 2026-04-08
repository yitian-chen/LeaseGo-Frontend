import http from "@/utils/http";
import type { ConversationItem, ChatHistoryResponse } from "./types";

/**
 * 获取会话列表
 */
export function getConversationList() {
  return http.get<ConversationItem[]>(`/app/chat/conversations`);
}

/**
 * 获取与某用户的聊天记录
 * @param userId 对方用户ID
 */
export function getChatHistory(userId: number) {
  return http.get<ChatHistoryResponse>(`/app/chat/conversations/${userId}`);
}
