
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

webhookUrl = "https://discord.com/api/webhooks/" + webhookId + "/" + webhookToken + "?wait=true&thread_id=" + webhookThreadId
tickDataUrl = "/ebgs/v5/ticks"
console.log("webhook url: " + webhookUrl)

const softwareName = "galaxy tick watcher"
const softwareAuthor = "CMDR rglx"
const softwareVersion = "0.0.2"
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
			headers: { 'User-Agent': softwareName + ' v' + softwareVersion + ' by ' + softwareAuthor },
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
				'User-Agent': softwareName + ' v' + softwareVersion + ' by ' + softwareAuthor,
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
		saveCachedTickTime(webhookId,[])
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
	sendEmbed=false

	currentTime = new Date().toISOString();
	console.log(currentTime)
	timestamp = parseInt( currentTime.split( /-(.+)/, 2 )[ 0 ] ) + 1286 + '-' + currentTime.split( /-(.+)/, 2 )[ 1 ];
	console.log(timestamp)

	tickTime = new Date(apiResult[0]["time"]).toISOString();
	console.log(tickTime)
	ticktimestamp = parseInt( tickTime.split( /-(.+)/, 2 )[ 0 ] ) + 1286 + '-' + tickTime.split( /-(.+)/, 2 )[ 1 ];
	console.log(ticktimestamp)

	lastTick = loadCachedTickTime(webhookId)
	differenceInMinutes = Math.floor( parseInt( new Date(timestamp) - new Date(ticktimestamp) ) / (1000 * 60) )
	if ( differenceInMinutes > 1440 ) {
		differenceInMinutes = differenceInMinutes - 1440
	}


	saveCachedTickTime(webhookId,ticktimestamp)
	if ( lastTick != ticktimestamp ) {
		sendEmbed=true
	}
	const newEmbedToSend = {
		title: "**Galaxy tick detected!**",
		timestamp,
		description: "*[ inexplicable message ]*\n\nyou ... probably shouldn't be seeing this. contact rglx and let her know.",
	}
	newEmbedToSend["description"] = "**__Occurred at:__**\n "+new Date(ticktimestamp)+"\n\n*(approximately " + differenceInMinutes + " minutes ago)*"
	if (sendEmbed) {
		console.log(newEmbedToSend)
		postToDiscordViaWebhook([newEmbedToSend], webhookResult => { if (webhookResult) {writeLog("Something happened, API result below: ","Discord API");console.error(webhookResult)} })
	}
})
