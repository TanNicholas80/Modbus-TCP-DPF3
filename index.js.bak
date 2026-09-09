const ModbusRTU = require("modbus-serial");
const axios = require("axios");
const http = require("http");
const https = require("https");
const { modbusConfig, gateways, machineMapping, apiBaseUrl } = require("./config");

// Buat instance Axios khusus dengan Keep-Alive aktif
const api = axios.create({
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true }),
});

const machineState = {};
const TOKEN = "7b89d4e1f2a0c3b5";

// Helper untuk jeda waktu
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ==========================================
// SYSTEM ANTREAN GLOBAL (API POST QUEUE)
// ==========================================
const apiQueue = [];
let isProcessingQueue = false;

async function processApiQueue() {
    if (isProcessingQueue) return;
    isProcessingQueue = true;

    while (apiQueue.length > 0) {
        const job = apiQueue.shift();
        const url = `${apiBaseUrl}/${job.machine.apiMachineId}/state`;
        
        try {
            await api.post(url, {
                is_on: job.status === 1,
                source: "plc_industrial"
            }, { 
                headers: { 'X-DEVICE-TOKEN': TOKEN },
                timeout: 5000 // Batasi timeout API agar tidak menggantung terlalu lama
            });
            console.log(`[API STATE SUCCESS] Machine ${job.machine.apiMachineId} -> ${job.status === 1 ? 'ON' : 'OFF'}`);
        } catch (e) {
            console.error(`[API STATE ERR] Machine ${job.machine.apiMachineId}: ${e.message}`);
        }
        
        // Jeda tipis antar hit API agar tidak membebani server/network traffic
        await sleep(100); 
    }

    isProcessingQueue = false;
}

function queueMachineState(machine, status) {
    const existingJobIndex = apiQueue.findIndex(job => job.machine.apiMachineId === machine.apiMachineId);
    
    if (existingJobIndex !== -1) {
        apiQueue[existingJobIndex].status = status;
    } else {
        apiQueue.push({ machine, status });
    }
    
    if (apiQueue.length > 100) {
        apiQueue.shift(); 
    }

    processApiQueue();
}

// ==========================================
// SINKRONISASI GET STATUS SINYAL (100, 103, 105)
// ==========================================
async function syncAlarmStatus(machine, retries = 1) {
    const url = `${apiBaseUrl}/${machine.apiMachineId}/alarm`;
    try {
        const response = await api.get(url, {
            headers: { 'X-DEVICE-TOKEN': TOKEN },
            timeout: 8000 
        });
        const data = response.data || {};
        
        // Address 100: Alarm ON/OFF (1 / 0)
        const alarmOn = data.alarm_on ?? (data.address_100 === 1);
        
        // Address 103: Maintenance Selesai Manual ATAU Seluruh Barcode Lengkap (1 / 0)
        const signal103 = (data.address_103 === 1) || (data.signals && data.signals['103'] === 1) || (data.signal_103 === 1);
        
        // Address 105: Status / Flag Pinjam Mesin (1 / 0)
        const signal105 = (data.address_105 === 1) || (data.signals && data.signals['105'] === 1) || (data.signal_105 === 1);

        if (machineState[machine.apiMachineId]) {
            machineState[machine.apiMachineId].targetAlarm = alarmOn ? 1 : 0;
            machineState[machine.apiMachineId].target103 = signal103 ? 1 : 0;
            machineState[machine.apiMachineId].target105 = signal105 ? 1 : 0;
        }
    } catch (e) {
        if (retries > 0 && (e.code === 'ECONNABORTED' || e.message.includes('timeout'))) {
            console.log(`[API RETRY] Machine ${machine.apiMachineId} retrying...`);
            await sleep(1000);
            return syncAlarmStatus(machine, retries - 1);
        }
        
        console.error(`[API SIGNALS ERR] Machine ${machine.apiMachineId}: ${e.message}`);
    }
}

