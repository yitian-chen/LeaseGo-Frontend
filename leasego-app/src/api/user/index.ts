import http from "@/utils/http";
import type {
  loginQueryInterface,
  SmsCodeQueryInterface,
  UserInfoInterface,
  CaptchaVo,
  UpdateNicknameInterface
} from "@/api/user/types";
/**
 * @description 登录
 * @param params
 */
export function login(params: loginQueryInterface) {
  return http.post<string>(`/app/login`, params);
}

/**
 * @description 获取短信验证码
 * @param params
 */
export function getSmsCode(params: SmsCodeQueryInterface) {
  return http.get(`/app/login/getCode`, params);
}

/**
 * @description 获取用户信息
 */
export function getUserInfo() {
  return http.get<UserInfoInterface>(`/app/info`);
}

/**
 * @description 获取图形验证码
 */
export function getCaptcha() {
  return http.get<CaptchaVo>(`/app/login/captcha`);
}

/**
 * @description 修改用户昵称
 * @param params
 */
export function updateNickname(params: UpdateNicknameInterface) {
  // 强制将参数放在 URL 查询字符串中
  return http.post(`/app/updateNickname?nickname=${params.nickname}`);
}
