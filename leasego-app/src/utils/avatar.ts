// 获取头像完整URL
export const getAvatarUrl = (avatarUrl: string | undefined | null): string => {
  if (!avatarUrl) return "";

  // 如果已经是完整URL，直接返回
  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    return avatarUrl;
  }

  // 相对路径，补全API服务器地址
  const baseUrl = import.meta.env.VITE_APP_BASE_URL;
  return avatarUrl.startsWith("/") ? `${baseUrl}${avatarUrl}` : `${baseUrl}/${avatarUrl}`;
};
