<template>
  <div class="chat-container flex flex-col h-[100vh] bg-gray-100 relative">
    <!-- 版本水印 -->
    <div class="version-watermark">v1.6.0</div>

    <!-- 聊天视图 -->
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
            :src="contactsMap[selectedUser]?.avatar || defaultAvatar"
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
            :src="myAvatar"
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
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useUserStore } from "@/store/modules/user";
import { showToast } from "vant";
import { getChatHistory } from "@/api/chat";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const defaultAvatar = "https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg";

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

// 获取当前用户头像
const myAvatar = computed(() => {
  const avatar = (userStore.userInfo as any)?.avatarUrl;
  return avatar || defaultAvatar;
});
const chatBoxRef = ref<HTMLElement | null>(null);

// ✅ Key 统一为对方的 userId 字符串
const contactsMap = ref<
  Record<
    string,
    {
      id: string;
      nickname: string;
      avatar: string;
      messages: any[];
    }
  >
>({});

const currentMessages = computed(() => {
  return selectedUser.value
    ? contactsMap.value[selectedUser.value]?.messages || []
    : [];
});

let ws: WebSocket | null = null;

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

      // 忽略系统消息，只处理私聊消息
      if (data.system) return;

      const senderId = String(data.fromId);

      // 忽略自己发给自己的消息回传
      if (senderId === String(currentUserId.value)) return;

      // 如果是陌生人发消息，自动建档
      if (!contactsMap.value[senderId]) {
        contactsMap.value[senderId] = {
          id: senderId,
          nickname: data.fromName || "未知用户",
          messages: []
        };
      }

      contactsMap.value[senderId].messages.push({
        fromMe: false,
        text: data.message
      });

      // 只有当你正处于和他的聊天界面时，才滚动到底部
      if (selectedUser.value === senderId) scrollToBottom();
    } catch (e) {
      console.error("WS解析错误", e);
    }
  };

  ws.onerror = () => {
    showToast("聊天室连接异常");
  };
};

const selectUser = async (userId: string, nickname?: string, avatar?: string) => {
  selectedUser.value = userId;

  // 确保联系人存在
  if (!contactsMap.value[userId]) {
    contactsMap.value[userId] = {
      id: userId,
      nickname: nickname || "未知用户",
      avatar: avatar || "",
      messages: []
    };
  }

  // 加载与该用户的聊天历史
  try {
    const res = await getChatHistory(Number(userId));
    if (!res.data) return;

    const { messages, userAvatars } = res.data;

    if (messages && messages.length > 0) {
      contactsMap.value[userId].messages = messages.map(msg => ({
        fromMe: msg.fromMe,
        fromId: msg.fromId,
        text: msg.message
      }));
      // 更新昵称（如果历史记录中有）
      if (!nickname && messages[0]) {
        contactsMap.value[userId].nickname = messages[0].fromName;
      }
    }
    nextTick(() => scrollToBottom());
  } catch (e) {
    console.error("加载聊天记录失败", e);
  }
};

// 返回消息页面
const goBack = () => {
  router.back();
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

onMounted(async () => {
  initWebSocket();

  // 如果 URL 有 userId 参数，自动选择该用户
  const userId = route.query.userId as string;
  const nickname = route.query.nickname as string;
  const avatar = route.query.avatar as string;
  if (userId) {
    await selectUser(userId, nickname ? decodeURIComponent(nickname) : undefined, avatar ? decodeURIComponent(avatar) : undefined);
  }
});
onUnmounted(() => {
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
