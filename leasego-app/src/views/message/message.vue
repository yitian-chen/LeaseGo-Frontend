<template>
  <div class="message-page flex flex-col h-[100vh] bg-gray-100">
    <van-nav-bar title="消息">
      <template #right>
        <van-icon name="search" size="20" @click="goToSearch" />
      </template>
    </van-nav-bar>

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
          <van-icon :name="item.icon" size="25" />
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
        <div class="flex flex-col items-end gap-1 flex-shrink-0">
          <div class="text-xs text-gray-400">
            {{ formatTime(user.lastMessageTime) }}
          </div>
          <div
            v-if="user.unreadCount > 0"
            class="unread-badge"
          >
            {{ user.unreadCount > 99 ? '99+' : user.unreadCount }}
          </div>
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
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getConversationList } from "@/api/chat";
import { useChatStore } from "@/store/modules/chat";
import { useWebSocket } from "@/hooks/useWebSocket";

const router = useRouter();
const chatStore = useChatStore();
const { setCurrentChatUserId, clearUnreadCount } = useWebSocket();

const contactsMap = computed(() => chatStore.contacts);

const defaultAvatar = "https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg";

const navList = ref([
  {
    icon: "volume-o",
    name: "通知",
    path: "",
    color: "#f1be4a"
  },
  {
    icon: "chat-o",
    name: "评论",
    path: "",
    color: "#51b290"
  },
  {
    icon: "good-job-o",
    name: "赞",
    path: "",
    color: "#f39653"
  }
]);

const goToSearch = () => {
  router.push("/searchUser");
};

const allContacts = computed(() => {
  return Object.values(contactsMap.value).sort((a, b) => {
    if (a.lastMessageTime && b.lastMessageTime) {
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    }
    return a.online === b.online ? 0 : a.online ? -1 : 1;
  });
});

// 总未读数
const totalUnreadCount = computed(() => {
  return Object.values(contactsMap.value).reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
});

// 同步总未读数到 store
watch(totalUnreadCount, (newVal) => {
  chatStore.setTotalUnreadCount(newVal);
});

const goToChat = (user: { id: string; nickname: string; avatar?: string }) => {
  setCurrentChatUserId(user.id);
  clearUnreadCount(user.id);
  router.push(`/chat?userId=${user.id}&nickname=${encodeURIComponent(user.nickname)}&avatar=${encodeURIComponent(user.avatar || '')}`);
};

// 监听路由返回时清除当前聊天用户ID
router.afterEach((to, from) => {
  if (from.path === '/chat' && to.path === '/message') {
    setCurrentChatUserId(null);
  }
});

// 页面挂载时加载会话列表（如果store中没有）
onMounted(async () => {
  if (Object.keys(chatStore.contacts).length === 0) {
    try {
      const res = await getConversationList();
      if (res.data && res.data.length > 0) {
        const map: Record<string, any> = {};
        res.data.forEach((conv: any) => {
          const uid = String(conv.otherUserId);
          map[uid] = {
            id: uid,
            nickname: conv.otherUserName,
            avatar: conv.avatarUrl || "",
            online: false,
            lastMessage: conv.lastMessage,
            lastMessageTime: conv.lastMessageTime,
            unreadCount: conv.unreadCount || 0
          };
        });
        chatStore.setContacts(map);
      }
    } catch (e) {
      console.error("加载会话列表失败", e);
    }
  }
});

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
</script>

<style scoped>
.unread-badge {
  background-color: #f56c6c;
  color: white;
  border-radius: 50%;
  padding: 2px 6px;
  font-size: 12px;
  min-width: 18px;
  min-height: 18px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
