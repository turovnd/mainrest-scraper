'use strict';

/**
 * Ycombinator (Hacker News) plugin
 *
 * @param search    => Custom search string
 */

const args      = require('yargs').argv;
const axios     = require('axios');

let unpackingArgs = () => {
    for (let key in args) {
        if (key === '_' || key === '$0')
            continue;

        args[key] = JSON.parse(args[key]);
    }
};


let searchRequest = async (search, limit) => {
    return await axios.get('http://hn.algolia.com/api/v1/search_by_date', {
        params: {
            query: search,
            tags: '(story,poll)',
            hitsPerPage: limit
        }
    }).then(response => {
        return { data: response.data.hits }
    }).catch(error => {
        return { error: error }
    });
};


let init = async () => {
    let search = args.search;
    let limit = args.limit || 20;

    let response = await searchRequest(search, limit);

    if (response.error)
        return console.error(response.error);

    let output = response.data.map(item => {
        return {
            title: item.title ? item.title : (item.story_title ? item.story_title : ''),
            url: item.url ? item.url : (item.story_url ? item.story_url : ''),
            text: item.story_text || '',
            author: item.author || '',
            tags: item._tags ? item._tags.join(', ') : '',
            created_at: item.created_at
        }
    });

    console.log(JSON.stringify(output));

};

unpackingArgs();
init();