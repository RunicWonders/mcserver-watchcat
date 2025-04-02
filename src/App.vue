<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import mcqueryOutsideapi from './libs/mcquery-outsideapi';
import Menu from './components/Menu.vue';

async function checkSettings() {
	const old_ = JSON.parse(localStorage.getItem('settings') || 'false');
	const new_ = (await import('./libs/defaultConfig')).default;
	if(!old_) return new_;
	for(const key in new_) {
		if(!old_.hasOwnProperty(key)) old_[key] = new_[key];
	}
	return old_;
}

const showSettings = ref(false);
const isLoaded = ref(false);
const isMobile = ref(false);
const settings = ref({} as any);
const msg = ref('loading');
const genuineMap = ref<Record<string, boolean>>({});

const ip = ref('');
const port = ref(25565);
const server = ref({
	icon: '/assets/default.png',
	name: 'Unknown Server',
	motd: 'A Minecraft Server',
	version: '? (unknown protocol)',
	players: {
		online: '?',
		max: '?',
		list: []
	}
});

async function updateServer() {
	try {
		isLoaded.value = false;
		const data = await mcqueryOutsideapi(0, ip.value, port.value, settings.value.useProxyApi);
		if(typeof data === 'string') {
			msg.value = data;
			return;
		}
		server.value = await (await import('./libs/parseServerData')).default(data);
		if(server.value.players.online === 0) {
			msg.value = 'no-players';
		}
		console.log('[app] Server data updated:', server.value);
		isLoaded.value = true;
		settings.value.checkPlayerGenuine && (await checkGenuine());
		console.log('[app] Genuine map:', genuineMap.value);
	} catch(e: any) {
		console.error('[app] Error while updating server data:', e);

		isLoaded.value = true;
	}
}

async function checkGenuine() {
	try {
		for(const player of server.value.players.list) {
			if(player.uuid.startsWith('00000000')) {
				console.log('[app] Skipping genuine check for bedrock player:', player.name_raw);
				continue;
			}
			const res = await fetch(`https://proxy.mengze.vip/proxy/https://api.mojang.com/users/profiles/minecraft/${player.name_raw}`);
			const data = await res.json();
			console.log(data);
			if(data.id === player.uuid.replace(/-/g, ''))
				genuineMap.value[player.name_raw] = true;
			else genuineMap.value[player.name_raw] = false;
			console.log('[app] Genuine check:', player.name_raw, player.uuid, data.id);
		}
	} catch(e: any) {
		console.error('[app] Error while checking genuine:', e);
		return false;
	}
}

function openExternalLink(url: string) {
	window.open(url, '_blank', 'noopener');
}

function openSettings() {
	showSettings.value = true;
}

function saveSettings() {
	localStorage.setItem('settings', JSON.stringify(settings.value));
	location.reload();
}

onMounted(async() => {
	settings.value = await checkSettings();  console.log('[app] Settings:', settings.value);
	await (ip.value = settings.value.defaultServer.ip);
	await (port.value = settings.value.defaultServer.port);
	updateServer();
	if(!import.meta.env.DEV && settings.value.autoRefresh) // 本地dev环境的话会因为hmr而重复刷新
		setInterval(() => {updateServer();}, settings.value.refreshInterval * 1000);
	window.addEventListener('resize', () => {
		isMobile.value = window.innerWidth < 768;
	});
	isMobile.value = window.innerWidth < 768;
});


</script>


<template>
	<v-sheet
		:elevation="4"
		border
		rounded
		id="main"
	>
		<span class="d-flex justify-between align-center">
			<h1 class="text-h5">{{ $t('title') }}</h1>
			<v-btn variant="plain" icon="mdi-dots-vertical" v-if="isMobile">
				<v-icon>mdi-dots-vertical</v-icon>
				<v-menu bottom left activator="parent">
					<v-list><Menu :refresh="updateServer" :settings="openSettings" /></v-list>
				</v-menu>
			</v-btn>
			<span v-else><Menu :refresh="updateServer" :settings="openSettings" /></span>
		</span>
		
		<v-expansion-panels color="info" class="my-4" variant="inset" :model-value="settings.autoUnfoldServerCfg? 0: null">
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
			<v-card id="server-card" :loading="!isLoaded">
				<span class="card-title d-flex align-center">
					<v-avatar size="64" :image="server.icon"></v-avatar>
					<span>
					<v-card-title>{{ server.name }} <span v-if="server.online_mode">{{ $t('online-server') }}</span></v-card-title>
					<v-card-subtitle :innerHTML="server.version"></v-card-subtitle></span>
				</span>
				<v-card-text :innerHTML="server.motd"></v-card-text>
				<v-card-actions>
					<v-btn color="info" @click="openExternalLink(`minecraft://?addExternalServer=${server.name}|${ip}:19132`)">
						{{ $t('add-server') }}
						<v-tooltip bottom activator="parent">{{ $t('add-server', 2) }}</v-tooltip>
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-container>

		<v-container>
			<v-row class="text-h5">{{ $t('players-list', { current: server.players.online, max: server.players.max }) }}</v-row>
			<v-row class="text-h6">{{ $t('refresh-interval', {refresh: settings.refreshInterval}) }}</v-row>
			<v-row id="player-list" align-content="space-around" justify="space-around">
				<v-card :data-name="player" v-for="player in server.players.list" v-if="server.players.list.length > 0" v-show="player.name_clean.match(/fp|bot/)? settings.showFP: true">
					<span class="card-title d-flex align-center">
						<v-avatar size="48" :image="player.uuid.startsWith('00000000')? (settings.bedrockPlayerUseGeyserIcon? '/assets/Geyser_Icon.png': '/assets/Bedrock_Icon.png'): `https://crafatar.com/avatars/${player.uuid.replace(/-/g, '')}?size=64&overlay=true`"></v-avatar>
						<span>
							<v-card-title>{{ player.name_clean }}</v-card-title>
							<v-card-subtitle>
								<span class="online-player" v-if="settings.checkPlayerGenuine" :innerHTML="genuineMap[player.name_raw]? $t('online-player'): ''"></span>
								<span v-if="player.uuid.startsWith('00000000')">{{ $t('bedrock-player') }}</span>
							</v-card-subtitle>
						</span>
					</span>
					<v-card-text><code v-if="settings.showPlayerUUID">{{ player.uuid }}</code></v-card-text>
				</v-card>
				<v-alert v-else-if="!isLoaded && msg === 'loading'" color="info" class="mt-4" :value="true">
					<v-alert-title>
						<v-progress-circular color="blue-lighten-3" indeterminate></v-progress-circular>
						<span style="margin-left: 6px;">{{ $t('loading') }}</span>
					</v-alert-title>
				</v-alert>
				<v-alert v-else color="error" class="mt-4" :value="true">
					<v-alert-title>{{ $t(msg) }}</v-alert-title>
				</v-alert>
			</v-row>
		</v-container>

		<v-dialog
			v-model="showSettings"
			max-width="800"
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
							<v-switch v-model="settings.checkPlayerGenuine" :label="$t('check-player-genuine')"></v-switch>
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

		<p style="text-align: center; margin-top: 6px;">
			Copyright (c) 2025 <a href="https://i.latedream.ggff.net" target="_blank" rel="noopener">LateDream</a>.<br />
			Licensed under the <a href="https://github.com/LateDreamXD/mcserver-watchcat/blob/main/LICENSE" target="_blank" rel="noopener">ZML-2.0</a>.
		</p>
	</v-sheet>
</template>

<style scoped>
.online-player {
	text-shadow: 1px 1px 0 #fff8;
}
</style>