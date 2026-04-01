// 登录
// 登录
export interface loginQueryInterface {
  // 手机号码
  phone: string;
  // 短信验证码 (短信登录时必填)
  code?: string;
  // 密码 (密码登录时必填)
  password?: string;
  // 图形验证码的值 (必传)
  captchaCode?: string;
  // 图形验证码的标识 key (必传)
  captchaKey?: string;
  // 登录策略: 1-短信登录, 2-密码登录 (新增)
  strategy: number;
}
// 获取短信验证码
export interface SmsCodeQueryInterface {
  // 手机号码
  phone: string;
}

// 用户信息
export interface UserInfoInterface {
  // 头像
  avatarUrl: string;
  // 用户名
  nickname: string;
}
// 用户state
export interface UserStateInterface {
  // 用户信息
  userInfo: UserInfoInterface | null;
  // token
  token: string | null;
}

export interface CaptchaVo {
  image: string;
  key: string;
}
