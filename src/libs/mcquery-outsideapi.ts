export default async(api: number, host: string, port?: number, useProxy: boolean = false, retry: boolean = false) => {
	const apis = [
		// 'https://api.serendipityr.cn/mcapi/?host=%host%&port=%port%&ping=true',
		// 'https://api.miri.site/mcPlayer/get.php?ip=%host%&port=%port%',
		"https://api.mcstatus.io/v2/status/java/%host%:%port%",
		'https://api.mcsrvstat.us/3/%host%:%port%',
	];

	const proxyUrl = 'https://proxy.mengze.vip/proxy/'; // thanks mengze!

	async function fetchData(url: string) {
		const res = await fetch(url);
		const data = await res.json();
		return data;
	}

	function generateUrl() {
		let url = apis[api].replace('%host%', host);
		url = (!!port? url.replace('%port%', port.toString()): url.replace(':%port%', ''));
		useProxy && (url = proxyUrl + url);
		return url;
	}

	try {
		const url = generateUrl();
		return await fetchData(url);
	} catch (e: any) {
		console.error('[query-outsideapi]', e);
		if(retry) {
			api++;
			if(api > apis.length - 1) {
				console.error('[query-outsideapi] All APIs failed');
				return;
			}
			const url = generateUrl();
			return await fetchData(url);
		}
	}
}