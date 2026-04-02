<template>
  <div class="user-container">
    <div class="user h-[30vh] flex flex-col justify-center items-center">
      <van-image
        @click="
          showImagePreview([userStore.userInfo?.avatarUrl || defaultAvatarUrl])
        "
        round
        width="30vw"
        height="30vw"
        :src="userStore.userInfo?.avatarUrl || defaultAvatarUrl"
      >
        <template v-slot:error>加载失败</template>
      </van-image>
      <div
        class="mt-[8px] font-bold text-[16px] flex items-center cursor-pointer"
        @click="openEditDialog"
      >
        <span>{{ userStore.userInfo?.nickname || "测试" }}</span>
        <van-icon name="edit" class="ml-[4px]" />
      </div>
    </div>

    <div class="main-container flex justify-around mt-[30px]">
      <div
        v-for="item in navList"
        :key="item.path"
        class="flex flex-col justify-center items-center"
        @click="router.push(item.path)"
      >
        <SvgIcon :name="item.icon" size="50" />
        <span>{{ item.name }}</span>
      </div>
    </div>
    <div class="main-container flex justify-center mt-[150px]">
      <van-button type="primary" class="w-[50vw]" @click="logoutHandle"
        >退出登录</van-button
      >
    </div>

    <van-dialog
      v-model:show="showEditName"
      title="修改昵称"
      show-cancel-button
      @confirm="handleUpdateNickname"
    >
      <van-field
        v-model="newNickname"
        placeholder="请输入新昵称"
        maxlength="20"
        input-align="center"
        clearable
      />
    </van-dialog>
  </div>
</template>

<script setup lang="ts" name="UserCenter">
import { useUserStore } from "@/store/modules/user";
// 新增引入 showToast, showSuccessToast 提示信息
import { showImagePreview, showToast, showSuccessToast } from "vant";
import defaultAvatarUrl from "../../../public/favicon.ico";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const navList = ref([
  {
    icon: "历史",
    name: "浏览历史",
    path: "/browsingHistory"
  },
  {
    icon: "预约",
    name: "我的预约",
    path: "/myAppointment"
  },
  {
    icon: "合同",
    name: "我的租约",
    path: "/myAgreement"
  }
]);

const userStore = useUserStore();

// 新增：控制弹窗和昵称输入的状态
const showEditName = ref(false);
const newNickname = ref("");

// 新增：打开弹窗并赋初值
const openEditDialog = () => {
  newNickname.value = userStore.userInfo?.nickname || "";
  showEditName.value = true;
};

// 新增：确认修改昵称的处理逻辑
const handleUpdateNickname = async () => {
  if (!newNickname.value.trim()) {
    showToast("昵称不能为空");
    return;
  }
  try {
    await userStore.UpdateNicknameAction({
      nickname: newNickname.value.trim()
    });
    showSuccessToast("修改成功");
  } catch (error) {
    console.error("修改昵称失败", error);
  }
};

// 退出登陆
const logoutHandle = () => {
  userStore.Logout();
  // 清空路由浏览历史记录
  router.replace("/");
};

onMounted(() => {
  userStore.GetInfoAction();
});
</script>

<style scoped lang="less">
.user {
  background: var(--van-primary-background-color);
}
</style>
