
/**
 * Module dependencies.
 */

//var redis = require("redis");
//var db = redis.createClient({ detect_buffers: true });
//var db = require('bluebird').promisify(client);
// var redis = require('redis');
// bluebird.promisifyAll(redis.RedisClient.prototype);
var bluebird = require('bluebird');
var redis = bluebird.promisifyAll(require('redis'));
 
const redisurl = 'redis://:ManuliFe@13.250.129.169:6379';
//var db = redis.createClient(_options.redisUrl);
var db = redis.createClient(redisurl);
var fmt = require('util').format;

//DB

const _ = require('lodash');
const initOptions = {
	// global event notification;
	error: (error, e) => {
		if (e.cn) {
			// A connection-related error;
			//
			// Connections are reported back with the password hashed,
			// for safe errors logging, without exposing passwords.
			//console.log('CN:', e.cn);
			//console.log('EVENT:', error.message || error);
		}
	}
};

const pgp = require('pg-promise')(initOptions);

// using an invalid connection string:
//const pg = pgp('postgres://oauth2:oauth2@localhost:5432/oauth2');
const pg = pgp('postgres://oauth2:oauth2MNL@13.250.129.169:5432/oauth2');

pg.connect()
	.then(obj => {
		obj.done(); // success, release the connection;
		console.log('connect done');
	})
	.catch(error => {
		console.log('ERROR:', error.message || error);
	});

//const pg = require('pg-promise')("postgres://oauth2:oauth2@localhost:5432/oauth2");


/**
 * Redis formats.
 */

var formats = {
	client: 'clients:%s',
	token: 'tokens:%s',
	user: 'users:%s'
};

/**
 * Get access token.
 */


module.exports.getAccessToken = function* (bearerToken) {
	console.log('getAccessToken')

	//var token = yield db.hgetall(fmt(formats.token, bearerToken));
	var token = yield promise_getToken(bearerToken);
	if (token.accessToken)
		return token;
	else return;
	//var token = db.hgetall('fmt(formats.token, bearerToken)');

	/*db.hgetall(fmt(formats.token, bearerToken), function (err, token) {
		if (err) {
			// do something like callback(err) or whatever
			console.log(err)
		} else {
			// do something with results
			console.log(token)
			if (!token) {
				return;
			}

			/*return {
				accessToken: token.accessToken,
				clientId: token.clientId,
				expires: token.accessTokenExpiresOn,
				userId: token.userId,
				accessTokenExpiresAt: token.accessTokenExpiresAt,
				user: token.user
			};
			return token;
		}
	});

 	console.log('======' + bearerToken)
	return {
		accessToken: '07291623e76515771e8af2dc8b1c718',
		clientId: 'token.clientId',
		expires: 'Fri Feb 02 2018 17:48:35 GMT+0700 (+07)',
		userId: 1,
		accessTokenExpiresAt: new Date('Fri Feb 02 2017 17:48:35 GMT+0700 (+07)'),
		user: 1
	};*/
};

function promise_getToken(bearerToken) {
	return new bluebird(function (resolve, reject) {
		db.hgetall(fmt(formats.token, bearerToken), function (err, token) {
			if (err) {
				// do something like callback(err) or whatever
				return;
			} else {
				// do something with results
				if (token) {

					resolve(token);
				} else resolve({})


				//return token;
			}
		})
	});
}
module.exports.verifyScope = function* (accessToken, scope) {
	console.log('verifyScope');
	//console.log(accessToken);
	//console.log(scope);
	return true;
};

module.exports.validateScope = function* (user, client, scope) { 
	console.log('validateScope===============');
	console.log(user.scope);
	console.log(client.scopes);
	if (_.intersectionBy(user.resource_ids.split(','), client.resource_ids).length > 0) {
		//Check scope
		let scope_common = _.intersectionWith(user.scope.split(','), client.scopes.split(','),  _.isEqual);
		//_.intersectionWith(objects, others, _.isEqual);
		if (scope_common.length > 0) {
			return JSON.stringify(scope_common);
		}

	}
	return false;

	 
};

/**
 * Get client.
 */

