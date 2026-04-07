<template>
  <div class="chat-container flex flex-col h-[100vh] bg-gray-100 relative">
    <!-- 版本水印 -->
    <div class="version-watermark">v1.1.1</div>
    <van-nav-bar title="LeaseGo 私聊" left-arrow @click-left="router.back()" />

    <div class="flex flex-1 overflow-hidden relative">
      <div
        class="sidebar w-1/4 min-w-[140px] bg-white border-r border-gray-200 flex flex-col transition-all duration-300"
        :class="{ 'w-0 overflow-hidden opacity-0': !showSidebar }"
      >
        <div
          class="p-3 bg-gray-50 text-xs font-bold text-gray-500 border-b flex justify-between items-center"
        >
          <span>对话列表 ({{ allContacts.length }})</span>
          <van-icon name="arrow-left" @click="showSidebar = false" />
        </div>

        <div class="flex-1 overflow-y-auto">
          <div
            v-for="user in allContacts"
            :key="user.id"
            @click="selectUser(user.id)"
            :class="[
              'p-3 border-b cursor-pointer flex items-center gap-2',
              selectedUser === user.id ? 'bg-blue-50 text-blue-600' : ''
            ]"
          >
            <div
              :class="[
                'w-2 h-2 rounded-full flex-shrink-0',
                user.online ? 'bg-green-500' : 'bg-gray-300'
              ]"
            ></div>
            <div class="flex-1 truncate text-sm">{{ user.nickname }}</div>
          </div>
        </div>
      </div>

      <div
        v-if="!showSidebar"
        class="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow p-1 rounded-r-lg"
        @click="showSidebar = true"
      >
        <van-icon name="arrow" color="#1989fa" />
      </div>

      <div class="flex-1 flex flex-col h-full bg-white">
        <div v-if="selectedUser" class="flex-1 flex flex-col overflow-hidden">
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

        <div
          v-else
          class="flex-1 flex flex-center items-center justify-center text-gray-400 flex-col"
        >
          <van-icon name="chat-o" size="48" />
          <p class="mt-2">请选择一个用户开始聊天</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/store/modules/user";
import { showToast } from "vant";

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

const showSidebar = ref(true);
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

const selectUser = (userId: string) => {
  selectedUser.value = userId;
  scrollToBottom();
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

onMounted(() => initWebSocket());
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
