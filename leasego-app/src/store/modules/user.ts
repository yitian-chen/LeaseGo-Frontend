import { defineStore } from "pinia";
import type {
  loginQueryInterface,
  UpdateNicknameInterface,
  UserInfoInterface,
  UserStateInterface
} from "@/api/user/types";
import { getUserInfo, login, updateNickname } from "@/api/user";
import { removeToken, setToken } from "@/utils/token";
import { showSuccessToast } from "vant";

export const useUserStore = defineStore({
  id: "app-user",
  state: (): UserStateInterface => ({
    token: null,
    userInfo: null
  }),
  actions: {
    // setToken
    setToken(token: string) {
      this.token = token;
    },
    // login
    async LoginAction(params: loginQueryInterface) {
      const { data } = await login(params);
      setToken(data);
      await this.GetInfoAction();
    },
    // setUserInfo
    setUserInfo(userInfo: UserInfoInterface) {
      this.userInfo = userInfo;
    },
    async GetInfoAction() {
      const { data } = await getUserInfo();
      // 存储用户信息
      this.setUserInfo(data);
    },
    async Logout() {
      // await logout()
      this.resetUserStore();
      removeToken();
    },
    resetUserStore() {
      this.token = null;
      this.userInfo = null;
    },
    async UpdateNicknameAction(params: UpdateNicknameInterface) {
      await updateNickname(params);

      // 关键改动：不再执行 await this.GetInfoAction();
      // 而是直接强制退出登录
      await this.Logout();

      // 注意：由于 Store 内部拿不到 router 实例（除非你单独引入），
      // 建议在 view 视图层处理跳转，或者在此处使用 window.location 强制刷新
      showSuccessToast("修改成功，请重新登录");
      setTimeout(() => {
        window.location.href = "/login"; // 或者使用你的路由跳转逻辑
      }, 1000);
    }
  },
  // 设置为true，缓存state
  persist: true
});
