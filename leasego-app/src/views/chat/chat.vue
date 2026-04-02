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

// ✅ 修改为：用 userId 当唯一标识
const currentUserId = computed(() => userStore.userInfo?.id || null);
// 同时保留当前昵称，以备不时之需
const currentNickname = computed(() => userStore.userInfo?.nickname || "我");
// 如果你的后端是用手机号过滤，请改为：userStore.userInfo?.phone (需确保接口返回了该字段)

const showSidebar = ref(true);
const selectedUser = ref<string | null>(null);
const inputText = ref("");
const chatBoxRef = ref<HTMLElement | null>(null);

// ✅ 修改为：Key 为对方的 userId (number 或 string)
const contactsMap = ref<
  Record<
    string,
    {
      id: string;
      nickname: string; // 🌟 新增：存储对方真实昵称
      online: boolean;
      messages: any[];
    }
  >
>({});

// 修改计算属性：把昵称也带出去给模板用
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

const initWebSocket = () => {
  const token = userStore.token;
  if (!token) return;

  const wsUrl = `ws://localhost:8081/app/chat?token=${token}`;
  ws = new WebSocket(wsUrl);

  ws.onmessage = event => {
    try {
      const data = JSON.parse(event.data);

      // 1. 处理系统公告（在线用户列表）
      // 后端现在返回的应该是：[{ userId: 1, nickname: "chen" }, ...]
      if (data.system) {
        let onlineList: any[] = [];
        try {
          const inner =
            typeof data.message === "string" ? JSON.parse(data.message) : data;
          onlineList = inner.message || [];
        } catch (e) {
          console.error("解析列表失败", e);
        }

        // ✨ 将在线列表转为一个只包含 userId 的数组，方便后续对比下线用户
        const onlineIdList = onlineList.map(user =>
          String(user.userId || user.id)
        );

        onlineList.forEach(user => {
          const uid = String(user.userId || user.id);
          const uname = user.nickname || "未知用户";

          // 🌟 过滤掉自己 (用 ID 过滤)
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
            // 如果对方改名了，同步更新列表里显示的名字
            contactsMap.value[uid].nickname = uname;
          }
        });

        // 处理下线的用户
        Object.keys(contactsMap.value).forEach(uid => {
          if (!onlineIdList.includes(uid)) {
            contactsMap.value[uid].online = false;
          }
        });
      }
      // 2. 处理别人发来的聊天消息
      // 后端现在返回：{ system: false, fromId: 1, fromName: "chen", message: "你好" }
      else {
        const senderId = String(data.fromId);
        const senderName = data.fromName || "未知用户";

        // 🌟 忽略自己发给自己的（虽然我们后端代码已经改了不发给自己，但前端加个保险没坏处）
        if (senderId === String(currentUserId.value)) return;

        // 如果收到一个陌生人（不在列表里）的消息，帮他建个档案
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

        if (selectedUser.value === senderId) scrollToBottom();
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

  // ✅ 修改为传递 toId
  const msgObj = {
    toId: Number(selectedUser.value), // 根据后端类型，可能是要转成数字
    message: inputText.value
  };

  ws.send(JSON.stringify(msgObj));

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
