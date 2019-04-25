const config = require('./config');
const logger = require('./logger');

class Remotes
{
    constructor() {
        this.settings = config.get().remotes;
        this._remotes = [];
    }

    get remotes() {
        return this._remotes;
    }

    addRemote(lircId, commands = []) {
        const remoteSetting = this.settings[lircId] || {};

        if (remoteSetting.disabled) {
            logger.debug("Skipping disabled {remote}", {
                remote: lircId
            });

            return;
        }

        this._remotes.push({
            lircId: lircId,
            mqttId: remoteSetting.mqtt_id || lircId,
            friendlyName: remoteSetting.friendly_name || null,
            commands: commands
        });
    }

    getByMqttId(mqttId) {
        return this._remotes.find(remote => remote.mqttId === mqttId);
    }

    getByLircId(lircId) {
        return this._remotes.find(remote => remote.lircId === lircId);
    }
}

module.exports = Remotes;