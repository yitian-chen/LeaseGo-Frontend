<template>
  <div class="chat-container flex flex-col h-[100vh] bg-gray-100 relative">
    <!-- 版本水印 -->
    <div class="version-watermark">v1.3.0</div>

    <!-- 对话列表视图 -->
    <van-nav-bar title="LeaseGo 私聊" left-arrow @click-left="router.back()" />
    <div v-if="!selectedUser" class="flex-1 overflow-hidden">
      <div class="flex-1 overflow-y-auto bg-white">
        <div
          v-for="user in allContacts"
          :key="user.id"
          @click="selectUser(user.id)"
          class="p-4 border-b cursor-pointer flex items-center gap-3"
        >
          <div class="relative">
            <van-image
              round
              width="48"
              height="48"
              src="https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg"
            />
            <div
              :class="[
                'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
                user.online ? 'bg-green-500' : 'bg-gray-300'
              ]"
            ></div>
          </div>
          <div class="flex-1 truncate">
            <div class="text-sm font-medium">{{ user.nickname }}</div>
            <div class="text-xs text-gray-400 truncate">{{ user.lastMessage || '暂无消息' }}</div>
          </div>
          <div class="text-xs text-gray-400 flex-shrink-0">
            {{ formatTime(user.lastMessageTime) }}
          </div>
        </div>
        <div
          v-if="allContacts.length === 0"
          class="flex flex-col items-center justify-center h-full text-gray-400"
        >
          <van-icon name="chat-o" size="48" />
          <p class="mt-2">暂无会话</p>
        </div>
      </div>
    </div>

    <!-- 聊天视图 -->
    <div v-else class="flex-1 flex flex-col overflow-hidden">
      <van-nav-bar
        :title="contactsMap[selectedUser]?.nickname || '私聊'"
        left-arrow
        @click-left="goBack"
      />
      <div
        class="chat-box flex-1 overflow-y-auto p-4 bg-gray-50"
        ref="chatBoxRef"
      >
        <div
          v-for="(msg, index) in currentMessages"
          :key="index"
          class="mb-4"
        >
          <div v-if="!msg.fromMe" class="flex items-start">
            <van-image
              round
              width="36"
              height="36"
              src="https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg"
            />
            <div class="ml-2 max-w-[75%]">
              <div class="text-[10px] text-gray-400 mb-1">
                {{ contactsMap[selectedUser]?.nickname || "对方" }}
              </div>
              <div
                class="bg-white p-2 rounded-lg shadow-sm text-sm break-words border border-gray-100"
              >
                {{ msg.text }}
              </div>
            </div>
          </div>
          <div v-else class="flex items-start flex-row-reverse">
            <van-image
              round
              width="36"
              height="36"
              src="https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg"
            />
            <div class="mr-2 max-w-[75%]">
              <div class="text-[10px] text-gray-400 mb-1 text-right">
                我
              </div>
              <div
                class="bg-blue-500 text-white p-2 rounded-lg shadow-sm text-sm break-words"
              >
                {{ msg.text }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-2 border-t flex items-center gap-2 bg-white">
        <van-field
          v-model="inputText"
          placeholder="请输入消息..."
          class="flex-1 bg-gray-100 rounded-full px-4"
          :border="false"
          @keyup.enter="sendMessage"
        />
        <van-button
          type="primary"
          size="small"
          round
          class="px-4"
          @click="sendMessage"
          >发送</van-button
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/store/modules/user";
import { showToast } from "vant";
import { getConversationList, getChatHistory } from "@/api/chat";

const router = useRouter();
const userStore = useUserStore();

// ✅ 强转 any 绕过 TS 检查，获取当前用户真实 ID（不再报红）
// 如果 userInfo.id 不可用，则从 token 解码获取
const currentUserId = computed(() => {
  const fromInfo = (userStore.userInfo as any)?.id;
  if (fromInfo) return fromInfo;

  // Fallback: 从 JWT token 解码 userId
  const token = userStore.token;
  if (token) {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded.userId || null;
    } catch {
      return null;
    }
  }
  return null;
});

const selectedUser = ref<string | null>(null);
const inputText = ref("");
const chatBoxRef = ref<HTMLElement | null>(null);

// ✅ Key 统一为对方的 userId 字符串
const contactsMap = ref<
  Record<
    string,
    {
      id: string;
      nickname: string;
      online: boolean;
      messages: any[];
      lastMessage?: string;
      lastMessageTime?: string;
    }
  >
>({});

// ✅ 删除了多余的重复声明，唯一正确的排序逻辑：在线的排前面
const allContacts = computed(() => {
  return Object.values(contactsMap.value).sort((a, b) =>
    a.online === b.online ? 0 : a.online ? -1 : 1
  );
});

