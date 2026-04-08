<template>
  <van-tabbar
    v-show="isShowTabBar"
    v-model="active"
    :placeholder="true"
    :route="true"
    fixed
  >
    <van-tabbar-item
      v-for="(item, index) in tabBarData"
      :key="index"
      :icon="item?.icon as string"
      :to="item.to"
      :badge="item.badge"
    >
      {{ item.title }}
    </van-tabbar-item>
  </van-tabbar>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import tabBarRoutes from "@/router/tabBarRoutes";
import { useRoute } from "vue-router";
import { useChatStore } from "@/store/modules/chat";
import { storeToRefs } from "pinia";

const route = useRoute();
const chatStore = useChatStore();
const { totalUnreadCount } = storeToRefs(chatStore);
const active = ref(0);

const tabBarData = computed(() => {
  return tabBarRoutes.map(item => {
    const badge = item.path === "/message" && totalUnreadCount.value > 0
      ? (totalUnreadCount.value > 99 ? "99+" : String(totalUnreadCount.value))
      : undefined;
    return {
      icon: item.meta?.icon,
      title: item.meta?.title,
      to: {
        path: item.path
      },
      badge
    };
  });
});

const isShowTabBar = computed(() => {
  return tabBarRoutes.some(item => item.path === route.path);
});
</script>
