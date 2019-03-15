'use strict';

const Nightmare                 = require('nightmare');
const axios                     = require('axios');
const fixUrl                    = require('url').resolve;
const { JSDOM, VirtualConsole } = require('jsdom');

const DEFAULT_ENV_PARAMS = [
    'AGENT_RESPONSE_TIMEOUT',
    'AGENT_BROWSER_TIMEOUT',
    'AGENT_BROWSER_TIMES',
    'AGENT_PROXY_SERVER'
];

let ENV = {}; // values from DEFAULT_ENV_PARAMS


Nightmare.action('deferredWait', function(start, done) {
    let attempt = 0;
    let self = this;
    function doEval() {
        self.evaluate_now(function(selector) {
            return (document.querySelector(selector) !== null);
        }, function(result) {
            if (+new Date() - start > 28 * 1000) {
                done(null, true)
            }
            if (result) {
                done(null, true);
            } else {
                attempt++;
                if (attempt < 20) {
                    setTimeout(doEval, 1000); //This seems iffy.
                } else {
                    done(null, true);
                }
            }
        }, '#elem');
    }
    doEval();
    return this;
});


/**
 * Set default parameters
 *
 * @param env
 */
let setParameters = (env) => {
    for (let i in DEFAULT_ENV_PARAMS) {
        let param = DEFAULT_ENV_PARAMS[i];
        if (env[param] === undefined) {
            return false
        }
        ENV[param] = env[param]
    }
    return true;
};


/**
 * Возвращает объект содержащий исходный код страницы, либо с текстом ошибки.
 *
 * @param url
 * @param type
 * @param isStyleOn
 * @return {*}
 */
let getPageSource = async (url, type, isStyleOn) => {
    let start = +new Date();
    try {
        // Получаем исходный код страницы
        let page = (type === 'hard') ? await getPageHard_(url) : await getPageLight_(url);
        let time = (+new Date() - start) / 1000;
        if (!page.error) {
            // Исправляем исходный код страницы
            page = await fixPageSource_(url, page, isStyleOn);
            time = (+new Date() - start) / 1000;
        }
        return Object.assign({ time: time }, page);
    } catch(ex) {
        return { error: "Agent exception: " + ex }
    }
};


/**
 * Делает простую загрузку страницы, с помощью GET запроса.
 *
 * @param url
 * @return {*}
 * @private
 */
let getPageLight_ = async (url) => {
    return new Promise((resolve, reject) => {
        try {
            // Получаем исходный код сайта и возвращаем его в resolve(...)
            axios.get(url).then(response => {
                resolve(response.data);
            }).catch(error => {
                reject(error.toString())
            })
        } catch(exception) {
            // Ловим ошибки
            reject('Exception: ' + exception);
        }
    }).then(html => { 
        return { html: html }
    }).catch(error => {
        return { error: error }
    });
};


/**
 * Делает сложную загрузку страницы, с использованием виртуального браузера electron.
 *
 * @param url
 */
let getPageHard_ = (url) => {
    let browser = Nightmare({
        loadTimeout: 30000,
        gotoTimeout: 30000,
        // show: true,
        switches: {
            'proxy-server': ENV.AGENT_PROXY_SERVER,
            'ignore-certificate-errors': true
        }
    });
    let refreshIntervalId;
    let startTime = +new Date();
    return new Promise((resolve, reject) => {
        try {
            // Запускаем киллер процесса, на случай, если он зависнет
            let i = 0;
            let errMsg = 'Nightmare process killed by timeout in code';
            refreshIntervalId = setInterval(() => {
                // Убиваем процесс, если прошло много времени
                if (++i > ENV.AGENT_BROWSER_TIMES) {
                    browser.halt(errMsg, () => { });
                    reject(errMsg);
                    clearInterval(refreshIntervalId)
                }
            }, ENV.AGENT_BROWSER_TIMEOUT);

            // Получаем исходный код сайта и возвращаем его в resolve(...)
            browser
                .cookies.clearAll()
                .useragent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36 OPR/52.0.2871.99')
                .goto(url)
                .deferredWait( startTime )
                .evaluate(selector => {
                    return document.getElementsByTagName(selector)[0].innerHTML;
                }, 'html')
                .end()
                .then(html => {
                    // Возвращаем исходный код страницы
                    resolve(html);
                }).catch(error => {
                    // Ловим ошибки
                    reject(error.toString());
                });
        } catch(exception) {
            // Ловим ошибки
            reject('Exception: ' + exception);
        }
    }).then(html => {
        clearInterval(refreshIntervalId);
        return { html: html };
    }).catch(error => {
        clearInterval(refreshIntervalId);
        return { error: error }
    });
};


/**
 * Исправляет исходный код загруженной страницы.
 *
 * @param url
 * @param page
 * @param isStyleOn
 */
let fixPageSource_ = (url, page, isStyleOn) => {
    try {
        let virtualConsole = new VirtualConsole();
        virtualConsole.on("error", () => { });

        let doc = new JSDOM(page.html, { virtualConsole });

        // Обрабатываем все link теги
        let linkTags = doc.window.document.querySelectorAll('link');

        for (let i in linkTags) {
            // Если стили - исправляем их href
            if (linkTags[i].rel === 'stylesheet') {
                linkTags[i].href = fixUrl(url, linkTags[i].href);

                // Если просто link - удаляем элемент
            } else if (linkTags[i].rel) {
                linkTags[i].remove();
            }
        }

        // Исправляем все A теги
        let aTags = doc.window.document.querySelectorAll('a');

        for (let i in aTags) {
            if (aTags[i].href)
                aTags[i].href = fixUrl(url, aTags[i].href);
        }

        // Исправляем все IMG теги
        let imgTags = doc.window.document.querySelectorAll('img');

        for (let i in imgTags)
            if (imgTags[i].src)
                imgTags[i].src = fixUrl(url, imgTags[i].src);

        // Удаляем представителей некоторых тегов
        let tagList = ['script', 'iframe', 'noscript'];
        if (!isStyleOn)
            tagList = [...tagList, 'style', 'link'];

        tagList.forEach(tag => {
            let subs = doc.window.document.querySelectorAll(tag);
            subs.forEach(sub => {
                if (sub)
                    sub.remove();
            })
        });

        page.html = doc.serialize();

    } catch (error) {

    }
    return page;
};


module.exports = {
    getPageSource: getPageSource,
    setDefaultParameters: setParameters
};
