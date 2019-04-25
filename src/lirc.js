const lirc = require('lirc-client');
const logger = require('./logger');
const config = require('./config');
const { EventEmitter } = require('events');

class Lirc extends EventEmitter {
    constructor() {
        super();

        this.settings = config.get().lirc;

        this.onReceive = this.onReceive.bind(this);
        this.onError = this.onError.bind(this);

        const clientSettings = Object.assign({}, this.settings);

        // Handle reconnect here instead to avoid null socket errors.
        clientSettings.reconnect = false;

        this.client = lirc(clientSettings);

        this.client.on('receive', this.onReceive);
        this.client.on('error', this.onError);

        this.client.on('error', msg => {
            if (msg === 'end' && this.settings.reconnect) {
                this.disconnect();
                setTimeout(() => this.connect(), this.settings.reconnect_delay);
            }
        });
    }

    async connect() {
        logger.debug("Connecting to LIRC...", this.settings);

        const res = await this.client.connect();
        const version = await this.client.version();

        logger.info("Connected to LIRC.", { version: version["0"]});

        return res;
    }

    disconnect() {
        logger.debug("Disconnecting from LIRC...");

        const events = ['close', 'data', 'end', 'error', 'timeout'];

        this.client._connected = false;
        this.client._connecting = false;
        this.client._readbuffer.splice(0, this.client._readbuffer.length);

        if (this.client._socket) {
            Object.keys(events).forEach(ev => {
                this.client._socket.removeAllListeners(ev);
            });
    
            this.client._socket.end();
            this.client._socket = null;
        }
    }

    async list(remote = null) {
        return await this.client.list(remote);
    }

    async sendCommand(...args) {
        return await this.client.send(...args);
    }

    async sendOnce(remote, command, repeat) {
        logger.debug("Sending LIRC command once.", {
            remote: remote,
            command: command,
            repeat: repeat
        });

        return await this.client.sendOnce(remote, command, repeat);
    }

    onReceive(remote, button, repeat) {
        logger.debug("Received LIRC command.", {
            remote: remote,
            button: button,
            repeat: repeat
        });

        this.emit('received', remote, button, repeat);
    }

    onError(...args) {
        logger.error("Encountered LIRC error.", ...args);
    }
}

module.exports = Lirc;