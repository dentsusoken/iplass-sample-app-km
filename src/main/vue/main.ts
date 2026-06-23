/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { createRouter } from './router'
import { i18n } from './i18n'
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles/main.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

const router = createRouter()
app.use(router)

app.use(i18n)

app.mount('#app')
