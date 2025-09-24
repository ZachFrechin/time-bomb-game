import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import RoomView from '@/views/RoomView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/room/:roomId',
      name: 'room',
      component: RoomView,
      props: true
    },
    {
      path: '/join/:roomId',
      redirect: to => {
        return { name: 'home', query: { join: to.params.roomId } }
      }
    }
  ]
})

export default router