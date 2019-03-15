'use strict';

const winston   = require('winston');
const config    = winston.config;

module.exports = () => {

    let addZero_ = (i) => { return i < 10 ? ("0" + i) : i; },
        getDateString_ = (date) => { return "[" + addZero_(date.getDate()) + "." + addZero_(date.getMonth()+1) + "." + (date.getYear()-100) + " " + addZero_(date.getHours()) + ":" + addZero_(date.getMinutes()) + ":" + addZero_(date.getSeconds()) + "]"; };

    return new winston.Logger({
        transports : [
            new winston.transports.Console({
                colorize    : true,
                json        : false,
                stringify   : false,
                timestamp: () => {
                    return getDateString_(new Date());
                },
                formatter: (options) => {
                    return options.timestamp() + ' ' + config.colorize(options.level, options.level.toUpperCase()) + ' ' + (options.message ? options.message : '');
                }
            })
        ],
        exitOnError: false
    });
};

