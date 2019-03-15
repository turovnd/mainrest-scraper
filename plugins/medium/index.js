'use strict';

/**
 * Medium plugin
 *
 * @param search    => Custom search string
 * @param type      => Type of elements for search in TYPES
 */

const args  = require('yargs').argv;
const queryStr  = require('querystring');
const request = require('request');

const TYPES = ['posts', 'users', 'tags', 'collections'];
const BASE_URL = 'https://medium.com/';
const IMG_URL = 'https://cdn-images-1.medium.com/fit/';


let unpackingArgs = () => {
    for (let key in args) {
        if (key === '_' || key === '$0')
            continue;

        args[key] = JSON.parse(args[key]);
    }
};

let searchRequest = async (search) => {
    return new Promise((resolve, reject) => {
        try {
            request('https://medium.com/search?' + queryStr.stringify({ q: search, format: 'json' }), (error, response, body) => {
                if (error || (response && response.statusCode !== 200))
                    reject('Error: ' + error);
                else
                    resolve(body);
            });
        } catch(exception) {
            reject('Exception: ' + exception);
        }
    }).then(html => {
        return { html: html }
    }).catch(error => {
        return { error: error }
    });
};

let init = async () => {
    let type = args.type;
    let search = args.search;

    if (TYPES.indexOf(args.type) === -1)
        return console.error("Unavailable type for search.");

    let html = await searchRequest(search);
    if (html.error)
        return console.error(html.error);

    html = html.html.replace('])}while(1);</x>', '');

    let json = null;
    try {
        json = JSON.parse(html);
    } catch (err) {
        return console.error("Error occur on parsing html.");
    }

    json = json.payload.value[type];
    let outputs = [];

    switch(type) {
        case 'posts':
            outputs = json.map(item => {
                let width = item.virtuals.previewImage.originalWidth || 500;
                let height = item.virtuals.previewImage.originalHeight || 500;
                return {
                    title: item.title,
                    subtitle: item.virtuals.subtitle,
                    image: item.virtuals.previewImage && item.virtuals.previewImage.imageId !== "" ? (IMG_URL + width + "/" + height + "/" + item.virtuals.previewImage.imageId) : '',
                    language: item.detectedLanguage,
                    tags: item.virtuals.tags ? item.virtuals.tags.map(item => { return item.name }).join(', ') : '',
                    link: BASE_URL + "/" + item.uniqueSlug
                }
            });
            break;
        case 'collections':
            outputs = json.map(item => {
                let widthImg = item.image.originalWidth || 500;
                let heightImg = item.image.originalHeight || 500;
                let widthLogo = item.logo.originalWidth || 200;
                let heightLogo = item.logo.originalHeight || 200;
                let widthIcon = item.favicon.originalWidth || 200;
                let heightIcon = item.favicon.originalHeight || 200;
                return {
                    name: item.name,
                    link: BASE_URL + item.slug,
                    tags: item.tags && item.tags.length ? item.tags.join(', ') : '',
                    description: item.description || '',
                    image: item.image && item.image.imageId !== "" ? (IMG_URL + widthImg + "/" + heightImg + "/" + item.image.imageId) : '',
                    logo: item.logo && item.logo.imageId !== "" ? (IMG_URL + widthLogo + "/" + heightLogo + "/" + item.logo.imageId) : '',
                    favicon: item.favicon && item.favicon.imageId !== "" ? (IMG_URL + widthIcon + "/" + heightIcon + "/" + item.favicon.imageId) : '',
                    twitter: item.twitterUsername || '',
                    facebook: item.facebookPageName || '',
                    email: item.publicEmail || '',
                    site: item.domain || ''
                }
            });
            break;
        case 'users':
            outputs = json.map(item => {
                return {
                    name: item.name,
                    link: BASE_URL + "@" + item.username,
                    bio: item.bio || '',
                    image: item.imageId  ? (IMG_URL + "200/200/" + item.imageId) : '',
                    twitter: item.twitterScreenName || '',
                    facebook: item.facebookAccountId || ''
                }
            });
            break;
        case 'tags':
            outputs = json.map(item => {
                return {
                    name: item.name,
                    link: BASE_URL + item.slug,
                    image: item.metadata.coverImage && item.metadata.coverImage.id !== "" ? (IMG_URL + (item.metadata.coverImage.originalWidth || 200) + "/" + (item.metadata.coverImage.originalHeight || 200) + "/" + item.metadata.coverImage.id) : ''
                }
            });
            break;
    }

    console.log(JSON.stringify(outputs));
};

unpackingArgs();
init();