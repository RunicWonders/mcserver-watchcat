export default async(data: any) => {
	data = await data;
	return {
		online: data.online,
		banned: data.eula_blocked,
		name: data.host,
		icon: data.icon,
		motd: data.motd.html,
		version: `${data.version.name_html} (${data.version.protocol})`,
		players: data.players
	}
}