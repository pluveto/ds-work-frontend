/**
 * 基础路由
 * @type { *[] }
 */
export const constantRouterMap = [
  {
    path: '/',
    component: () => import('@/views/layouts/index'),
    redirect: '/home',
    meta: {
      title: '首页',
      keepAlive: false
    },
    children: [
      {
        path: '/home',
        name: 'Home',
        component: () => import('@/views/home/index'),
        meta: { title: '首页', keepAlive: false }
      },
      {
        path: '/editor',
        name: 'Editor',
        component: () => import('@/views/home/editor'),
        meta: { title: '地图编辑', keepAlive: true }
      },      {
        path: '/geditor',
        name: 'GEditor',
        component: () => import('@/views/home/geditor'),
        meta: { title: '地图编辑', keepAlive: true }
      },
      {
        path: '/about',
        name: 'About',
        component: () => import('@/views/home/about'),
        meta: { title: '关于我', keepAlive: false }
      }
    ]
  }
]