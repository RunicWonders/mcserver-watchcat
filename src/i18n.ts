import { nextTick } from 'vue';
import {createI18n} from 'vue-i18n';

const i18n = createI18n({
	locale: navigator.language || 'en-US',
	fallbackLocale: 'en-US',
	messages: {},
	legacy: false,
});

export async function loadLocaleMessages(locale: string) {
	const messages = await (await fetch(`/locales/${locale}.json`)).json();
	i18n.global.setLocaleMessage(locale, messages);
	return nextTick();
}

export function setLocale(locale: string) {
	if(i18n.global.locale.value === locale) return;
	i18n.global.locale.value = locale;
}

export const locales = [
	['en-US', 'English'],
	['zh-CN', '简体中文'],
	['zh-TW', '正體中文'],
]

export default i18n;