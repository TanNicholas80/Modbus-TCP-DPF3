const modbusConfig = {
    baudRate: 9600,
    parity: 'none',
    stopBits: 2,
    dataBits: 8,
    timeout: 3000,
};

const gateways = [
    {
        id: "GATEWAY_SECTION_1",
        ip: "192.168.111.213", // Ganti dengan IP USR-W610 Bagian 1
        port: 8899,
        description: "Area Produksi Banana 5-8"
    },
    {
        id: "GATEWAY_SECTION_2",
        ip: "192.168.111.214", // Ganti dengan IP USR-W610 Bagian 2
        port: 8899,
        description: "Area Produksi Thies 1-4"
    },
    {
        id: "GATEWAY_SECTION_3",
        ip: "192.168.111.215", // Ganti dengan IP USR-W610 Bagian 3
        port: 8899,
        description: "Area Produksi Tecco & Fong"
    },
    {
        id: "GATEWAY_SECTION_4",
        ip: "192.168.111.212", // Ganti dengan IP USR-W610 Bagian 4
        port: 8899,
        description: "Area Produksi Tecco 9,10,13,14"
    }
];

const machineMapping = [
    // --- BAGIAN 1 (GATEWAY 1) Banana 5-8 ---
    { 
        apiMachineId: 5,         // ID untuk parameter API POST
        slaveId: 5,              // ID Modbus di PLC
        gatewayId: "GATEWAY_SECTION_1",
        addressStatus: 200,       // Alamat register status di PLC (Read: Status ON/OFF)
        addressAlarm: 100,        // Alamat write Alarm (Write: 0/1)
        addressCompleteOrMaint: 103, // Alamat write Barcode Lengkap / Maint Manual End (Write: 0/1)
        addressPinjamMesin: 105   // Alamat write Status Pinjam Mesin (Write: 0/1)
    },
    { 
        apiMachineId: 6, 
        slaveId: 6, 
        gatewayId: "GATEWAY_SECTION_1", 
        addressStatus: 200,
        addressAlarm: 100,
        addressCompleteOrMaint: 103,
        addressPinjamMesin: 105
    },
    { 
        apiMachineId: 7, 
        slaveId: 7, 
        gatewayId: "GATEWAY_SECTION_1", 
        addressStatus: 200,
        addressAlarm: 100,
        addressCompleteOrMaint: 103,
        addressPinjamMesin: 105
    },
    { 
        apiMachineId: 8, 
        slaveId: 8, 
        gatewayId: "GATEWAY_SECTION_1", 
        addressStatus: 200,
        addressAlarm: 100,
        addressCompleteOrMaint: 103,
        addressPinjamMesin: 105
    },

    // --- BAGIAN 2 (GATEWAY 2) ---
    { 
        apiMachineId: 1, 
        slaveId: 1, 
        gatewayId: "GATEWAY_SECTION_2", 
        addressStatus: 200,
        addressAlarm: 100,
        addressCompleteOrMaint: 103,
        addressPinjamMesin: 105
    },
    { 
        apiMachineId: 2, 
        slaveId: 2, 
        gatewayId: "GATEWAY_SECTION_2", 
        addressStatus: 200,
        addressAlarm: 100,
        addressCompleteOrMaint: 103,
        addressPinjamMesin: 105
    },
    { 
        apiMachineId: 3, 
        slaveId: 3, 
        gatewayId: "GATEWAY_SECTION_2", 
        addressStatus: 200,
        addressAlarm: 100,
        addressCompleteOrMaint: 103,
        addressPinjamMesin: 105
    },
    { 
        apiMachineId: 4, 
        slaveId: 4, 
        gatewayId: "GATEWAY_SECTION_2", 
        addressStatus: 200,
        addressAlarm: 100,
        addressCompleteOrMaint: 103,
        addressPinjamMesin: 105
    },

    // --- BAGIAN 3 (GATEWAY 3) ---
    { 
        apiMachineId: 9, 
        slaveId: 11, 
        gatewayId: "GATEWAY_SECTION_3", 
        addressStatus: 200,
        addressAlarm: 100,
        addressCompleteOrMaint: 103,
        addressPinjamMesin: 105
    },
    { 
        apiMachineId: 10, 
        slaveId: 12, 
        gatewayId: "GATEWAY_SECTION_3", 
        addressStatus: 200,
        addressAlarm: 100,
        addressCompleteOrMaint: 103,
        addressPinjamMesin: 105
    },

    // --- BAGIAN 4 (GATEWAY 4) Tecco 9, 10, 13, 14 ---
    { 
        apiMachineId: 13, 
        slaveId: 9, 
        gatewayId: "GATEWAY_SECTION_4", 
        addressStatus: 200,
        addressAlarm: 100,
        addressCompleteOrMaint: 103,
        addressPinjamMesin: 105
    },
    { 
        apiMachineId: 14, 
        slaveId: 10, 
        gatewayId: "GATEWAY_SECTION_4", 
        addressStatus: 200,
        addressAlarm: 100,
        addressCompleteOrMaint: 103,
        addressPinjamMesin: 105
    },
    { 
        apiMachineId: 11, 
        slaveId: 13, 
        gatewayId: "GATEWAY_SECTION_4", 
        addressStatus: 200,
        addressAlarm: 100,
        addressCompleteOrMaint: 103,
        addressPinjamMesin: 105
    },
    { 
        apiMachineId: 12, 
        slaveId: 14, 
        gatewayId: "GATEWAY_SECTION_4", 
        addressStatus: 200,
        addressAlarm: 100,
        addressCompleteOrMaint: 103,
        addressPinjamMesin: 105
    },
];

// Base URL API IoT
// TIPS: Jika ingin bypass Cloudflare untuk menghindari timeout 522 pada Modbus,
// gunakan subdomain DNS-Only (Grey Cloud) atau IP VPS, misal: "http://iot.dpf3dunia.com/api/iot"
const apiBase = process.env.LARAVEL_API_URL || "http://iot.dpf3dunia.com/api/iot";
const apiBaseUrl = `${apiBase}/mesin`;
const apiSignalsUrl = `${apiBase}/signals`;

module.exports = {
    modbusConfig,
    gateways,
    machineMapping,
    apiBaseUrl,
    apiSignalsUrl
};
