const winston = require('winston');

// Logger Configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Errors ko alag file me save karein
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // Sabhi logs ko combined file me save karein
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Agar hum Localhost par hain, to colorful logs console me dikhayein
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
    ),
  }));
}

module.exports = logger;