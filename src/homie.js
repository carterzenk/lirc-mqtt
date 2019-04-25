const logger = require('./logger');
const HomieDevice = require('homie-device');
const config = require('./config');
const { EventEmitter } = require('events');

const COMMAND_PROP = 'command';
const AVAILABLE_COMMANDS_PROP = 'availableCommands';

class Homie extends EventEmitter {
    constructor() {
        super();

        this.settings = config.get().homie;

        this.device = new HomieDevice({
            name: this.settings.device_name,
            device_id: this.settings.device_id,
            mqtt: config.get().mqtt
        });

        this.publishAvailableCommands = this.publishAvailableCommands.bind(this);
        this.onConnect = this.onConnect.bind(this);

        this.device.on('disconnect', this.onDisconnect);
        this.device.on('connect', this.onConnect);
    }

    get connected() {
        return this.device.isConnected;
    }

    connect() {
        return new Promise((resolve) => {
            logger.debug('Connecting to MQTT broker...');
            this.device.once('connect', resolve);
            this.device.setup(true);
            this.device.mqttClient.on('error', this.onError);
        });
    }

    disconnect() {
        return new Promise((resolve) => {
            this.device.once('disconnect', resolve);
            this.device.end();
        });
    }

    addRemote(id, friendlyName, commands) {
        logger.info('Adding remote to device.', {
            id: id,
            friendlyName: friendlyName
        });

        const node = this.device.node(id, friendlyName, 'remote');

        const commandProp = node
            .advertise(COMMAND_PROP)
            .setName("Command")
            .setRetained(this.settings.command_prop.retain)
            .setDatatype(this.settings.command_prop.datatype)
            .settable((range, value) => {
                this.onCommandReceived(id, value);
            });
        
        // Set available commands as format if using enum datatype.
        if (this.settings.command_prop.datatype === 'enum') {
            commandProp.setFormat(commands.join(','));
        } else {
            // Otherwise, publish as separate property.
            node
                .advertise(AVAILABLE_COMMANDS_PROP)
                .setName("Available Commands")
                .setRetained(true)
                .setDatatype('string');

            this.device.on('connect', () => {
                this.publishAvailableCommands(id, commands);
            });
        }
    }

    publishCommand(mqttId, command) {
        const node = this.device.nodes[mqttId];

        if (node) {
            node.setProperty(COMMAND_PROP).send(command);
        } else {
            logger.warn("Node not found.", { node: mqttId });
        }
    }

    publishAvailableCommands(mqttId, commands) {
        const node = this.device.nodes[mqttId];

        if (node) {
            node.setProperty(AVAILABLE_COMMANDS_PROP).send(commands.join(','));
        } else {
            logger.warn("Node not found.", { node: mqttId });
        }
    }

    onCommandReceived(mqttId, command) {
        logger.debug("Received command from MQTT.", {
            id: mqttId,
            command: command
        });

        this.publishCommand(mqttId, command);
        this.emit('received', mqttId, command);
    }

    onConnect() {
        logger.info("Connected to MQTT broker.");
    }

    onDisconnect() {
        logger.info("Closed MQTT broker connection.");
    }

    onError(err) {
        logger.error("Encountered MQTT error.", { error: err });
    }
}

module.exports = Homie;