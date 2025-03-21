<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import i18n, { loadLocaleMessages, setLocale, locales } from './i18n';
import { useTheme } from 'vuetify';
import mcqueryOutsideapi from './libs/mcquery-outsideapi';

async function checkSettings() {
	const old_ = JSON.parse(localStorage.getItem('settings') || 'false');
	const new_ = (await import('./libs/defaultConfig')).default;
	if(!old_) return new_;
	for(const key in new_) {
		if(!old_.hasOwnProperty(key)) old_[key] = new_[key];
	}
	return old_;
}

let theme = useTheme();

const showSettings = ref(false);
const isLoaded = ref(false);
const settings = ref({} as any);

const ip = ref('');
const port = ref(25565);
const server = ref({
	icon: '/assets/default.png',
	name: 'A Minecraft Server',
	version: 'unknown (null)',
	players: {
		online: 'unknown',
		max: 'unknown',
		list: []
	}
});

function switchTheme() {
	theme.global.name.value = theme.global.name.value === 'dark'? 'light': 'dark';
}

async function updateServer() {
	try {
		isLoaded.value = false;
		const data = await mcqueryOutsideapi(0, ip.value, port.value, settings.value.useProxyApi);
		server.value = await (await import('./libs/parseServerData')).default(data);
		console.log('[app] Server data updated:', server.value);
		console.log(server.value.players.list)
		isLoaded.value = true;
	} catch(e: any) {
		console.error('[app] Error while updating server data:', e.message);
	}
}

