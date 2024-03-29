
if (process.argv.length != 5) {
	console.error("ERROR: wrong number of arguments given.")
	console.error("usage: "+ process.argv[0] + " " + process.argv[1] + " <discord webhook ID> <discord webhook token> <discord thread ID>")
	console.error("  Discord webhook ID is the first number on your webhook URL. typically about 16-20 numbers long.")
	console.error("  Discord webhook token is everything after the last / in the webhook URL. wrap in quotes.")
	console.error("  Discord thread ID is the thread ID you want to send to. specifying 0 should also work.")
	process.exit(255)
}

const webhookId = process.argv[2]
const webhookToken = process.argv[3]
const webhookThreadId = process.argv[4]

console.log('loading dependencies')
const fs = require('fs'); // Built-in to nodejs
const path = require('path'); // Built-in to nodejs
const request = require('request'); // Install using npm
const package = require('./package.json')

webhookUrl = "https://discord.com/api/webhooks/" + webhookId + "/" + webhookToken + "?wait=true&thread_id=" + webhookThreadId
tickDataUrl = "/ebgs/v5/ticks"
console.log("webhook url: " + webhookUrl)

const outgoingEmbeds = []



console.log('defining core functions')

function writeLog( message, prefix, writeToFile ) {
	currenttime = new Date().toISOString();
	timestamp = parseInt( currenttime.split( /-(.+)/, 2 )[ 0 ] ) + 1286 + '-' + currenttime.split( /-(.+)/, 2 )[ 1 ];
	if ( !prefix ) {
		prefix = 'Debug'; // By default put [Debug] in front of the message
	}
	writeToFile = typeof writeToFile !== 'undefined' ? writeToFile : true; // Log everything to file by default
	wholeMessage = '('+timestamp+') [' + prefix + '] ' + message;
	console.log( '  ' + wholeMessage );
	if ( writeToFile === true ) {
		fs.appendFileSync( path.basename( __filename ) + '.log', wholeMessage + '\n' );
	}
}
function retrieveApiResultFromEliteBgsApp (apiEndpoint, callback) {
	destinationUrl = "https://elitebgs.app/api"
	writeLog( 'Retrieving EliteBGS.app API result from: ' + destinationUrl + apiEndpoint, 'HTTP-eBGS' );
	try {
		request.get( {
			url: destinationUrl + apiEndpoint, 
			headers: { 'User-Agent': package.description + " - tick watcher" + ' v' + package.version + ' by ' + package.author },
			timeout: 30000
		}, ( error, response, body ) => {
			if ( error ) {
				callback( null );
				writeLog( 'Error retrieving API result: ' + error, 'HTTP-eBGS' );
				throw error;
			}
			if ( body === undefined ) {
				callback( null );
				writeLog( 'General error retrieving API result!', 'HTTP-eBGS' );
				throw 'General error retrieving API result!';
			}
			callback( body );
		} );
	} catch ( err ) {
		writeLog( 'Failed to retrieve API result: ' + err, 'HTTP-eBGS' );
		callback( null );
	}
}


function postToDiscordViaWebhook( embedsToSend, callback ) {
	if ( embedsToSend == [] ) {
		return "no embeds queued for sending! bailing."
	}
	writeLog( 'Posting to Discord via Webhook...', 'DiscordWebhook' );
	try {
		request.post( {
			url: webhookUrl,
			headers: {
				'User-Agent': package.description + " - tick watcher" + ' v' + package.version + ' by ' + package.author,
				"Content-Type": "application/json"
			},
			timeout: 3000,
			json: { "embeds": embedsToSend }

		}, ( error, response, body ) => {
			//console.log(response)
			if ( error ) {
				callback( null );
				writeLog( 'Error posting to Discord: ' + error, 'HTTP' );
				throw error;
			}
			if ( body === undefined ) {
				callback( null );
				writeLog( 'Discord API returned a null response. Assuming all is OK.', 'HTTP' );
			}
			callback( body );
		} );
	} catch ( err ) {
		writeLog( 'Failed to post to Discord: ' + err, 'HTTP' );
		callback( null );
	}
}

function loadCachedTickTime(webhookId) {
	writeLog("Loading cached info from file...","Cache")
	cacheData = {}
	try {
		let rawCacheData = fs.readFileSync("./cache/tickdata-"+webhookId+".json")
		cacheData = JSON.parse(rawCacheData)
		writeLog("Loaded cache ok","Cache")
	} catch(error) {
		writeLog("Couldn't load cache. Assuming doesn't exist & making a new one.\n\t"+error,"Cache")
		saveCachedTickTime(webhookId,0)
	}
	return cacheData
}

function saveCachedTickTime(webhookId,tickData) {
	cacheToWrite = JSON.stringify(tickData)
	try {
		fs.writeFileSync("./cache/tickdata-"+webhookId+".json",cacheToWrite)
	} catch (error) {
		writeLog("COULD NOT WRITE CACHE FILE!\n\t"+error,"CACHE ERROR")
	}
}

retrieveApiResultFromEliteBgsApp(tickDataUrl, apiResult => {

	apiResult=JSON.parse(apiResult)
	console.log(apiResult)

	tickTime = new Date(apiResult[0]["time"])
	lastTick = new Date(loadCachedTickTime(webhookId))

	if ( ( lastTick - tickTime ) != 0 ) {
		console.log(lastTick - tickTime)
		writeLog("new tick was detected. writing cache & sending the embed.")
		saveCachedTickTime(webhookId,tickTime)
	} else {
		writeLog("tick time matched what we have on hand. bailing.")
		process.exit(0)
	}

	tickTimeString = tickTime.toString().split(" ")
	console.log(tickTimeString)

	const newEmbedToSend = {
		title: "Galaxy tick detected <t:"+Math.floor(tickTime.getTime() / 1000)+":R>",
		timestamp: parseInt( tickTime.toISOString().split( /-(.+)/, 2 )[ 0 ] ) + 1286 + '-' + tickTime.toISOString().split( /-(.+)/, 2 )[ 1 ],
		description: "Occurred at "+ tickTimeString[4] + " (Game-time)" 
	}
	console.log(newEmbedToSend)
	postToDiscordViaWebhook([newEmbedToSend], webhookResult => { 
		//if (webhookResult) {writeLog("Something happened, API result below: ","Discord API");console.error(webhookResult)}
	})
})
