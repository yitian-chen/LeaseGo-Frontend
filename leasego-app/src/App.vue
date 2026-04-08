<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useUserStore } from "@/store/modules/user";
import { initWebSocket } from "@/hooks/useWebSocket";
import { useChatStore } from "@/store/modules/chat";

const userStore = useUserStore();

onMounted(async () => {
  // 如果用户已登录，初始化 WebSocket 并加载会话列表
  if (userStore.token) {
    const chatStore = useChatStore();

    // 先加载会话列表（如果store中没有）
    if (Object.keys(chatStore.contacts).length === 0) {
      const { getConversationList } = await import("@/api/chat");
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

    // 再初始化 WebSocket
    initWebSocket();
  }
});
</script>

<style></style>