function checkGenuine(username: string, uuid: string) {
	try {
		fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`, { method: 'GET' })
			.then(response => response.json())
			.then(data => {
				console.log('[app] Genuine check:', data.id, uuid.replace(/-/g, ''));
				if(data.id === uuid.replace(/-/g, '')) return true;
			});
	} catch(e: any) {
		console.error('[app] Error while checking genuine:', e.message);
		return null;
	}
}

function saveSettings() {
	localStorage.setItem('settings', JSON.stringify(settings.value));
	location.reload();
}

async function switchLocale(locale: string) {
	if(!i18n.global.availableLocales.includes(locale)) await loadLocaleMessages(locale);
	setLocale(locale);
}

onMounted(async() => {
	settings.value = await checkSettings(); // console.log('[app] Settings:', settings.value);
	await (ip.value = settings.value.defaultServer.ip);
	await (port.value = settings.value.defaultServer.port);
	updateServer();
	if(!import.meta.env.DEV && settings.value.autoRefresh) // 本地dev环境的话会因为hmr而重复刷新
		setInterval(() => {updateServer();}, settings.value.refreshInterval * 1000);
});

</script>


<template>
	<v-sheet
		:elevation="4"
		border
		rounded
		v-theme="theme"
		id="main"
	>
		<span class="d-flex justify-between align-center">
			<h1 class="text-h5">{{ $t('title') }}</h1>
			<span>
				<v-btn variant="plain" icon="mdi-refresh" @click="updateServer"></v-btn>
				<v-btn variant="plain" icon="mdi-cog" @click="showSettings = true"></v-btn>
				<v-btn variant="plain" icon="mdi-theme-light-dark" @click="switchTheme"></v-btn>
				<v-btn variant="plain" icon="mdi-translate">
					<v-icon>mdi-translate</v-icon>
					<v-menu bottom activator="parent">
						<v-list>
							<v-list-item v-for="locale in locales" @click="switchLocale(locale[0])">
								<v-list-item-title>{{ locale[1] }}</v-list-item-title>
							</v-list-item>
						</v-list>
					</v-menu>
				</v-btn>
			</span>
		</span>
		
		<v-expansion-panels class="my-4" variant="inset" :model-value="settings.autoUnfoldServerCfg? 0: null">
			<v-expansion-panel>
				<v-expansion-panel-title class="text-h6">{{ $t('server') }}</v-expansion-panel-title>
				<v-expansion-panel-text>
					<v-row>
						<v-col class="justify-center">
							<br>
							<v-text-field :label="$t('server-ip')" v-model="ip" @change="updateServer"></v-text-field>
							<v-text-field :label="$t('server-port')" v-model="port" @change="updateServer">
								<v-tooltip activator="parent" location="top">{{ $t('server-port', 2) }}</v-tooltip>
							</v-text-field>
						</v-col>
					</v-row>
				</v-expansion-panel-text>
			</v-expansion-panel>
		</v-expansion-panels>

		<v-container>
			<v-card :loading="!isLoaded">
				<span class="card-title d-flex align-center">
					<v-avatar size="64" :image="server.icon"></v-avatar>
					<span>
					<v-card-title>{{ server.name }} <span v-if="server.online_mode">{{ $t('online-server') }}</span></v-card-title>
					<v-card-subtitle :innerHTML="server.version"></v-card-subtitle></span>
				</span>
				<v-card-text :innerHTML="server.motd"></v-card-text>
				<v-card-actions>
					<!-- <v-btn>Click me</v-btn> -->
				</v-card-actions>
			</v-card>
		</v-container>

		<v-container>
			<v-row class="text-h5">{{ $t('players-list', { current: server.players.online, max: server.players.max }) }}</v-row>
			<v-row class="text-h6">{{ $t('refresh-interval', {refresh: settings.refreshInterval}) }}</v-row>
			<v-row>
				<v-card v-for="player in server.players.list" v-if="server.players.list.length > 0" v-show="player.name_clean.match(/fp|bot/)? settings.showFP: true">
					<span class="card-title d-flex align-center">
						<v-avatar size="48" :image="player.uuid.startsWith('00000000')? (settings.bedrockPlayerUseGeyserIcon? '/assets/Geyser_Icon.png': '/assets/Bedrock_Icon.png'): `https://crafatar.com/avatars/${player.uuid.replace(/-/g, '')}?size=64&overlay=true`"></v-avatar>
						<span>
							<v-card-title>{{ player.name_clean }}</v-card-title>
							<v-card-subtitle>
								<span v-if="settings.checkPlayerGenuine? checkGenuine(player.name, player.uuid): false">{{ $t('genuine') }}</span>
								<span v-if="player.uuid.startsWith('00000000')">{{ $t('bedrock-player') }}</span>
							</v-card-subtitle>
						</span>
					</span>
					<v-card-text><code v-if="settings.showPlayerUUID">{{ player.uuid }}</code></v-card-text>
				</v-card>
				<v-alert v-else color="error" class="mt-4" :value="true">
					<v-alert-title>{{ $t('error-msgs', 2) }}</v-alert-title>
				</v-alert>
			</v-row>
		</v-container>

		<v-dialog
			v-model="showSettings"
			max-width="400"
			persistent
		>

			<v-card prepend-icon="mdi-cog" :title="$t('settings')">

				<v-card-text>
					<v-row class="fd-column">
						<span class="text-h5">{{ $t('general') }}</span>
						<v-col>
							<v-switch v-model="settings.autoUnfoldServerCfg" :label="$t('auto-unfold-server-cfg')"></v-switch>
							<v-switch v-model="settings.bedrockPlayerUseGeyserIcon" :label="$t('bedrock-player-use-geyser-icon')"></v-switch>
							<v-switch v-model="settings.showPlayerUUID" :label="$t('show-player-uuid')"></v-switch>
							<v-switch v-model="settings.showFP" :label="$t('show-FP')"></v-switch>
							<v-switch v-model="settings.checkPlayerGenuine" :label="$t('check-player-genuine')" disabled></v-switch>
						</v-col>
						<v-col>
							<v-switch v-model="settings.autoRefresh" :label="$t('auto-refresh')"></v-switch>
							<v-text-field v-model="settings.refreshInterval" :label="$t('refresh-rate')" type="number" min="5" max="60" step="5"></v-text-field>
						</v-col>
						<v-col>
							<v-text-field v-model="settings.defaultServer.ip" :label="$t('default-server-ip')"></v-text-field>
							<v-text-field v-model="settings.defaultServer.port" :label="$t('default-server-port')">
								<v-tooltip activator="parent" location="top">{{ $t('server-port', 2) }}</v-tooltip>
							</v-text-field>
						</v-col>
					</v-row>
					<v-row class="fd-column">
						<span class="text-h5">{{ $t('advanced') }}</span>
						<v-col>
							<v-switch v-model="settings.useProxyApi" :label="$t('use-proxy-api')"></v-switch>
						</v-col>
					</v-row>
				</v-card-text>

				<v-card-actions>
					<v-spacer></v-spacer>

					<v-btn @click="showSettings = false">
						{{ $t('cancel') }}
					</v-btn>
					<v-btn @click="saveSettings()">
						{{ $t('save') }}
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</v-sheet>
</template>