// ==========================================
// WORKER GATEWAY
// ==========================================
async function gatewayWorker(gateway) {
    let client = null;
    let consecutiveTimeouts = 0;
    
    // Inisialisasi state awal untuk mesin di gateway ini
    const machines = machineMapping.filter(m => m.gatewayId === gateway.id);
    machines.forEach(m => {
        if (!machineState[m.apiMachineId]) {
            machineState[m.apiMachineId] = { 
                lastStatus: -1, 
                lastSync: 0, 
                lastWrittenAlarm: -1, 
                targetAlarm: 0,
                lastWritten103: -1,
                target103: 0,
                lastWritten105: -1,
                target105: 0
            };
        }
    });

    // Loop Sinkronisasi Alarm & Sinyal (100, 103, 105)
    async function startSignalSyncLoop() {
        try {
            for (const m of machines) {
                await syncAlarmStatus(m);
                await sleep(300); // Jeda antar hit GET API per mesin
            }
        } catch (err) {
            console.error(`[SIGNAL LOOP ERR] ${gateway.id}: ${err.message}`);
        } finally {
            // Jalankan kembali loop setelah 5 detik
            setTimeout(startSignalSyncLoop, 5000);
        }
    }
    
    // Jalankan siklus sinkronisasi sinyal pertama kali
    startSignalSyncLoop();

    // Loop Utama Polling Modbus TCP ke RS485 Gateway
    while (true) {
        try {
            // 1. PENANGANAN KONEKSI TCP
            if (!client || !client.isOpen) {
                console.log(`[ATTEMPT CONNECT] ${gateway.id} (${gateway.ip})`);
                
                if (client) {
                    try { client.close(() => {}); } catch (e) {}
                }

                client = new ModbusRTU();
                await client.connectTCP(gateway.ip, { port: gateway.port });
                client.setTimeout(modbusConfig.timeout || 3000);
                console.log(`[CONNECTED] Gateway ${gateway.id}`);

                consecutiveTimeouts = 0;
            }

            // 2. SEQUENTIAL POLLING MODBUS SLAVE
            for (const machine of machines) {
                try {
                    if (!client.isOpen) throw new Error("Koneksi terputus sebelum membaca data");

                    await client.setID(machine.slaveId);

                    // --- 1. BACA STATUS MESIN PLC (Address 200) ---
                    const reg = await client.readHoldingRegisters(machine.addressStatus, 1);
                    const currentStatus = reg.data[0];
                    const state = machineState[machine.apiMachineId];

                    if (currentStatus !== state.lastStatus || (Date.now() - state.lastSync > 60000)) {
                        queueMachineState(machine, currentStatus); 
                        state.lastStatus = currentStatus;
                        state.lastSync = Date.now();
                    }

                    // --- 2. TULIS STATUS ALARM (Address 100) ---
                    const addrAlarm = machine.addressAlarm || 100;
                    if (state.targetAlarm !== state.lastWrittenAlarm) {
                        await sleep(50);
                        if (!client.isOpen) throw new Error("Koneksi terputus sebelum menulis data");
                        
                        await client.writeRegister(addrAlarm, state.targetAlarm);
                        state.lastWrittenAlarm = state.targetAlarm;
                        console.log(`[PLC WRITE SUCCESS] Machine ${machine.apiMachineId} Alarm (Addr ${addrAlarm}) -> ${state.targetAlarm}`);
                    }

                    // --- 3. TULIS BARCODE LENGKAP / MAINTENANCE MANUAL END (Address 103) ---
                    const addr103 = machine.addressCompleteOrMaint || 103;
                    if (state.target103 !== state.lastWritten103) {
                        await sleep(50);
                        if (!client.isOpen) throw new Error("Koneksi terputus sebelum menulis data");
                        
                        await client.writeRegister(addr103, state.target103);
                        state.lastWritten103 = state.target103;
                        console.log(`[PLC WRITE SUCCESS] Machine ${machine.apiMachineId} Barcode Complete/Maint End (Addr ${addr103}) -> ${state.target103}`);
                    }

                    // --- 4. TULIS STATUS PINJAM MESIN (Address 105) ---
                    const addr105 = machine.addressPinjamMesin || 105;
                    if (state.target105 !== state.lastWritten105) {
                        await sleep(50);
                        if (!client.isOpen) throw new Error("Koneksi terputus sebelum menulis data");
                        
                        await client.writeRegister(addr105, state.target105);
                        state.lastWritten105 = state.target105;
                        console.log(`[PLC WRITE SUCCESS] Machine ${machine.apiMachineId} Pinjam Mesin (Addr ${addr105}) -> ${state.target105}`);
                    }

                    // Jeda wajib antar Slave ID agar fisik converter RS485 tidak crash/tabrakan data
                    await sleep(300);
                    
                    consecutiveTimeouts = 0;

                } catch (err) {
                    console.error(`[MODBUS DEV ERR] Gateway: ${gateway.id}, Machine: ${machine.apiMachineId}: ${err.message}`);

                    if (err.message.includes("Timed out")) {
                        consecutiveTimeouts++;
                        if (consecutiveTimeouts >= 3) {
                            console.log(`[STALE SOCKET DETECTED] Gateway ${gateway.id} nyangkut. Memaksa reconnect TCP...`);
                            consecutiveTimeouts = 0;
                            throw new Error("Force Reconnect TCP Buffer Desync");
                        }
                    }
                    
                    if (
                        err.message.includes("Port Not Open") || 
                        err.message.includes("ECONNRESET") || 
                        err.message.includes("ETIMEDOUT") ||
                        err.message.includes("closed")
                    ) {
                        throw err; 
                    }
                }
            }

            // Jeda antar-siklus pembacaan seluruh mesin pada gateway ini
            await sleep(1000);

        } catch (globalErr) {
            console.error(`[GATEWAY GLOBAL ERR] ${gateway.id}: ${globalErr.message}. Reconnecting in 10s...`);
            
            if (client) {
                try { client.close(() => {}); } catch(c) {}
            }
            
            await sleep(10000);
        }
    }
}

// Jalankan seluruh worker gateway secara paralel
gateways.forEach(gw => gatewayWorker(gw));
