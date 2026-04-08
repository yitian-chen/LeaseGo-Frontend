import { defineStore } from "pinia";

export interface ChatMessage {
  fromMe: boolean;
  fromId?: number;
  text: string;
  time?: string;
}

export interface Contact {
  id: string;
  nickname: string;
  avatar: string;
  online: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

export const useChatStore = defineStore("chat", {
  state: () => ({
    totalUnreadCount: 0,
    // 所有联系人
    contacts: {} as Record<string, Contact>,
    // 所有聊天记录: { userId: messages[] }
    messages: {} as Record<string, ChatMessage[]>
  }),
  actions: {
    setTotalUnreadCount(count: number) {
      this.totalUnreadCount = count;
    },

    // 添加或更新联系人
    upsertContact(contact: Contact) {
      if (!this.contacts[contact.id]) {
        this.contacts[contact.id] = contact;
      } else {
        this.contacts[contact.id] = { ...this.contacts[contact.id], ...contact };
      }
      this.recalcTotalUnread();
    },

    // 批量设置联系人
    setContacts(contacts: Record<string, Contact>) {
      this.contacts = contacts;
      this.recalcTotalUnread();
    },

    // 接收新消息
    receiveMessage(userId: string, message: ChatMessage, contact?: Partial<Contact>) {
      if (!this.messages[userId]) {
        this.messages[userId] = [];
      }
      this.messages[userId].push(message);

      if (contact) {
        this.upsertContact({
          id: userId,
          nickname: contact.nickname || "未知用户",
          avatar: contact.avatar || "",
          online: contact.online || false,
          unreadCount: 0,
          ...contact
        });
      }
    },

    // 清除未读数
    clearUnread(userId: string) {
      if (this.contacts[userId]) {
        this.contacts[userId].unreadCount = 0;
        this.recalcTotalUnread();
      }
    },

    // 设置聊天历史
    setMessages(userId: string, messages: ChatMessage[]) {
      this.messages[userId] = messages;
    },

    // 添加单条消息
    addMessage(userId: string, message: ChatMessage) {
      if (!this.messages[userId]) {
        this.messages[userId] = [];
      }
      this.messages[userId].push(message);
    },

    // 计算总未读数
    recalcTotalUnread() {
      this.totalUnreadCount = Object.values(this.contacts).reduce(
        (sum, conv) => sum + (conv.unreadCount || 0),
        0
      );
    },

    // 更新在线状态
    updateOnlineStatus(userId: string, online: boolean, nickname?: string) {
      if (this.contacts[userId]) {
        this.contacts[userId].online = online;
        if (nickname) {
          this.contacts[userId].nickname = nickname;
        }
      }
    },

    // 标记用户离线
    markAllOffline() {
      Object.keys(this.contacts).forEach(uid => {
        this.contacts[uid].online = false;
      });
    }
  },
  persist: false
});
