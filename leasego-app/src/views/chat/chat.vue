<template>
  <div class="chat-container flex flex-col h-[100vh] bg-gray-100">
    <van-nav-bar title="私信聊天" left-arrow @click-left="router.back()" />

    <div class="flex flex-1 overflow-hidden relative">
      <div
        class="sidebar w-1/3 min-w-[120px] max-w-[200px] bg-white border-r border-gray-200 flex flex-col transition-all duration-300 absolute md:relative z-20 h-full shadow-md md:shadow-none"
        v-show="isSidebarOpen"
      >
        <div
          class="p-3 bg-blue-50 border-b text-sm font-bold text-gray-700 flex justify-between items-center"
        >
          在线用户 ({{ onlineUsers.length }})
        </div>
        <div class="flex-1 overflow-y-auto">
          <div
            v-for="user in onlineUsers"
            :key="user"
            @click="selectUser(user)"
            :class="[
              'p-3 border-b cursor-pointer text-sm truncate transition-colors flex items-center',
              selectedUser === user
                ? 'bg-blue-100 text-blue-600 font-medium'
                : 'hover:bg-gray-50 text-gray-700'
            ]"
          >
            <span class="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
            <span v-if="user !== currentUserIdentifier">{{ user }}</span>
            <span v-else>{{ user }} (我)</span>
          </div>
          <div
            v-if="onlineUsers.length === 0"
            class="p-4 text-xs text-gray-400 text-center"
          >
            暂无其他用户在线
          </div>
        </div>
      </div>

      <div class="flex-1 flex flex-col relative w-full h-full">
        <div
          class="p-2 bg-white shadow-sm flex items-center absolute top-0 w-full z-10 border-b h-[50px]"
        >
          <van-icon
            name="wap-nav"
            size="22"
            class="mr-3 cursor-pointer text-gray-500 md:hidden"
            @click="isSidebarOpen = !isSidebarOpen"
          />
          <span class="font-medium text-gray-700 text-sm">
            {{
              selectedUser
                ? `与 ${selectedUser} 聊天中`
                : "👈 请在左侧选择一个用户"
            }}
          </span>
        </div>

        <div
          class="chat-box flex-1 overflow-y-auto p-4 mt-[50px]"
          ref="chatBoxRef"
          @click="closeSidebarOnMobile"
        >
          <template v-if="selectedUser">
            <div
              v-for="(msg, index) in currentMessages"
              :key="index"
              class="mb-4"
            >
              <div v-if="!msg.fromMe" class="flex items-start">
                <van-image
                  round
                  width="40"
                  height="40"
                  src="https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg"
                />
                <div class="ml-2 max-w-[70%]">
                  <div class="text-xs text-gray-500 mb-1">
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
                  width="40"
                  height="40"
                  src="https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg"
                />
                <div class="mr-2 max-w-[70%]">
                  <div class="text-xs text-gray-500 mb-1 text-right">我</div>
                  <div
                    class="bg-blue-500 text-white p-2 rounded-lg shadow-sm text-sm break-words"
                  >
                    {{ msg.text }}
                  </div>
                </div>
              </div>
            </div>
          </template>

          <div
            v-else
            class="h-full flex items-center justify-center text-gray-400 text-sm flex-col"
          >
            <van-icon name="chat-o" size="40" class="mb-2 text-gray-300" />
            <p>选择一个在线用户开始聊天吧</p>
          </div>
        </div>

        <div
          class="input-area bg-white p-2 flex items-center border-t border-gray-200"
        >
          <van-field
            v-model="inputText"
            placeholder="输入消息..."
            class="flex-1 bg-gray-100 rounded-full px-4"
            :border="false"
            @keyup.enter="sendMessage"
            :disabled="!selectedUser"
          />
          <van-button
            type="primary"
            size="small"
            class="ml-2 w-16"
            @click="sendMessage"
            :disabled="!selectedUser"
          >
            发送
          </van-button>
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

// 后端目前基于什么字段作为名字这里就取什么，假设你的体系里使用的是手机号或者nickname
const currentUserIdentifier = ref(userStore.userInfo?.nickname || "未知");

