'use strict';

const { JSDOM, VirtualConsole } = require('jsdom');


/**
 * Get elements by xpath.
 *
 * @param xpath
 * @param doc {JSDOM}
 * @param element {HTMLElement}
 * @return {Array}
 * @private
 */
let getByXPath_ = (xpath, doc, element) => {
    let iterator = doc.window.document.evaluate(xpath, element || doc.window.document, null, doc.window.XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
    let array = [];
    let thisNode = iterator.iterateNext();
    while (thisNode) {
        array.push(thisNode);
        thisNode = iterator.iterateNext();
    }
    return array;
};


/**
 * Convert PageSource to HtmlDocument.
 *
 * @param html {string} - HTML
 * @return {JSDOM}
 * @private
 */
let getHtmlDocument_ = async (html) => {
    let virtualConsole = new VirtualConsole();
    virtualConsole.on("error", () => { });

    return new JSDOM(html, { virtualConsole });
};


/**
 * Convert dynamic xpath to static.
 *
 * @param path
 * @param doc {JSDOM}
 * @return {string}
 */
let convertDynamicToStatic_ = (path, doc) => {
    let elements = getByXPath_(path, doc);
    let elem1 = elements[0];
    let elem2 = elements[elements.length - 1];

    // if elements are same => return static xpath
    if (elem1 === elem2)
        return getXPathTo_(elem1).replace(/\[1]/g,'');

    let arr1 = getXPathTo_(elem1).replace(/\[1]/g,'').split('/');
    let arr2 = getXPathTo_(elem2).replace(/\[1]/g,'').split('/');
    let ind = 0;
    for (let i in arr1) {
        if (arr1[i] !== arr2[i] && ind < 2)
            arr2[i] = arr2[i].split('[')[0] + '[{INDEX' + (++ind) +'}]';
    }
    return arr2.join('/')
};


/**
 * Generate static xPath to element.
 *
 * @param element
 * @return {string}
 */
let getXPathTo_ = (element) => {
    if (element.tagName.toUpperCase() === 'HTML')
        return '/html[1]';
    if (element.tagName.toUpperCase() === 'BODY')
        return '/html[1]/body[1]';

    let ix = 0;
    let siblings = element.parentNode.childNodes;

    // Searching index
    for (let i = 0; i < siblings.length; i++) {
        let sib = siblings[i];
        // If element found
        if (sib === element)
            return getXPathTo_(element.parentNode) + '/' + element.tagName + '[' + (ix + 1) + ']';
        // If elements tagName have same type => increment
        if (sib.nodeType === 1 && sib.tagName === element.tagName)
            ix++;
    }
};


/**
 * Get array of parent nodes by tags.
 *
 * @param tags {array}
 * @param doc
 * @return {*}
 */
let getParentNodeArr_ = (tags, doc) => {
    let parentXPath = '/html';
    let index1 = null;
    let index2 = null;
    let tagXPath = null;
    tags.forEach(item => {
        if (item.unique) {
            if (!tagXPath)
                tagXPath = item.xpath;
            if (!index1)
                index1 = item.xpath.indexOf('[{INDEX1}]') > -1 ? item.xpath.indexOf('[{INDEX1}]') : null;
            if (!index2)
                index2 = item.xpath.indexOf('[{INDEX2}]') > -1 ? item.xpath.indexOf('[{INDEX2}]') : null;
        }
    });
    if (!tagXPath)
        return null;
    if (index2)
        parentXPath = tagXPath.substring(0, index2).replace(/\[{INDEX1}]/i,'');
    else if (index1)
        parentXPath = tagXPath.substring(0, index1);

    return getByXPath_(parentXPath, doc)
};


/**
 * Ger post by tags and node.
 *
 * @param tags {array}
 * @param filters {object}
 * @param doc {JSDOM}
 * @param node {HTMLElement}
 * @private {object}
 */
let getPost_ = (tags, filters, doc, node) => {
    let obj = {};
    for (let i in tags) {
        let tag = tags[i];
        // Get path after {INDEX} like `./div/a`
        let path = tag.xpath.split('html')[1];
        path = path.indexOf('[{INDEX2}]') > -1 ? path.split('[{INDEX2}]')[1] : path;
        path = path.indexOf('[{INDEX1}]') > -1 ? path.split('[{INDEX1}]')[1] : path;
        let elem = getByXPath_("." + path, doc, node)[0];
        switch (tag.attr) {
            case 'content':
                obj[tag.field] = elem ? elem.textContent : '';
                break;
            default:
                obj[tag.field] = elem ? elem.getAttribute(tag.attr) : '';
        }
        // If field is required and data is empty => skip
        if (tag.unique && obj[tag.field] === "")
            return null;
        // Filter value
        if (filters[tag.field] && filters[tag.field].length) {
            let success = true;
            for (let j in filters[tag.field]) {
                let filter = filters[tag.field][j];
                switch(filter.type) {
                    case 'include':
                        if (obj[tag.field] && obj[tag.field].toLowerCase().search(filter.value.toLowerCase()) === -1)
                            success = false;
                        break;
                    case 'exclude':
                        if (obj[tag.field] && obj[tag.field].toLowerCase().search(filter.value.toLowerCase()) !== -1)
                            success = false;
                        break;
                }
            }
            if (!success)
                return null;
        }
    }
    return obj;
};


module.exports = {
    getHtmlDocument: getHtmlDocument_,
    convertDynamicToStatic: convertDynamicToStatic_,
    getParentNodeArr: getParentNodeArr_,
    getPost: getPost_
};
