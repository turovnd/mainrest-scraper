'use strict';

/**
 * MainREST scraping plugin
 *
 * @param env   => parameters prom `process.env`
 * @param url   => scrape URL
 * @param type  => type of loading (hard|light)
 * @param style => need to load styles or not
 * @param tags  => undefined|array => if set => return array of posts
 * @param filters  => array - filter for include/exclude posts
 */

// Global libraries.
const args          = require('yargs').argv;
// Local libraries.
const browser       = require('./modules/browser');
const pageParser    = require('./modules/page-parser');

// Процедура распаковки аргументов.
let unpackingArgs = () => {

    for (let key in args) {
        if (key === '_' || key === '$0')
            continue;
        args[key] = JSON.parse(args[key]);
    }
};


let init = async () => {
    // Set ENV parameters
    let status = browser.setDefaultParameters(args.env);
    if (!status)
        return console.error("Error configuration of default parameters.");

    // Get source HTML as object
    args.style = args.style === 'true';
    let htmlObj = await browser.getPageSource(args.url, args.type, args.style);

    // If error => return error
    if (htmlObj.error)
        return console.error(htmlObj.error);
    // If tags is not specified -> return source HTML
    else if (!args.tags)
        return console.log(JSON.stringify(htmlObj.html));

    if (args.tags.length === 0)
        return console.error("Tags do not set.");

    // Convert HTML to DOM
    let document = null;
    try {
        document = await pageParser.getHtmlDocument(htmlObj.html);
    } catch (ex) {
        return console.error("Error occur on parsing HTML." + ex );
    }

    let filters = {};
    if (args.filters && args.filters.length) {
        for (let i in args.filters) {
            if (!filters[args.filters[i].field])
                filters[args.filters[i].field] = [];
            filters[args.filters[i].field].push({
                type: args.filters[i].type,
                value: args.filters[i].value
            })
        }
    }

    let tags = [];
    try {
        tags = args.tags.map(item => {
            return {
                unique: item.unique === "UK",
                attr: item.attr,
                field: item.field,
                xpath: item.xpath.indexOf('html/body') > -1 ? item.xpath : pageParser.convertDynamicToStatic(item.xpath, document)
            };
        });
    } catch (ex) {
        return console.error("Error occur on parsing tags xPaths. " + ex);
    }

    let parentNodeArr = pageParser.getParentNodeArr(tags, document);

    if (!parentNodeArr)
        return console.error("Error occur on parsing tags xPaths");

    let data = [];
    for (let i in parentNodeArr) {
        let post = pageParser.getPost(tags, filters, document, parentNodeArr[i]);
        if (post)
            data.push( post )
    }

    console.log(JSON.stringify(data));
};


unpackingArgs();
init();