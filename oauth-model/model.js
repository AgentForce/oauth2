
/**
 * Module dependencies.
 */

var bluebird = require('bluebird');
var redis = bluebird.promisifyAll(require('redis'));
 
const redisurl = 'redis://:ManuliFe@13.250.129.169:6379';
var db = redis.createClient(redisurl,{
	db: 3
});
var fmt = require('util').format;
const bcrypt = require("bcrypt-nodejs");
// const crypto = require("crypto");
const dateFormat = require('dateformat');

//DB

const _ = require('lodash');
const initOptions = {
	// global event notification;
	error: (error, e) => {
		if (e.cn) {
		}
	}
};

const pgp = require('pg-promise')(initOptions);

// using an invalid connection string:
//const pg = pgp('postgres://oauth2:oauth2@localhost:5432/oauth2');
const pg = pgp('postgres://oauth2:oauth2MNL@13.250.129.169:5432/oauth2');
// const pg = pgp('postgres://tuibghghidgwqr:17f90fa16619961aa31ee73d78bf04835f8d3b2c1c2099062ad705c4a50fb452@ec2-174-129-247-1.compute-1.amazonaws.com:5432/d3h7i5oq2p0cgb');

pg.connect()
	.then(obj => {
		obj.done(); // success, release the connection;
		console.log('connect done');
	})
	.catch(error => {
		console.log('ERROR:', error.message || error);
	});


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


module.exports.getAccessToken = function* (bearerToken, callback) {
	//var token = yield db.hgetall(fmt(formats.token, bearerToken));
	var token = yield promise_getToken(bearerToken);
	
	if (token.accessToken)
		return token;
	else return;
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
	// console.log('verifyScope');
	return true;
};

module.exports.validateScope = function* (user, client, scope) { 
	if (_.intersectionBy(user.resource_ids.split(','), client.resource_ids).length > 0) {
		//Check scope
		let scope_common = _.intersectionWith(user.scope.split(','), client.scopes.split(','),  _.isEqual);
		
		if (scope_common.length > 0) {
			// Get Scope from Role
			// let where = "ROLE_FA";
			return pg.query('SELECT scope FROM oauth_role_scopes WHERE role IN ( $1 )', scope_common)
				.then(function (result) {
					if (result) {
						return JSON.stringify(result);
					} else return false;


				});
		}

	}
	return false;

	 
};

/**
 * Get client.
 */

module.exports.getClient = function* (clientId, clientSecret) {

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

	//var token = db.hgetall('tokens:fc63d292295def45cde9492cbda650636c774b67');
	var token = yield promise_getToken(refreshToken);

	if (token.accessToken)
		return {
			expires: token.refreshTokenExpiresAt,
			refreshToken: token.refreshToken,
			user: JSON.parse(token.user),
			client: JSON.parse(token.client),
			scope: token.scope,
		};
	else return;


};

/**
 * Get user.
 */

module.exports.getUser = function* (username, password) {

	return pg.query('SELECT * FROM oauth_users WHERE username = $1', [username])
		.then(function (result) {
			
			// Xử lý password
			if(result[0]){
				const res_checkPass = checkPass(result[0], password);
				return res_checkPass;
			} else { console.log('abc'); return false; 	}	
		});
};


module.exports.getUserFromClient = function* (client) {
	return pg.query('SELECT * FROM oauth_users WHERE id = $1 ', [client.user_id])
		.then(function (result) {
			return result[0] ? result[0] : false;
		});


	return;
	 
};




module.exports.revokeToken = function* (token) {
	//Delete refresh token in redis
	db.del(fmt(formats.token, token.accessToken));
	db.del(fmt(formats.token, token.refreshToken));
	return true;
};

/**
 * Save token.
 */

module.exports.saveToken = function* (token, client, user) {
	//token.scope = 'write';
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
	yield pro_saveReportPg(token, user);
	// Save table report
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

function checkPass(user, password){
	return new bluebird(function (resolve, reject) {
		bcrypt.hash(password, user.salt, undefined, (err, hash) => {
			if (err) { console.log('abddc'); resolve(false);}
			else{
				// resolve(user);
				if(hash === user.password){
					resolve(user);
				}else resolve(false);
			}
			
				
		});
	});
}

function pro_saveReportPg(token, user) {
	return new bluebird(function (resolve, reject) {
		let today = dateFormat(new Date(), "yyyy-mm-dd");
		// const table = 'oauth_monitor_login_' + parseInt(user.id) % 9 ; 
		const table = 'oauth_monitor_login';
		pg.query('SELECT * FROM ' + table + ' WHERE user_id = $1 and date = $2 ', [user.id, today])
		.then(function (result) {
			if(result[0]){
				//Update
				pg.query("UPDATE " + table + " SET count = count + 1 WHERE date = '" + today + "' and user_id = " + user.id).then(function (err, result) {
					if (!err) reject(err);
					resolve(result)
					//Insert refresh token
				});
			}else{ //Insert
				pg.query('INSERT INTO  ' + table + '(user_id, username,fullname, report_to_username, report_to, report_to_list, token, date, count) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [
					user.id,
					user.username,
					user.fullName,
					user.report_to_username,
					user.report_to,
					user.report_to_list,
					token.accessToken,
					today,
					1
				]).then(function (err, result) {
					if (!err) reject(err);
					resolve(result)
					//Insert refresh token
				});
			}
		});
		
	});
}