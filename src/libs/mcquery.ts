import net from 'net';
import dns from 'dns/promises';

// 定义服务器信息类型
interface ServerInfo {
    version: string;
    protocol: number;
    motd: string;
    players: {
        online: number;
        max: number;
        list: string[];
    };
    latency: number;
    host: string;
    port: number;
}

// VarInt 编解码函数
const varInt = {
    encode(value: number): Buffer {
        const buffer = Buffer.alloc(4);
        let offset = 0;
        while (value > 0x7F) {
            buffer.writeUInt8(value & 0x7F | 0x80, offset++);
            value >>>= 7;
        }
        buffer.writeUInt8(value, offset++);
        return buffer.subarray(0, offset);
    },

    decode(buffer: Buffer): { value: number; bytes: number } {
        let value = 0;
        let bytes = 0;
        let byte;
        do {
            byte = buffer[bytes];
            value |= (byte & 0x7F) << (7 * bytes);
            bytes++;
        } while (byte & 0x80);
        return { value, bytes };
    }
};

// 清理 MOTD 格式代码
const cleanMotd = (motd: string): string => {
    return motd.replace(/§[0-9a-fk-or]/g, '').replace(/\n/g, ' ');
};

// 主查询函数
async function queryMinecraftServer(host: string, port = 25565, timeout = 5000): Promise<ServerInfo> {
    // 解析 DNS SRV 记录
    try {
        const srv = await dns.resolveSrv(`_minecraft._tcp.${host}`);
        if (srv.length > 0) {
            host = srv[0].name;
            port = srv[0].port;
        }
    } catch {}

    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const socket = net.createConnection({ host, port, timeout }, () => {
            // 构建握手包
            const handshake = Buffer.concat([
                Buffer.from([0x00]), // 包ID
                varInt.encode(-1),   // 协议版本
                varInt.encode(host.length),
                Buffer.from(host),
                Buffer.from(Uint16Array.from([port]).buffer),
                Buffer.from([0x01])  // 请求状态
            ]);

            // 构建请求包
            const request = Buffer.from([0x01, 0x00]); // 状态请求

            // 发送数据包
            const handshakePacket = Buffer.concat([varInt.encode(handshake.length), handshake]);
            const requestPacket = Buffer.concat([varInt.encode(request.length), request]);
            socket.write(Buffer.concat([handshakePacket, requestPacket]));
        });

        let buffer = Buffer.alloc(0);
        let jsonData: string | null = null;

        socket.on('data', (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);
            try {
                const length = varInt.decode(buffer);
                const { value: packetId, bytes: idBytes } = varInt.decode(buffer.subarray(length.bytes));
                
                if (packetId === 0x00) { // 响应包
                    const { value: strLength } = varInt.decode(buffer.subarray(length.bytes + idBytes));
                    const start = length.bytes + idBytes + varInt.decode(buffer.subarray(length.bytes + idBytes)).bytes;
                    jsonData = buffer.subarray(start, start + strLength).toString('utf8');
                }
            } catch {}
        });

        socket.on('end', () => {
            const latency = Date.now() - startTime;
            if (!jsonData) return reject(new Error('No response from server'));
            
            try {
                const data = JSON.parse(jsonData);
                resolve({
                    host,
                    port,
                    version: data.version.name,
                    protocol: data.version.protocol,
                    motd: cleanMotd(data.description.text || data.description),
                    players: {
                        online: data.players.online,
                        max: data.players.max,
                        list: data.players.sample?.map((p: any) => p.name) || []
                    },
                    latency
                });
            } catch (e) {
                reject(new Error('Invalid server response'));
            }
        });

        socket.on('error', reject);
        socket.on('timeout', () => reject(new Error('Connection timeout')));
    });
}

// 使用示例
async function main() {
    try {
        const serverInfo = await queryMinecraftServer('mc.hypixel.net');
        console.log('服务器信息:');
        console.log(`地址: ${serverInfo.host}:${serverInfo.port}`);
        console.log(`版本: ${serverInfo.version} (协议 ${serverInfo.protocol})`);
        console.log(`MOTD: ${serverInfo.motd}`);
        console.log(`延迟: ${serverInfo.latency}ms`);
        console.log(`玩家: ${serverInfo.players.online}/${serverInfo.players.max}`);
        console.log('在线玩家:', serverInfo.players.list.length > 0 ? 
            serverInfo.players.list.join(', ') : '不可用');
    } catch (error: any) {
        console.error('查询失败:', error.message);
    }
}

main();
