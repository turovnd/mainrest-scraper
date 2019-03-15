'use strict';

const logger    = require('./logger')();
const exec      = require('child-process-promise').spawn;
const path      = require('path');

const ENV = {
    AGENT_RESPONSE_TIMEOUT: process.env.AGENT_RESPONSE_TIMEOUT,
    AGENT_BROWSER_TIMEOUT: process.env.AGENT_BROWSER_TIMEOUT,
    AGENT_BROWSER_TIMES: process.env.AGENT_BROWSER_TIMES,
    AGENT_PROXY_SERVER: process.env.AGENT_PROXY_SERVER
};

/**
 * Запускает определенный плагин с указанными параметрами.
 *
 * @param pluginId
 * @param params {JSON}
 */
let execPlugin_ = (pluginId, params) => {
    return new Promise(resolve => {
        // Формируем путь до плагина.
        let scriptPath = path.join(__dirname, "..", "plugins", pluginId, "index.js");

        /**
         * Формируем массив параметров для запуска плагина.
         *
         * NOTE: тут идёт запаковка всех параметров, если этого не сделать, то будут возможны инъекции
         *       через аргументы, а так же всякие другие неприятные проблемы.
         */
        let pluginExec = [ scriptPath ];
        if (pluginId === '_browser')
            params['env'] = ENV;
        for (let key in params){
            pluginExec.push('--' + key);
            pluginExec.push(JSON.stringify(params[key]));
        }

        // Запускаем процесс.
        exec('node', pluginExec, { capture: [ 'stdout', 'stderr' ]})
            .then(result => {
                if (!result.stderr) {
                    resolve({ response: JSON.parse(result.stdout) });
                } else {
                    logger.error('[Error] ' + result.stderr);
                    resolve({ error: '[Error] ' + result.stderr });
                }
            })
            .catch(err => {
                logger.error('[Exception] ' + err);
                resolve({ error: '[Exception] ' + err });
            });
    });
};


/**
 * Handle query.
 *
 * @param query
 * @return {*}
 * @private
 */
let handleQuery_ = async (query) => {
    query.responseData = await execPlugin_(query.pluginId, query.requestParams);
    query.responseTime = new Date().toISOString();
    return query;
};


module.exports = {
    handleQuery: handleQuery_
};