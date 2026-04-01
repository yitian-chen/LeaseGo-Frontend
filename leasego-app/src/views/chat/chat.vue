<template>
  <div class="chat-container flex flex-col h-[100vh] bg-gray-100">
    <van-nav-bar title="公共聊天室" left-arrow @click-left="router.back()" />

    <div class="chat-box flex-1 overflow-y-auto p-4" ref="chatBoxRef">
      <div v-for="(msg, index) in messageList" :key="index" class="mb-4">
        <div v-if="msg.system" class="text-center text-xs text-gray-500">
          {{ msg.message }}
        </div>
        <div v-else-if="msg.fromName !== currentUser" class="flex items-start">
          <van-image
            round
            width="40"
            height="40"
            src="https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg"
          />
          <div class="ml-2 max-w-[70%]">
            <div class="text-xs text-gray-500 mb-1">{{ msg.fromName }}</div>
            <div class="bg-white p-2 rounded-lg shadow-sm text-sm break-words">
              {{ msg.message }}
            </div>
          </div>
        </div>
        <div v-else class="flex items-start flex-row-reverse">
          <van-image
            round
            width="40"
            height="40"
            src="https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg"
          />
          <div class="mr-2 max-w-[70%]">
            <div class="text-xs text-gray-500 mb-1 text-right">我</div>
            <div
              class="bg-blue-500 text-white p-2 rounded-lg shadow-sm text-sm break-words"
            >
              {{ msg.message }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      class="input-area bg-white p-2 flex items-center border-t border-gray-200"
    >
      <van-field
        v-model="inputText"
        placeholder="说点什么吧..."
        class="flex-1 bg-gray-100 rounded-full px-4"
        :border="false"
        @keyup.enter="sendMessage"
      />
      <van-button
        type="primary"
        size="small"
        class="ml-2 w-16"
        @click="sendMessage"
        >发送</van-button
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/store/modules/user";

const router = useRouter();
const userStore = useUserStore();
const currentUser = ref(userStore.userInfo?.nickname || "未知用户");

const chatBoxRef = ref<HTMLElement | null>(null);
const messageList = ref<any[]>([]);
const inputText = ref("");
let ws: WebSocket | null = null;

const initWebSocket = () => {
  // 根据你的后端地址调整，这里默认取当前域名/IP的 8080 端口（常见的 SpringBoot 端口）
  // 也可以配合 VITE_APP_BASE_URL 环境变量使用
  const token = userStore.token;
  const wsUrl = `ws://localhost:8081/app/chat?token=${token}`; // 请确保后端放行或解析了这个 token

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    messageList.value.push({ system: true, message: "连接聊天室成功" });
  };

  ws.onmessage = event => {
    try {
      const data = JSON.parse(event.data);
      messageList.value.push(data);
      scrollToBottom();
    } catch (e) {
      console.error("消息解析失败", e);
    }
  };

  ws.onclose = () => {
    messageList.value.push({ system: true, message: "已断开连接" });
  };
};

const sendMessage = () => {
  if (!inputText.value.trim() || !ws) return;

  const msgObj = {
    toName: "", // 这里留空代表群发
    message: inputText.value
  };
  ws.send(JSON.stringify(msgObj));
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

onMounted(() => {
  initWebSocket();
});

onUnmounted(() => {
  if (ws) ws.close();
});
</script>
