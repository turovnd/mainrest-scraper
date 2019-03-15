'use strict';

/**
 * Avito plugin
 *
 * @param search    => Custom search string
 * @param city      => City form CITIES array
 */

const args      = require('yargs').argv;
const queryStr  = require('querystring');
const request   = require('request');
const cheerio   = require('cheerio');
const fixUrl    = require('url').resolve;

const CITIES = ['rossiya', 'moskva', 'sankt-peterburg', 'astrahan', 'barnaul', 'volgograd',
                'voronezh', 'ekaterinburg', 'izhevsk', 'irkutsk', 'kazan', 'kaliningrad', 'krasnodar',
                'naberezhnye_chelny', 'nizhniy_novgorod', 'novosibirsk', 'omsk', 'orenburg', 'perm', 'rostov-na-donu',
                'samara', 'saratov', 'stavropol', 'tolyatti', 'tula', 'tyumen', 'ulyanovsk', 'ufa', 'chelyabinsk', 'yaroslavl'];

const BASE_URL = 'https://www.avito.ru/';


let unpackingArgs = () => {
    for (let key in args) {
        if (key === '_' || key === '$0')
            continue;

        args[key] = JSON.parse(args[key]);
    }
};


let searchRequest = async (city, search) => {
    return new Promise((resolve, reject) => {
        try {
            request(BASE_URL + city + '?' + queryStr.stringify({ s: 104, q: search }), (error, response, body) => {
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
    let search = args.search;
    let city = args.city;

    if (typeof city === 'string')
        city = city.toLowerCase().replace(/ /g, '_');

    if (CITIES.indexOf(city) === -1)
        return console.error('Unavailable city [' + city + '].');

    let data = await searchRequest(city, search);

    if (data.error)
        return console.error(data.error);

    let output = [];
    let $ = cheerio.load(data.html);

    let blocks = $('.js-catalog-item-enum');
    for (let i = 0; i < blocks.length; i++) {
        let name = $('.item-description-title-link', blocks[i]).attr('title') || '';
        let link = $('.item-description-title-link', blocks[i]).attr('href') || '';
        if (link !== '') {
            let image = $('.item-slider-image.large-picture', blocks[i]).attr('style') || $('.photo-wrapper.js-photo-wrapper.large-picture img', blocks[i]).attr('data-srcpath') || $('.js-item-slider-item', blocks[i]).attr('data-srcpath') || ''
            image = image.replace(/background-image: url\(/g, '').replace(/\/\//g, '').replace(/\)/,'');
            image = (image !== '' && image.search('https://') === -1) ? ("https://" + image) : image;
            output.push({
                name: name.trim(),
                link: fixUrl(BASE_URL, link),
                image: image,
                price: ($('.price', blocks[i]).text() || '').trim(),
                category: ($('.data p', blocks[i]).first().text() || '').split('|')[0].trim(),
                location: ($('.data p ', blocks[i]).next('p').text() || '').trim(),
                absolute_date: ($('.js-item-date', blocks[i]).attr('data-absolute-date') || '').trim()
            });
        }
    }
    console.log(JSON.stringify(output));
};

unpackingArgs();
init();
