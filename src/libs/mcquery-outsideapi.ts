export default async(host: string, port: number, api: number, retry: boolean = false) => {
	const apis = [
		// 'https://api.serendipityr.cn/mcapi/?host=%host%&port=%port%&ping=true',
		// 'https://api.miri.site/mcPlayer/get.php?ip=%host%&port=%port%',
		'https://api.mcsrvstat.us/3/%host%:%port%',
	];

	async function fetchData(url: string) {
		const res = await fetch(url);
		const data = await res.json();
		return data;
	}

	try {
		const url = apis[api].replace('%host%', host).replace('%port%', port.toString());
		return await fetchData(url);
	} catch (e: any) {
		console.error('[query-outsideapi]', e);
		if(retry) {
			api++;
			if(api > apis.length - 1) throw new Error('All APIs failed');
			const url = apis[api].replace('%host%', host).replace('%port%', port.toString());
			return await fetchData(url);
		}
	}
}