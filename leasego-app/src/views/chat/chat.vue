<template>
  <div class="chat-container flex flex-col h-[100vh] bg-gray-100 relative">
    <!-- 版本水印 -->
    <div class="version-watermark">v1.6.0</div>

    <!-- 聊天视图 -->
    <van-nav-bar
      :title="currentContact?.nickname || '私聊'"
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
            :src="currentContact?.avatar || defaultAvatar"
          />
          <div class="ml-2">
            <div class="text-[10px] text-gray-400 mb-1">
              {{ currentContact?.nickname || "对方" }}
            </div>
            <div
              class="bg-white px-3 py-2 rounded-lg shadow-sm text-sm break-words border border-gray-100 inline-block"
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
          <div class="mr-2">
            <div class="text-[10px] text-gray-400 mb-1 text-right">
              我
            </div>
            <div
              class="bg-blue-500 text-white px-3 py-2 rounded-lg shadow-sm text-sm break-words inline-block"
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
import { useChatStore } from "@/store/modules/chat";
import { useWebSocket } from "@/hooks/useWebSocket";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const chatStore = useChatStore();
const { sendMessage: wsSendMessage, setCurrentChatUserId } = useWebSocket();

const defaultAvatar = "https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg";

// 获取当前用户真实 ID
const currentUserId = computed(() => {
  const fromInfo = (userStore.userInfo as any)?.id;
  if (fromInfo) return fromInfo;
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

const currentMessages = computed(() => {
  return selectedUser.value ? (chatStore.messages[selectedUser.value] || []) : [];
});

const currentContact = computed(() => {
  return selectedUser.value ? chatStore.contacts[selectedUser.value] : undefined;
});

const scrollToBottom = () => {
  nextTick(() => {
    if (chatBoxRef.value) {
      chatBoxRef.value.scrollTop = chatBoxRef.value.scrollHeight;
    }
  });
};

const loadChatHistory = async (userId: string) => {
  try {
    const res = await getChatHistory(Number(userId));
    if (!res.data) return;

    const { messages } = res.data;

    if (messages && messages.length > 0) {
      const chatMessages = messages.map((msg: any) => ({
        fromMe: msg.fromMe,
        fromId: msg.fromId,
        text: msg.message,
        time: msg.createTime
      }));
      chatStore.setMessages(userId, chatMessages);
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
  if (!inputText.value.trim() || !selectedUser.value) return;

  const sent = wsSendMessage(Number(selectedUser.value), inputText.value);
  if (!sent) {
    showToast("发送失败，请检查网络");
    return;
  }

  const now = new Date().toISOString();

  // 本地推入聊天气泡
  chatStore.addMessage(selectedUser.value, {
    fromMe: true,
    text: inputText.value,
    time: now
  });

  // 更新联系人的最后一条消息
  if (chatStore.contacts[selectedUser.value]) {
    chatStore.upsertContact({
      ...chatStore.contacts[selectedUser.value],
      lastMessage: inputText.value,
      lastMessageTime: now
    });
  }

  inputText.value = "";
  scrollToBottom();
};

onMounted(async () => {
  // 如果 URL 有 userId 参数，自动选择该用户
  const userId = route.query.userId as string;
  const nickname = route.query.nickname as string;
  const avatar = route.query.avatar as string;

  if (userId) {
    selectedUser.value = userId;
    setCurrentChatUserId(userId);

    // 如果还没有该联系人的信息，添加
    if (!chatStore.contacts[userId]) {
      chatStore.upsertContact({
        id: userId,
        nickname: nickname ? decodeURIComponent(nickname) : "未知用户",
        avatar: avatar ? decodeURIComponent(avatar) : "",
        online: false,
        unreadCount: 0
      });
    }

    await loadChatHistory(userId);
  }
});

onUnmounted(() => {
  setCurrentChatUserId(null);
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