module.exports.getClient = function* (clientId, clientSecret) {
	console.log('getClient')

	/*var client =   db.hgetall(fmt(formats.client, clientId));
  
	if (!client || client.clientSecret !== clientSecret) {
	  return;
	}
  
	return {
	  clientId: client.clientId,
	  clientSecret: client.clientSecret
	};*/

	return pg.query('SELECT * FROM oauth_clients WHERE client_id = $1 AND client_secret = $2', [clientId, clientSecret])
		.then(function (result) {
			if (result[0]) {
				const oAuthClient = result[0];
				return {
					id: oAuthClient.id,
					clientId: oAuthClient.client_id,
					clientSecret: oAuthClient.client_secret,
					grants: _.split(oAuthClient.grant_types, ','), // the list of OAuth2 grant types that should be allowed
					scopes: oAuthClient.scope,
					accessTokenLifetime: oAuthClient.accessTokenLifetime,
					refreshTokenLifetime: oAuthClient.refreshTokenLifetime,
					resource_ids: _.split(oAuthClient.resource_ids, ','),
					user_id: oAuthClient.user_id
				};
			} else return null;


		});

};

/**
 * Get refresh token.
 */

module.exports.getRefreshToken = function* (refreshToken) {
	console.log('getRefreshToken')

	//var token = db.hgetall('tokens:fc63d292295def45cde9492cbda650636c774b67');
	var token = yield promise_getToken(refreshToken);

	if (token.accessToken)
		return {
			expires: token.refreshTokenExpiresAt,
			refreshToken: token.refreshToken,
			user: JSON.parse(token.user),
			client: JSON.parse(token.client),
		};
	else return;


};

/**
 * Get user.
 */

module.exports.getUser = function* (username, password) {
	console.log('getUser')

	return pg.query('SELECT * FROM oauth_users WHERE username = $1 AND password = $2', [username, password])
		.then(function (result) {
			//console.log(result[0]);
			return result[0] ? result[0] : false;
		});


	return {
		id: user.username
	};
	/*var user = db.hgetall(fmt(formats.user, username));

	if (!user || password !== user.password) {
		return;
	}

	return {
		id: username
	};*/
};


module.exports.getUserFromClient = function* (client) {
	console.log('getUserFromClient')
	return pg.query('SELECT * FROM oauth_users WHERE id = $1 ', [client.user_id])
		.then(function (result) {
			console.log(result[0]);
			return result[0] ? result[0] : false;
		});


	return;
	/*var user = db.hgetall(fmt(formats.user, username));

	if (!user || password !== user.password) {
		return;
	}

	return {
		id: username
	};*/
};




module.exports.revokeToken = function* (token) {
	console.log('revokeToken');
	//Delete refresh token in redis
	db.del(fmt(formats.token, token.accessToken));
	db.del(fmt(formats.token, token.refreshToken));
	return true;
};

/**
 * Save token.
 */

module.exports.saveToken = function* (token, client, user) {
	console.log('saveToken')
	//token.scope = 'write';
	console.log(token.scope);
	var data = {
		accessToken: token.accessToken,
		accessTokenExpiresAt: token.accessTokenExpiresAt,
		clientId: client.clientId,
		client: JSON.stringify(client),
		user: JSON.stringify(user),
		refreshToken: token.refreshToken ? token.refreshToken : '',
		refreshTokenExpiresAt: token.refreshTokenExpiresAt ? token.refreshTokenExpiresAt : 0,
		userId: user.id,
		scope: token.scope
	};
	 
	db.hmset(fmt(formats.token, token.accessToken), data);
	db.expire(fmt(formats.token, token.accessToken), client.accessTokenLifetime);
	db.hmset(fmt(formats.token, token.refreshToken), data);
	db.expire(fmt(formats.token, token.refreshToken), client.refreshTokenLifetime);
	//Save token db
	yield pro_saveTokenPg(token, client, user);


	/*var hashKey = 'keyabc';
	var redisObj = {
		subkey1: 'subkey1_value', subkey2: 'subkey2_value'
	};
	//logger.info('Calling Redis hmset to set data on Redis.');
	db.hmset(hashKey, data, function(err) {
		if(! err) {
			console.log('No error while setting data on Redis. Resolving.');
			//deferred.resolve();
		} else {
			logger.info('Error while setting data on Redis. Rejecting.');
			//deferred.reject(err);
		}
	});
	console.log('abc')*/
	return data;
};

function pro_saveTokenPg(token, client, user) {
	return new bluebird(function (resolve, reject) {
		pg.query('INSERT INTO oauth_access_tokens(access_token, expires, client_id,scope, user_id, oauthuser, oauthclient, refresh_token, expires_refresh_token) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [
			token.accessToken,
			token.accessTokenExpiresAt,
			client.clientId,
			token.scope,
			user.id,
			JSON.stringify(user),
			JSON.stringify(client),
			token.refreshToken,
			token.refreshTokenExpiresAt
		]).then(function (err, result) {
			if (!err) reject(err);
			resolve(result)
			//Insert refresh token
		});
	});
}