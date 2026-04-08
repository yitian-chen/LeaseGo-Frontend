<template>
  <div class="user-container">
    <div class="user h-[30vh] flex flex-col justify-center items-center">
      <van-image
        @click="previewAvatar"
        round
        width="30vw"
        height="30vw"
        :src="userStore.userInfo?.avatarUrl || defaultAvatarUrl"
      >
        <template v-slot:error>加载失败</template>
      </van-image>
      <van-button size="small" round class="mt-3" @click="triggerAvatarUpload">
        更改头像
      </van-button>
      <input
        type="file"
        ref="avatarInputRef"
        accept="image/jpeg,image/png,image/gif,image/webp"
        class="hidden"
        @change="handleAvatarChange"
      />
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
import { showToast, showSuccessToast, showLoadingToast, closeToast, showImagePreview } from "vant";
import defaultAvatarUrl from "../../../public/favicon.ico";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { uploadAvatar, updateAvatar } from "@/api/user";

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

// 头像上传相关
const avatarInputRef = ref<HTMLInputElement | null>(null);

// 触发头像选择
const triggerAvatarUpload = () => {
  avatarInputRef.value?.click();
};

// 预览头像
const previewAvatar = () => {
  showImagePreview([
    userStore.userInfo?.avatarUrl || defaultAvatarUrl
  ]);
};

// 处理头像选择
const handleAvatarChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  // 限制文件大小 5MB
  if (file.size > 5 * 1024 * 1024) {
    showToast("图片大小不能超过5MB");
    return;
  }

  // 限制文件类型
  if (!file.type.startsWith("image/")) {
    showToast("请选择图片文件");
    return;
  }

  try {
    showLoadingToast({ message: "上传中...", forbidClick: true });

    // 1. 上传文件获取 URL
    const uploadRes = await uploadAvatar(file);
    console.log("上传响应:", uploadRes);

    // uploadRes 已经是 { code, message, data } 结构
    if (uploadRes.code !== 200) {
      closeToast();
      showToast(uploadRes.message || "上传失败");
      return;
    }

    const avatarUrl = uploadRes.data as string;

    // 2. 更新头像
    await updateAvatar(avatarUrl);

    // 3. 更新本地用户信息
    userStore.userInfo!.avatarUrl = avatarUrl;

    closeToast();
    showSuccessToast("头像更新成功");
  } catch (error) {
    closeToast();
    console.error("头像上传失败", error);
    showToast("头像上传失败");
  }

  // 清空 input 值，允许重复选择同一文件
  target.value = "";
};

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

onMounted(async () => {
  // 只有当用户信息为空且有 token 时才获取用户信息
  if (!userStore.userInfo && userStore.token) {
    try {
      await userStore.GetInfoAction();
    } catch (e) {
      console.error("获取用户信息失败", e);
    }
  }
});
</script>

<style scoped lang="less">
.user {
  background: var(--van-primary-background-color);
}
</style>
