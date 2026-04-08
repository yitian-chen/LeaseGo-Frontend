import { defineStore } from "pinia";

export const useChatStore = defineStore("chat", {
  state: () => ({
    totalUnreadCount: 0
  }),
  actions: {
    setTotalUnreadCount(count: number) {
      this.totalUnreadCount = count;
    },
    incrementUnreadCount(uid: string, currentChatUid: string | null) {
      // 如果不在当前聊天页面才增加
      if (uid !== currentChatUid) {
        this.totalUnreadCount++;
      }
    }
  },
  persist: false
});
