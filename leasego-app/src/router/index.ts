import {
  createRouter,
  createWebHashHistory,
  type RouteLocationNormalized
} from "vue-router";
import routes from "./routes";
import { useCachedViewStoreHook } from "@/store/modules/cachedView";
import NProgress from "@/utils/progress";
import setPageTitle from "@/utils/set-page-title";
import { getToken } from "@/utils/token";

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export interface toRouteType extends RouteLocationNormalized {
  meta: {
    title?: string;
    noCache?: boolean;
  };
}

// 不需要登录即可访问的路由
const whiteList = ["Login"];

router.beforeEach((to: toRouteType, from, next) => {
  NProgress.start();
  // 解决路由缓存导致的 keep-alive 组件不刷新的问题
  if (to.name === "Login") {
    useCachedViewStoreHook().delAllCachedViews();
  }
  // 路由缓存
  useCachedViewStoreHook().addCachedView(to);
  // 页面 title
  setPageTitle(to.meta.title);

  // 检查登录状态
  const token = getToken();
  if (!token && !whiteList.includes(to.name as string)) {
    // 未登录且不在白名单中，跳转登录页
    next({ name: "Login" });
  } else {
    next();
  }
});

router.afterEach(() => {
  NProgress.done();
});

export default router;
