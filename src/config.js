const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const merge = require('lodash.merge');

const filename = 'lirc-mqtt.yaml';

const defaults = {
    homie: {
        device_name: "LIRC",
        device_id: "lirc",
        command_prop: {
            datatype: "enum",
            retain: false
        }
    },
    mqtt: {
        host: 'localhost',
        port: 1883,
        base_topic: 'devices/',
        auth: false
    },
    lirc: {},
    logger: {
        level: 'info'
    },
    remotes: {}
};

let settings;

function getSettings() {
    if (!settings) {
        settings = merge({}, defaults, load());
    }

    return settings;
}

function load() {
    const configPath = getConfigPath();

    if (!fs.existsSync(configPath)) {
        throw new Error(`Config file not found at path: ${configPath}`);
    }

    const configFile = fs.readFileSync(configPath, 'utf8');

    return yaml.safeLoad(configFile);
}

function getConfigPath() {
    let configPath = null;
    
    if (process.env.LIRC_MQTT_CONFIG) {
        configPath = process.env.LIRC_MQTT_CONFIG;
    } else {
        configPath = path.join(__dirname, '..', 'config');
        configPath = path.normalize(configPath);
    }

    return path.join(configPath, filename);
}

module.exports = {
    get: getSettings
};