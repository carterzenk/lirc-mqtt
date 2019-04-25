const config = require('./config');
const { createLogger, format, transports } = require('winston');

const settings = config.get().logger;

const logger = createLogger({
    level: settings.level,
    format: format.combine(
        format.label({
            label: 'lirc-mqtt'
        }),
        format.timestamp(),
        format.metadata({
            fillExcept: ['label', 'timestamp', 'level', 'message']
        }),
        format.printf(({ level, message, label, timestamp, metadata }) => {
            let formatted = `${timestamp} [${label}] ${level}: ${message}`;

            if (Object.keys(metadata).length > 0) {
                const meta = JSON.stringify(metadata);
                formatted += ` ${meta}`;
            }
            
            return formatted;
        })
    ),
    transports: [
        new transports.Console()
    ]
});

if (settings.filename) {
    const opts = {
        filename: settings.filename
    };

    logger.info("Logging to directory.", opts);
    logger.add(new transports.File(opts));
}

module.exports = logger;