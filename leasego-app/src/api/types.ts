// 登录
export interface loginQueryInterface {
  // 手机号码
  phone: string;
  // 短信验证码 (现在是可选的)
  code?: string;
  // 密码 (新增)
  password?: string;
  // 图形验证码的值 (新增)
  captchaCode?: string;
  // 图形验证码的标识 key (新增)
  captchaKey?: string;
}

// 获取短信验证码
export interface SmsCodeQueryInterface {
  // 手机号码
  phone: string;
}

// 新增：图形验证码返回的数据结构
export interface CaptchaVo {
  image: string; // base64图片字符串
  key: string; // 验证码标识
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
