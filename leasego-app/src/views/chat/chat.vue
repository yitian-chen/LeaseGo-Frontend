<template>
  <div class="chat-container flex flex-col h-[100vh] bg-gray-100">
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
                'w-2 h-2 rounded-full',
                user.online ? 'bg-green-500' : 'bg-gray-300'
              ]"
            ></div>
            <div class="flex-1 truncate text-sm">{{ user.id }}</div>
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
                    {{ selectedUser }}
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
              class="flex-1 bg-gray-100 rounded-full"
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

// ✨ 修复点 1：使用 computed 确保用户名修改后能自动感知
// 注意：根据后端 LoginServiceImpl 逻辑，这里应使用手机号作为唯一标识过滤
const currentUserIdentifier = computed(
  () => userStore.userInfo?.nickname || "未知用户"
);
// 如果你的后端是用手机号过滤，请改为：userStore.userInfo?.phone (需确保接口返回了该字段)

const showSidebar = ref(true);
const selectedUser = ref<string | null>(null);
const inputText = ref("");
const chatBoxRef = ref<HTMLElement | null>(null);

// 存储结构：{ [userId]: { online: boolean, messages: [] } }
const contactsMap = ref<Record<string, { online: boolean; messages: any[] }>>(
  {}
);

// 列表排序：在线的排前面
const allContacts = computed(() => {
  return Object.keys(contactsMap.value)
    .map(id => ({
      id,
      online: contactsMap.value[id].online
    }))
    .sort((a, b) => (a.online === b.online ? 0 : a.online ? -1 : 1));
});

const currentMessages = computed(() => {
  return selectedUser.value
    ? contactsMap.value[selectedUser.value]?.messages || []
    : [];
});

let ws: WebSocket | null = null;

const initWebSocket = () => {
  const token = userStore.token;
  if (!token) return;

  const wsUrl = `ws://localhost:8081/app/chat?token=${token}`;
  ws = new WebSocket(wsUrl);

  ws.onmessage = event => {
    try {
      const data = JSON.parse(event.data);

      // 1. 处理系统公告（在线用户列表）
      if (data.system) {
        let onlineList: string[] = [];
        try {
          // 适配后端嵌套 JSON 字符串的特殊格式
          const inner =
            typeof data.message === "string" ? JSON.parse(data.message) : data;
          onlineList = inner.message || [];
        } catch (e) {
          console.error("解析列表失败", e);
        }

        // 更新所有用户的在线状态
        onlineList.forEach(userId => {
          // ✨ 修复点 2：过滤掉自己，不把自己放进列表
          if (userId === currentUserIdentifier.value) return;

          if (!contactsMap.value[userId]) {
            contactsMap.value[userId] = { online: true, messages: [] };
          } else {
            contactsMap.value[userId].online = true;
          }
        });

        // 处理下线的用户
        Object.keys(contactsMap.value).forEach(id => {
          if (!onlineList.includes(id)) {
            contactsMap.value[id].online = false;
          }
        });
      }
      // 2. 处理聊天消息
      else {
        const sender = data.fromName;
        // ✨ 修复点 3：忽略来自自己的回传消息（因为发送时已本地添加）
        if (sender === currentUserIdentifier.value) return;

        if (!contactsMap.value[sender]) {
          contactsMap.value[sender] = { online: true, messages: [] };
        }

        contactsMap.value[sender].messages.push({
          fromMe: false,
          text: data.message
        });

        if (selectedUser.value === sender) scrollToBottom();
      }
    } catch (e) {
      console.error("WS解析错误", e);
    }
  };
};

const selectUser = (userId: string) => {
  selectedUser.value = userId;
  scrollToBottom();
};

const sendMessage = () => {
  if (!inputText.value.trim() || !ws || !selectedUser.value) return;

  const msgObj = {
    toName: selectedUser.value,
    message: inputText.value
  };

  ws.send(JSON.stringify(msgObj));

  // 本地追加记录
  contactsMap.value[selectedUser.value].messages.push({
    fromMe: true,
    text: inputText.value
  });

  inputText.value = "";
  scrollToBottom();
};

const scrollToBottom = () => {
  nextTick(() => {
    if (chatBoxRef.value)
      chatBoxRef.value.scrollTop = chatBoxRef.value.scrollHeight;
  });
};

onMounted(() => initWebSocket());
onUnmounted(() => ws?.close());
</script>