// UI 相关状态
const isSidebarOpen = ref(window.innerWidth >= 768); // PC端默认展开，移动端默认看情况
const chatBoxRef = ref<HTMLElement | null>(null);

// 聊天相关状态
const onlineUsers = ref<string[]>([]);
const selectedUser = ref<string>("");
const inputText = ref("");

// 本地聊天记录状态：键为对方用户名，值为聊天数组
// 格式如： { "18980111110": [ { fromMe: false, text: "你好" }, { fromMe: true, text: "在吗" } ] }
const messagesRecord = ref<Record<string, { fromMe: boolean; text: string }[]>>(
  {}
);

// 当前选中用户的聊天记录（计算属性）
const currentMessages = computed(() => {
  if (!selectedUser.value) return [];
  return messagesRecord.value[selectedUser.value] || [];
});

let ws: WebSocket | null = null;

const initWebSocket = () => {
  const token = userStore.token;
  if (!token) {
    showToast("身份凭证缺失，无法连接聊天");
    return;
  }

  const wsUrl = `ws://localhost:8081/app/chat?token=${token}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("聊天室连接成功");
  };

  ws.onmessage = event => {
    try {
      const data = JSON.parse(event.data);

      // 1. 系统公告消息 (在线用户列表更新)
      if (data.system) {
        let userList: string[] = [];
        // 处理特殊的嵌套 JSON 字符串格式: "{\"system\": true,\"fromName\": null,\"message\": [\"xxx\",\"yyy\"]}"
        if (typeof data.message === "string") {
          try {
            const innerData = JSON.parse(data.message);
            userList = innerData.message || [];
          } catch (e) {
            console.error("解析嵌套系统消息失败", e);
          }
        } else if (Array.isArray(data.message)) {
          userList = data.message;
        }
        onlineUsers.value = userList;
      }
      // 2. 收到私发消息
      else if (data.system === false && data.fromName) {
        const sender = data.fromName;
        // 如果该用户的聊天记录还不存在，先初始化数组
        if (!messagesRecord.value[sender]) {
          messagesRecord.value[sender] = [];
        }

        // 推入新消息
        messagesRecord.value[sender].push({
          fromMe: false,
          text: data.message
        });

        // 仅当当前正处于和他的聊天窗口时，才滚动到底部
        if (selectedUser.value === sender) {
          scrollToBottom();
        } else {
          // 这里以后可以扩展：例如给对方名字旁边加个红点提示有未读消息
          showToast(`收到来自 ${sender} 的新消息`);
        }
      }
    } catch (e) {
      console.error("消息解析失败", e);
    }
  };

  ws.onclose = () => {
    showToast("聊天已断开连接");
  };
};

// 选中某个在线用户进行聊天
const selectUser = (user: string) => {
  if (user === currentUserIdentifier.value) {
    showToast("不能和自己聊天哦");
    return;
  }
  selectedUser.value = user;

  // 初始化记录
  if (!messagesRecord.value[user]) {
    messagesRecord.value[user] = [];
  }

  closeSidebarOnMobile();
  scrollToBottom();
};

// 发送消息
const sendMessage = () => {
  if (!inputText.value.trim() || !ws || !selectedUser.value) return;

  // 严格按照要求的 JSON 格式
  const msgObj = {
    toName: selectedUser.value,
    message: inputText.value
  };
  ws.send(JSON.stringify(msgObj));

  // 前端将自己发送的消息追加到对应的本地聊天记录中
  if (!messagesRecord.value[selectedUser.value]) {
    messagesRecord.value[selectedUser.value] = [];
  }
  messagesRecord.value[selectedUser.value].push({
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

// 移动端体验优化：点击聊天区域时自动收起侧边栏
const closeSidebarOnMobile = () => {
  if (window.innerWidth < 768 && isSidebarOpen.value) {
    isSidebarOpen.value = false;
  }
};

onMounted(() => {
  initWebSocket();
});

onUnmounted(() => {
  if (ws) ws.close();
});
</script>
