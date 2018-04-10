const oauthServer = require('koa2-oauth-server');
const router = require('koa-router');
const oauthModel = require('../oauth-model/model');
const _ = require('lodash');

module.exports = getOauthRouter;

function getOauthRouter(app, options={}){

	var oauthRouter = new router({ prefix: options.prefix });

	app.oauth = new oauthServer({
		model: oauthModel,
		useErrorHandler: true
	});

	
	//check if the user has logged, if not, redirect to login page, otherwise redirect to the authorization confirm page
	//oauthRouter.get('/authorize', checkLogin);

	//define the authorize endpoint, in this example, we implement only the most commonly used authorization type: authorization code
	/*oauthRouter.get('/authorize', app.oauth.authorize({
		//implement a handle(request, response):user method to get the authenticated user (aka. the logged-in user)
		//Note: this is where the node-oauth2-server get to know what the currently logined-in user is.
		authenticateHandler: authenticateHandler()
	}));*/

	//define the token endpoint, in this example, we implement two token grant types: 'code' and 'refresh_token'
	oauthRouter.post('/token', app.oauth.token());
	//oauthRouter.get('/authorise', app.oauth.authenticate());
	//oauthRouter.get('/authorise', app.oauth.authenticate())
	
	oauthRouter.post('/authorise/*', app.oauth.authenticate({ scope: 'user_info:read' }));

	//error handler
	oauthRouter.all('/*', async (ctx, next) => {
		var oauthState = ctx.state.oauth || {};
        if(oauthState.error){
            //handle the error thrown by the oauth.authenticate middleware here
            ctx.throw(oauthState.error);
            return;
        }
		await next();
	});

	oauthRouter.get('/authorise/check', async (ctx, next) => {
        
        
        //respond with the user's detail information
        ctx.body = {
            'success': true,
            'result': 'detail',
        };
    });

	oauthRouter.post('/authorise/check', async (ctx, next) => {
		var name_api = ctx.request.body.name_api;
		var oauthState = ctx.state.oauth || {};
		let index = _.findIndex(JSON.parse(oauthState.token.scope), function(o) { return o.scope == name_api; });
		if(index >= 0){
			let  hobbies = ctx.request.body;
			const objUser = JSON.parse(oauthState.token.user);
			delete objUser.password;
			delete objUser.scope;
			delete objUser.resource_ids;
			let res = {
				infor : objUser,
				level: 23

			}
			
			ctx.body = {
				'success': true,
				'result' : res
			};
		} else {
			ctx.body = {
				'success': false,
				'result' : [],
				'msg': name_api + " not found"
			};
		}
		
    });


	return oauthRouter;
}



 

function getRequestUrl(ctx){
	return `${ctx.href}`;
}

function removeUserAction(url){
	return url.replace(/&?(deny|agree|logout|csrfToken)=[^&]+/g, '');
}

/**
 * @param {Date} time
 * @return {Boolean}
 */
function isExpired(time){
	return Date.now() >= time;
}

 