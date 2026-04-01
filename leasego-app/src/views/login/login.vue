<template>
  <div class="main-container h-[100vh]">
    <div class="h-[30vh] flex flex-col justify-center items-center">
      <van-image round width="30vw" height="30vw" :src="defaultAvatarUrl" />
    </div>
    <div>
      <van-tabs v-model:active="activeTab" class="mb-4">
        <van-tab title="短信登录" name="sms"></van-tab>
        <van-tab title="密码登录" name="pwd"></van-tab>
      </van-tabs>

      <van-form ref="formRef">
        <van-cell-group inset>
          <van-field
            v-model.trim="loginInfo.phone"
            border
            name="phone"
            required
            type="tel"
            autocomplete="off"
            placeholder="请输入手机号"
            :rules="[
              {
                required: true,
                pattern: /^1([3589]\d|4[5-9]|6[1-2,4-7]|7[0-8])\d{8}$/,
                message: '请正确填写手机号'
              }
            ]"
          />

          <van-field
            v-if="activeTab === 'sms'"
            v-model.trim="loginInfo.code"
            name="code"
            placeholder="请输入短信验证码"
            clearable
            type="digit"
            maxlength="4"
            autocomplete="off"
            :rules="[
              {
                required: true,
                pattern: /^\d{4}$/,
                message: '请正确填写验证码'
              }
            ]"
          >
            <template #button>
              <van-button
                @click="getCodeHandle"
                size="small"
                type="primary"
                native-type="button"
              >
                <div class="flex justify-center items-center">
                  <span class="--van-gray-1">{{
                    codeSendStatus ? "已发送" : "发送验证码"
                  }}</span>
                  <van-count-down
                    v-show="codeSendStatus"
                    ref="countDownRef"
                    @finish="countDownFinishHandle"
                    :time="countDown"
                    :auto-start="false"
                    format="ss"
                  >
                    <template #default="{ seconds }">
                      <span class="--van-gray-1">{{ `(${seconds}s)` }}</span>
                    </template>
                  </van-count-down>
                </div>
              </van-button>
            </template>
          </van-field>

          <van-field
            v-if="activeTab === 'pwd'"
            v-model.trim="loginInfo.password"
            name="password"
            type="password"
            placeholder="请输入密码"
            required
            :rules="[{ required: true, message: '请输入密码' }]"
          />

          <van-field
            v-if="activeTab === 'pwd'"
            v-model.trim="loginInfo.captchaCode"
            name="captchaCode"
            placeholder="请输入图形验证码"
            required
            :rules="[{ required: true, message: '请输入图形验证码' }]"
          >
            <template #button>
              <van-image
                width="80"
                height="30"
                :src="captchaImg"
                @click="loadCaptcha"
                alt="图形验证码"
              />
            </template>
          </van-field>
        </van-cell-group>
        <div class="mt-[50px]">
          <loading-button
            round
            block
            type="primary"
            native-type="submit"
            :loadingClick="onSubmitHandle"
          >
            登录
          </loading-button>
        </div>
      </van-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import defaultAvatarUrl from "../../../public/favicon.ico";
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getSmsCode, getCaptcha } from "@/api/user";
import type { CountDownInstance, FormInstance } from "vant";
import { useUserStore } from "@/store/modules/user";
import LoadingButton from "@/components/LoadingButton/LoadingButton.vue";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

// 登录类型：sms 或 pwd
const activeTab = ref("sms");

const loginInfo = ref({
  phone: "13888888888",
  code: "1234",
  password: "",
  captchaCode: "",
  captchaKey: ""
});

const formRef = ref<FormInstance>();
const codeSendStatus = ref(false);
const countDown = ref(60 * 1000);
const countDownRef = ref<CountDownInstance>();

// 图形验证码相关
const captchaImg = ref("");

const loadCaptcha = async () => {
  try {
    const res = await getCaptcha();
    // 假设后端返回的数据在 res.data 中，包含 image 和 key
    captchaImg.value = res.data.image;
    loginInfo.value.captchaKey = res.data.key;
  } catch (error) {
    console.error("获取图形验证码失败", error);
  }
};

const countDownStartHandle = () => {
  countDownRef.value?.start();
  codeSendStatus.value = true;
};
const countDownResetHandle = () => {
  countDownRef.value?.reset();
  codeSendStatus.value = false;
};
const countDownFinishHandle = () => {
  countDownResetHandle();
};

const getCodeHandle = async () => {
  await formRef.value?.validate("phone");
  countDownStartHandle();
  getSmsCode({ phone: loginInfo.value.phone });
};

const onSubmitHandle = async () => {
  await formRef.value?.validate();

  // 组装提交数据
  const payload: any = { phone: loginInfo.value.phone };
  if (activeTab.value === "sms") {
    payload.code = loginInfo.value.code;
  } else {
    payload.password = loginInfo.value.password;
    payload.captchaCode = loginInfo.value.captchaCode;
    payload.captchaKey = loginInfo.value.captchaKey;
  }

  await userStore.LoginAction(payload);
  await router.replace(
    route.query?.redirect
      ? decodeURIComponent(route.query?.redirect as string)
      : "/"
  );
};

onMounted(() => {
  loadCaptcha(); // 初始化时加载一次图形验证码
});
</script>
