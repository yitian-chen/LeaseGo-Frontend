<template>
  <div class="message-page flex flex-col h-[100vh] bg-gray-100">
    <van-nav-bar title="消息" />

    <!-- 快捷入口 -->
    <div class="bg-white p-4 flex justify-around items-center">
      <div
        v-for="item in navList"
        :key="item.path"
        class="flex flex-col justify-center items-center"
        @click="router.push(item.path)"
      >
        <div
          :style="{ background: item.color }"
          class="flex flex-col justify-center items-center h-[12vw] w-[12vw] rounded-xl py-[3px]"
        >
          <van-icon :name="item.icon" :badge="item.badge" size="25" />
        </div>
        <span class="mt-[2px] text-xs text-gray-600">{{ item.name }}</span>
      </div>
    </div>

    <!-- 对话列表 -->
    <div class="flex-1 overflow-y-auto bg-white mt-2">
      <div
        v-for="user in allContacts"
        :key="user.id"
        @click="goToChat(user)"
        class="p-4 border-b cursor-pointer flex items-center gap-3"
      >
        <div class="relative">
          <van-image
            round
            width="48"
            height="48"
            :src="user.avatar || defaultAvatar"
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/store/modules/user";
import { showToast } from "vant";
import { getConversationList } from "@/api/chat";

const router = useRouter();
const userStore = useUserStore();

const defaultAvatar = "https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg";

const navList = ref([
  {
    icon: "volume-o",
    name: "通知",
    path: "",
    color: "#f1be4a",
    badge: null
  },
  {
    icon: "chat-o",
    name: "评论",
    path: "",
    color: "#51b290",
    badge: null
  },
  {
    icon: "good-job-o",
    name: "赞",
    path: "",
    color: "#f39653",
    badge: null
  }
]);

// 对话列表
const contactsMap = ref<
  Record<
    string,
    {
      id: string;
      nickname: string;
      avatar: string;
      online: boolean;
      lastMessage?: string;
      lastMessageTime?: string;
    }
  >
>({});

const allContacts = computed(() => {
  return Object.values(contactsMap.value).sort((a, b) => {
    if (a.lastMessageTime && b.lastMessageTime) {
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    }
    return a.online === b.online ? 0 : a.online ? -1 : 1;
  });
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

      if (data.system) {
        const onlineList: any[] = data.message || [];
        onlineList.forEach(user => {
          const uid = String(user.userId);
          if (contactsMap.value[uid]) {
            contactsMap.value[uid].online = true;
            contactsMap.value[uid].nickname = user.nickname || contactsMap.value[uid].nickname;
          }
        });
        // 离线处理
        Object.keys(contactsMap.value).forEach(uid => {
          if (!onlineList.find((u: any) => String(u.userId) === uid)) {
            contactsMap.value[uid].online = false;
          }
        });
      }
    } catch (e) {
      console.error("WS解析错误", e);
    }
  };
};

const loadConversationList = async () => {
  try {
    const { data } = await getConversationList();
    if (data && data.length > 0) {
      data.forEach(conv => {
        const uid = String(conv.otherUserId);
        contactsMap.value[uid] = {
          id: uid,
          nickname: conv.otherUserName,
          avatar: conv.avatarUrl || "",
          online: contactsMap.value[uid]?.online || false,
          lastMessage: conv.lastMessage,
          lastMessageTime: conv.lastMessageTime
        };
      });
    }
  } catch (e) {
    console.error("加载会话列表失败", e);
  }
};

const goToChat = (user: { id: string; nickname: string; avatar?: string }) => {
  router.push(`/chat?userId=${user.id}&nickname=${encodeURIComponent(user.nickname)}&avatar=${encodeURIComponent(user.avatar || '')}`);
};

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
  if (ws) {
    ws.close();
  }
});
</script>

<style scoped></style>
