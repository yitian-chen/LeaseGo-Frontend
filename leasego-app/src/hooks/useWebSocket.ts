import { ref } from "vue";
import { useUserStore } from "@/store/modules/user";
import { useChatStore } from "@/store/modules/chat";

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const isConnected = ref(false);

// 当前正在聊天的用户ID，用于判断是否要增加未读数
const currentChatUserId = ref<string | null>(null);

// 获取 store 实例（延迟获取，避免在模块加载时 store 未初始化）
const getChatStore = () => useChatStore();

export const initWebSocket = () => {
  const userStore = useUserStore();
  const chatStore = getChatStore();
  const token = userStore.token;

  if (!token) return;

  // 如果已有连接，先关闭
  if (ws) {
    ws.close();
  }

  const wsUrl = `ws://localhost:8081/app/chat?token=${token}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    isConnected.value = true;
    console.log("WebSocket connected");
  };

  ws.onmessage = event => {
    try {
      const data = JSON.parse(event.data);

      if (data.system) {
        // 系统消息：在线用户列表更新
        const onlineList: any[] = data.message || [];
        console.log("收到在线列表:", onlineList);
        console.log("当前联系人:", Object.keys(chatStore.contacts));

        // 批量更新在线状态
        onlineList.forEach(user => {
          const uid = String(user.userId);
          console.log("更新在线状态:", uid, user.nickname, true);
          chatStore.updateOnlineStatus(uid, true, user.nickname);
        });

        // 不在线的用户标记为离线
        Object.keys(chatStore.contacts).forEach(uid => {
          if (!onlineList.find((u: any) => String(u.userId) === uid)) {
            console.log("更新离线状态:", uid);
            chatStore.updateOnlineStatus(uid, false);
          }
        });
      } else {
        // 处理私聊消息
        const senderId = String(data.fromId);

        // 获取当前用户ID用于判断是否是自己的消息
        let currentUid = userStore.userInfo?.id ? String(userStore.userInfo.id) : null;

        // 如果 userInfo.id 不可用，尝试从 token 解码
        if (!currentUid && userStore.token) {
          try {
            const payload = userStore.token.split('.')[1];
            const decoded = JSON.parse(atob(payload));
            currentUid = decoded.userId ? String(decoded.userId) : null;
          } catch {
            // 解码失败
          }
        }

        // 如果是自己发的消息（服务器回显），跳过不处理
        if (currentUid && senderId === currentUid) {
          return;
        }

        const contact = chatStore.contacts[senderId];

        // 添加消息到聊天历史
        chatStore.addMessage(senderId, {
          fromMe: false,
          fromId: data.fromId,
          text: data.message,
          time: new Date().toISOString()
        });

        // 更新联系人列表的最后一条消息
        if (contact) {
          chatStore.upsertContact({
            id: senderId,
            nickname: data.fromName || contact.nickname,
            avatar: contact.avatar,
            online: contact.online,
            lastMessage: data.message,
            lastMessageTime: new Date().toISOString(),
            unreadCount: currentChatUserId.value !== senderId ? (contact.unreadCount || 0) + 1 : 0
          });
        } else {
          // 新联系人
          chatStore.upsertContact({
            id: senderId,
            nickname: data.fromName || "未知用户",
            avatar: "",
            online: false,
            lastMessage: data.message,
            lastMessageTime: new Date().toISOString(),
            unreadCount: currentChatUserId.value !== senderId ? 1 : 0
          });
        }
      }
    } catch (e) {
      console.error("WS解析错误", e);
    }
  };

  ws.onclose = () => {
    isConnected.value = false;
    console.log("WebSocket disconnected");
    // 延迟重连
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      if (userStore.token) {
        initWebSocket();
      }
    }, 3000);
  };

  ws.onerror = () => {
    console.error("WebSocket error");
  };
};

export const closeWebSocket = () => {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (ws) {
    ws.close();
    ws = null;
  }
};

export const sendMessage = (toId: number, message: string) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error("WebSocket not connected");
    return false;
  }
  const msgObj = {
    toId,
    message
  };
  ws.send(JSON.stringify(msgObj));
  return true;
};

export const setCurrentChatUserId = (userId: string | null) => {
  currentChatUserId.value = userId;
};

export const clearUnreadCount = (userId: string) => {
  const chatStore = getChatStore();
  chatStore.clearUnread(userId);
};

export const addContact = (user: { id: string; nickname: string; avatar?: string }) => {
  const chatStore = getChatStore();
  chatStore.upsertContact({
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar || "",
    online: false,
    unreadCount: 0
  });
};

export const updateContactsMap = (contacts: Record<string, any>) => {
  const chatStore = getChatStore();
  const mapped: Record<string, any> = {};
  Object.keys(contacts).forEach(uid => {
    mapped[uid] = {
      id: uid,
      nickname: contacts[uid].nickname,
      avatar: contacts[uid].avatar || "",
      online: contacts[uid].online || false,
      lastMessage: contacts[uid].lastMessage,
      lastMessageTime: contacts[uid].lastMessageTime,
      unreadCount: contacts[uid].unreadCount || 0
    };
  });
  chatStore.setContacts(mapped);
};

export function useWebSocket() {
  return {
    ws,
    isConnected,
    currentChatUserId,
    initWebSocket,
    closeWebSocket,
    sendMessage,
    setCurrentChatUserId,
    clearUnreadCount,
    addContact,
    updateContactsMap
  };
}
