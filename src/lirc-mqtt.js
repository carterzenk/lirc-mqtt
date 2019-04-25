const Homie = require('./homie');
const Lirc = require('./lirc');
const Remotes = require('./remotes');
const logger = require('./logger');

class LircMqtt {
    constructor() {
        this.onLircMessage = this.onLircMessage.bind(this);
        this.onMqttMessage = this.onMqttMessage.bind(this);

        this.homie = new Homie();
        this.lirc = new Lirc();
        this.remotes = new Remotes();

        this.homie.on('received', this.onMqttMessage);
        this.lirc.on('received', this.onLircMessage);
    }

    async start() {
        logger.info("Starting lirc-mqtt...");

        try {
            // Make connection to LIRC.
            await this.lirc.connect();

            // Register remotes from LIRC with homie.
            await this.addRemotes();
            
            // Connect to MQTT and announce.
            await this.homie.connect();
        } catch (err) {
            logger.error("Encountered an error while starting.", err);
        };
    }

    async addRemotes() {
        let remotes = await this.lirc.list('');

        logger.debug("Found remotes from LIRC.", { remotes: remotes });
        
        let remoteName;
        let commands;

        for (let i = 0; i < remotes.length; i++) {
            remoteName = remotes[i];

            commands = await this.lirc.list(remoteName);
            commands = commands.map(command => command.split(' ')[1]);

            this.remotes.addRemote(remoteName, commands);
        }

        this.remotes.remotes.forEach((remote) => {
            this.homie.addRemote(
                remote.mqttId,
                remote.friendlyName,
                remote.commands
            );
        });
    }

    async stop() {
        logger.info("Stopping lirc-mqtt...");

        try {
            await this.homie.disconnect();
            await this.lirc.disconnect();
        } catch (err) {
            logger.error("Encountered an error while stopping.", err);
        };
    }

    onLircMessage(lircId, command) {
        if (this.homie.connected) {
            const remote = this.remotes.getByLircId(lircId);

            if (remote) {
                this.homie.publishCommand(remote.mqttId, command);
            }
        }
    }

    onMqttMessage(mqttId, command) {
        const remote = this.remotes.getByMqttId(mqttId);

        if (remote) {
            this.lirc.sendOnce(remote.lircId, command);
        }
    }
}

module.exports = LircMqtt;