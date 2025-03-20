export default async(data: any) => {
	data = await data; // convert to promise if not already
	let version = (data.version || data.version.name) || 'unknown';
	version += ` (${(data.protocol.version || data.version.protocol) || null})`;
	return {
		online: true,
		online_mode: data.eula_blocked || false,
		icon: (data.favicon || data.icon) || '/assets/default.png',
		name: (data.host || data.hostname) || 'A Minecraft Server',
		motd: decodeURIComponent(data.motd.html),
		version,
		players: data.players || {
			online: data.online || 'unknown',
			max: data.max || 'unknown',
			sample: data.sample || []
		}
	}
}