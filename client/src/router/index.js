import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)


let routes =  [
	{
	  path: '/call',
	  name: 'call',
	  component: () => import("@/views/call"),
	}
]


const router = new Router({
  mode: 'history', // 去掉url中的#
  scrollBehavior: () => ({ y: 0 }),
  routes: routes
  
})


export default router