const currentMessages = computed(() => {
  return selectedUser.value
    ? contactsMap.value[selectedUser.value]?.messages || []
    : [];
});

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const initWebSocket = () => {
  const token = userStore.token;
  if (!token) {
    showToast("未获取到登录信息");
    return;
  }

  // 如果已有连接，先关闭
  if (ws) {
    ws.close();
  }

  // 后端可从 token 解析用户身份，不需要额外传 userId
  const wsUrl = `ws://localhost:8081/app/chat?token=${token}`;
  ws = new WebSocket(wsUrl);

  ws.onmessage = event => {
    try {
      const data = JSON.parse(event.data);

      // 1. 处理系统消息（在线用户列表）
      if (data.system) {
        const onlineList: any[] = data.message || [];

        // 提取所有的 userId，方便后面剔除下线人员
        const onlineIdList = onlineList.map(user => String(user.userId));

        onlineList.forEach(user => {
          const uid = String(user.userId);
          const uname = user.nickname || "未知用户";

          // 过滤掉自己
          if (uid === String(currentUserId.value)) return;

          if (!contactsMap.value[uid]) {
            contactsMap.value[uid] = {
              id: uid,
              nickname: uname,
              online: true,
              messages: []
            };
          } else {
            contactsMap.value[uid].online = true;
            // 实时同步后端传来的最新昵称
            contactsMap.value[uid].nickname = uname;
          }
        });

        // 将不在后端列表里的联系人标记为离线
        Object.keys(contactsMap.value).forEach(uid => {
          if (!onlineIdList.includes(uid)) {
            contactsMap.value[uid].online = false;
          }
        });
      }
      // 2. 处理私聊消息
      else {
        const senderId = String(data.fromId);
        const senderName = data.fromName || "未知用户";

        // 忽略自己发给自己的消息回传（我们本地在 sendMessage 时已经推过一次气泡了，避免双重气泡）
        if (senderId === String(currentUserId.value)) return;

        // 如果是陌生人发消息，自动帮他在侧边栏列表里建档
        if (!contactsMap.value[senderId]) {
          contactsMap.value[senderId] = {
            id: senderId,
            nickname: senderName,
            online: true,
            messages: []
          };
        }

        contactsMap.value[senderId].messages.push({
          fromMe: false,
          text: data.message
        });

        // 只有当你正处于和他的聊天界面时，才滚动到底部
        if (selectedUser.value === senderId) scrollToBottom();
      }
    } catch (e) {
      console.error("WS解析错误", e);
    }
  };

  ws.onerror = () => {
    showToast("聊天室连接异常");
  };
};

const selectUser = async (userId: string) => {
  selectedUser.value = userId;

  // 加载与该用户的聊天历史
  try {
    const { data } = await getChatHistory(Number(userId));
    if (data && data.length > 0) {
      contactsMap.value[userId].messages = data.map(msg => ({
        fromMe: msg.fromMe,
        text: msg.message
      }));
    }
    nextTick(() => scrollToBottom());
  } catch (e) {
    console.error("加载聊天记录失败", e);
  }
};

// 返回对话列表并重新加载会话
const goBack = async () => {
  selectedUser.value = null;
  await loadConversationList();
};

// 加载会话列表
const loadConversationList = async () => {
  try {
    const { data } = await getConversationList();
    // 清空并重新填充
    Object.keys(contactsMap.value).forEach(key => {
      contactsMap.value[key].messages = [];
      contactsMap.value[key].lastMessage = undefined;
      contactsMap.value[key].lastMessageTime = undefined;
    });
    if (data && data.length > 0) {
      data.forEach(conv => {
        const uid = String(conv.otherUserId);
        if (contactsMap.value[uid]) {
          contactsMap.value[uid].lastMessage = conv.lastMessage;
          contactsMap.value[uid].lastMessageTime = conv.lastMessageTime;
          contactsMap.value[uid].nickname = conv.otherUserName;
        } else {
          contactsMap.value[uid] = {
            id: uid,
            nickname: conv.otherUserName,
            online: false,
            messages: [],
            lastMessage: conv.lastMessage,
            lastMessageTime: conv.lastMessageTime
          };
        }
      });
    }
  } catch (e) {
    console.error("加载会话列表失败", e);
  }
};

const sendMessage = () => {
  if (!inputText.value.trim() || !ws || !selectedUser.value) return;

  // ✅ 核心修改：使用 toId 替代 toName 发给后端
  const msgObj = {
    toId: Number(selectedUser.value),
    message: inputText.value
  };

  ws.send(JSON.stringify(msgObj));

  // 本地推入聊天气泡
  contactsMap.value[selectedUser.value].messages.push({
    fromMe: true,
    text: inputText.value
  });

  inputText.value = "";
  scrollToBottom();
};

const scrollToBottom = () => {
  nextTick(() => {
    if (chatBoxRef.value) {
      chatBoxRef.value.scrollTop = chatBoxRef.value.scrollHeight;
    }
  });
};

// 格式化时间显示
const formatTime = (timeStr?: string) => {
  if (!timeStr) return "";
  const date = new Date(timeStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (diff < oneDay && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diff < 2 * oneDay) {
    return "昨天";
  } else {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
};

onMounted(async () => {
  await loadConversationList();
  initWebSocket();
});
onUnmounted(() => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  if (ws) {
    ws.close();
  }
});
</script>

<style scoped>
/* 隐藏滚动条让界面更清爽 */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 4px;
}

/* 版本水印 */
.version-watermark {
  position: fixed;
  bottom: 12px;
  right: 12px;
  font-size: 10px;
  color: #c0c0c0;
  z-index: 9999;
  pointer-events: none;
}
</style>
