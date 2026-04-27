import http from "@/utils/http";
import type { loginQueryInterface, SmsCodeQueryInterface, UserInfoInterface, CaptchaVo, UpdateNicknameInterface } from "./types";

/**
 * 获取图形验证码
 */
export function getCaptcha() {
  return http.get<CaptchaVo>(`/app/login/captcha`);
}

/**
 * 获取短信验证码
 */
export function getSmsCode(params: SmsCodeQueryInterface) {
  return http.get(`/app/login/getCode`, params);
}

/**
 * 登录
 */
export function login(data: loginQueryInterface) {
  return http.post<string>(`/app/login`, data);
}

/**
 * 获取用户信息
 */
export function getUserInfo() {
  return http.get<UserInfoInterface>(`/app/info`);
}

/**
 * 修改昵称
 */
export function updateNickname(data: UpdateNicknameInterface) {
  return http.post(`/app/user/updateNickname`, data);
}

/**
 * 获取会话列表
 */
export function getConversationList() {
  return http.get(`/app/chat/conversations`);
}

/**
 * 获取与某用户的聊天记录
 * @param userId 对方用户ID
 */
export function getChatHistory(userId: number) {
  return http.get(`/app/chat/conversations/${userId}`);
}

/**
 * 搜索用户
 * @param keyword 搜索关键字（手机号精确匹配，昵称模糊匹配）
 */
export function searchUser(keyword: string) {
  return http.get<Array<{ id: number; nickname: string; phone: string; avatarUrl: string }>>(`/app/user/search?keyword=${encodeURIComponent(keyword)}`);
}

/**
 * 上传头像
 * @param file 文件对象
 */
export function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return http.post(`/app/file/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
}

/**
 * 更新头像URL
 * @param avatarUrl 头像URL
 */
export function updateAvatar(url: string) {
  return http.post(`/app/user/avatar`, { url });
}
