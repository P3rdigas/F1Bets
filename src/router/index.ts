import { createRouter, createWebHistory } from 'vue-router';
import { authPromise } from '../composables/auth.ts';
import { auth } from '../firebase.ts'
import MainView from '../views/MainView.vue';
import HomeView from '../views/HomeView.vue';
import NotFoundView from '../views/NotFoundView.vue';
import LeagueView from '../views/LeagueView.vue';

const routes = [
    { 
        path: '/', 
        name: 'Main', 
        component: MainView 
    },
    { 
        path: '/home', 
        name: 'Home', 
        component: HomeView,
        meta: { requiresAuth: true }
    },
    { 
        path: '/league/:id', 
        name: 'League', 
        component: LeagueView,
        meta: { requiresAuth: true }
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: NotFoundView
  }
]

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach(async (to) => {
  const currentUser = auth.currentUser ?? await authPromise;

  if (to.meta.requiresAuth && !currentUser) {
    return { name: 'Main' };
  }
});

export default router;