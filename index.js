const LircMqtt = require('./src/lirc-mqtt');

const lircMqtt = new LircMqtt();

lircMqtt.start();

const onExit = () => {
    lircMqtt.stop().then(() => {
        process.exit();
    });
}

process.on('SIGINT', onExit);
process.on('SIGTERM', onExit);
