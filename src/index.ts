import {createApp} from 'vue';

import i18n, { loadLocaleMessages } from './i18n';
import vuetify from './vuetify';

import App from './App.vue';
import './index.scss';

createApp(App).use(i18n).use(vuetify).mount('#app');
loadLocaleMessages(navigator.language);