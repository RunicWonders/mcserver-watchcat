<script lang="ts" setup>
import { ref } from 'vue';
import { setLocale, locales } from '../i18n';
import { useTheme } from 'vuetify';

const theme = useTheme();

function switchTheme() {
	theme.global.name.value = theme.global.name.value === 'dark'? 'light': 'dark';
}

function openExternalLink(url: string) {
	window.open(url, '_blank', 'noopener');
}

const props = defineProps({
	refresh: {
		type: Function,
		required: true
	},
	settings: {
		type: Function,
		required: true
	}
});
</script>

<template>
	<v-btn variant="plain" icon="mdi-github" @click="openExternalLink('https://github.com/LateDreamXD/mcserver-watchcat')"></v-btn>
	<v-btn variant="plain" icon="mdi-refresh" @click="props.refresh()"></v-btn>
	<v-btn variant="plain" icon="mdi-cog" @click="props.settings()"></v-btn>
	<v-btn variant="plain" icon="mdi-theme-light-dark" @click="switchTheme"></v-btn>
	<v-btn variant="plain" icon="mdi-translate">
		<v-icon>mdi-translate</v-icon>
		<v-menu bottom activator="parent">
			<v-list>
				<v-list-item v-for="locale in locales" @click="setLocale(locale[0])">
					<v-list-item-title>{{ locale[1] }}</v-list-item-title>
				</v-list-item>
			</v-list>
		</v-menu>
	</v-btn>
</template>