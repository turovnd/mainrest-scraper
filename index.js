'use strict';

require('dotenv').config();

const logger = require('./modules/logger')();

if (!process.env.AGENT_BROWSER_TIMEOUT
        || !process.env.AGENT_BROWSER_TIMES
        || !process.env.AGENT_RESPONSE_TIMEOUT
        || !process.env.MR_PROXY_WEBSITE) {

    return logger.error('Server critical error. ' +
        'Check `.env` file some of parameter are missed ' +
        '[MR_PROXY_WEBSITE, AGENT_BROWSER_TIMEOUT, AGENT_BROWSER_TIMES, AGENT_RESPONSE_TIMEOUT].');
}

const Socket = require('socket.io-client');
const Agent  = require('./modules/agent');


/**
 * Get socket.
 *
 * @return {Socket}
 * @private
 */
let getSocket_ = () => {
    return Socket(process.env.MR_PROXY_WEBSITE + "/agent", { reconnection: true } );
};


/**
 * Initialize agent.
 */
let init = () => {
    logger.info('Agent was connected');

    let socket = getSocket_();

    socket.emit('new agent');

    socket.on('handle query', async (query, response) => {
        response( await Agent.handleQuery(query) );
    });

    socket.on('reconnect', attempt => {
        logger.info('Agent was reconnect after ' + attempt + ' attempts');
        socket.emit('new agent');
    });

    socket.on('disconnect', status =>  {
        logger.info('Agent was disconnected [' + status + ']');
    });
};


init();