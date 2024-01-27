import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)


let routes =  [
	{
	  path: '/demo1',
	  name: 'demo1',
	  component: () => import("@/views/demo1"),
	}
]


const router = new Router({
  mode: 'history', // 去掉url中的#
  scrollBehavior: () => ({ y: 0 }),
  routes: routes
  
})


export default router
