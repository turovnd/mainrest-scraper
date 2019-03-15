'use strict';

/**
 * Reddit plugin
 *
 * @param client_id     => Client ID for authorize app
 * @param client_secret => Client secret for authorize app
 * @param search        => Custom search string
 * @param last          => Last item that was receive for previous requests.
 */

const args  = require('yargs').argv;
const axios = require('axios');

// axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

let autorizeApp = async (clientId, clientSecret) => {
    return await axios({
        method: 'post',
        url: 'https://www.reddit.com/api/v1/access_token',
        data: "grant_type=client_credentials",
        auth: {
            username: clientId,
            password: clientSecret
        },
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(response => {
        if (response.data.error) {
            console.error( response.data.error );
            return null;
        }
        return response.data.token_type + " " + response.data.access_token
    }).catch(error => {
        console.error(error.response.data);
        return null;
    })
};


let searchRequest = async (token, search, limit, lastId) => {
    return await axios({
        method: 'get',
        url: 'https://oauth.reddit.com/search',
        params: {
            q: search,
            before: lastId,
            limit: limit || 25,
            sort: 'new',
            t: 'all'
        },
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': token
        }
    }).then(response => {
        if (response.data.error) {
            console.error( response.data.error );
            return null;
        }
        return response.data.data;
    }).catch(error => {
        console.error(error.response.data);
        return null;
    })
};

let unpackingArgs = () => {
    for (let key in args) {
        if (key === '_' || key === '$0')
            continue;

        args[key] = JSON.parse(args[key]);
    }
};


let init = async () => {
    let authToken = await autorizeApp(args.client_id, args.client_secret);
    if (!authToken) {
        console.log([]);
        return;
    }
    let lastId = (args.last === 'undefined' || args.last === undefined || args.last === 'null' || args.last === null) ? '' : args.last;
    let data = await searchRequest(authToken, args.search, args.limit, lastId);

    if (!data) {
        console.log([]);
        return;
    }

    data = data.children.map(item => {
        return {
            title: item.data.title,
            url: item.data.url,
            author: item.data.author,
            // content: item.data.selftext,
            created: new Date(item.data.created_utc * 1000)
        }
    });

    console.log(JSON.stringify(data));
};

unpackingArgs();
init();