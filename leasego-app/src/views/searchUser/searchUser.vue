<template>
  <div class="search-user-page flex flex-col h-[100vh] bg-gray-100">
    <van-nav-bar title="搜索用户" left-arrow @click-left="goBack" />

    <!-- 搜索框 -->
    <div class="bg-white p-3 border-b">
      <van-search
        v-model="searchKeyword"
        placeholder="输入手机号或昵称搜索用户"
        show-action
        autofocus
        @search="handleSearch"
      >
        <template #action>
          <div @click="handleSearch">搜索</div>
        </template>
      </van-search>
    </div>

    <!-- 搜索结果 -->
    <div class="flex-1 overflow-y-auto bg-white">
      <div
        v-for="user in searchResults"
        :key="user.id"
        @click="startChat(user)"
        class="p-4 border-b cursor-pointer flex items-center gap-3"
      >
        <van-image
          round
          width="48"
          height="48"
          :src="user.avatarUrl || defaultAvatar"
        />
        <div class="flex-1">
          <div class="text-sm font-medium">{{ user.nickname }}</div>
          <div class="text-xs text-gray-400">{{ user.phone }}</div>
        </div>
        <van-button size="small" type="primary" round>发起聊天</van-button>
      </div>
      <div
        v-if="searched && searchResults.length === 0"
        class="flex flex-col items-center justify-center h-full text-gray-400"
      >
        <van-icon name="search" size="48" />
        <p class="mt-2">未找到用户</p>
      </div>
      <div
        v-else-if="!searched"
        class="flex flex-col items-center justify-center h-full text-gray-400"
      >
        <van-icon name="search" size="48" />
        <p class="mt-2">输入手机号或昵称搜索用户</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { searchUser } from "@/api/user";
import { useChatStore } from "@/store/modules/chat";
import { useWebSocket } from "@/hooks/useWebSocket";

const router = useRouter();
const chatStore = useChatStore();
const { addContact } = useWebSocket();

const defaultAvatar = "https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg";

const searchKeyword = ref("");
const searchResults = ref<Array<{ id: number; nickname: string; phone: string; avatarUrl: string }>>([]);
const searched = ref(false);

const goBack = () => {
  router.back();
};

const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    searchResults.value = [];
    searched.value = false;
    return;
  }
  try {
    const { data } = await searchUser(searchKeyword.value.trim());
    searchResults.value = data || [];
    searched.value = true;
  } catch (e) {
    console.error("搜索用户失败", e);
    searchResults.value = [];
    searched.value = true;
  }
};

const startChat = (user: { id: number; nickname: string; avatarUrl?: string }) => {
  const uid = String(user.id);
  // 添加到联系人
  if (!chatStore.contacts[uid]) {
    chatStore.upsertContact({
      id: uid,
      nickname: user.nickname,
      avatar: user.avatarUrl || "",
      online: false,
      unreadCount: 0
    });
  }
  // 跳转到聊天页面
  router.push(`/chat?userId=${uid}&nickname=${encodeURIComponent(user.nickname)}&avatar=${encodeURIComponent(user.avatarUrl || '')}`);
};
</script>
