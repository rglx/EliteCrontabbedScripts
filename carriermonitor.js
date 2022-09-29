#!/usr/bin/env nodejs

// fleet carrier webhook broadcaster thing
// run by crontab, which then checks against a cached list of carriers. if their locations have changed, post to discord via webhook
// dont run this more than once every 15 minutes and even then that's probably pushing it.

// by cmdr rglx, v0.0.1

//  CONFIGURATION

if (process.argv.length != 7) {
	console.error("ERROR: wrong number of arguments given.")
	console.error("usage: "+ process.argv[0] + " " + process.argv[1] + " <inara squadron ID> <discord webhook ID> <discord webhook token> <discord thread ID> <discord webhook nickname>")
	console.error("  INARA squadron ID is the number in the URL of your squadron's page.")
	console.error("  Discord webhook ID is the first number on your webhook URL. typically about 16-20 numbers long.")
	console.error("  Discord webhook token is everything after the last / in the webhook URL. wrap in quotes.")
	process.exit(255)
}

const squadronId = process.argv[2]
const webhookId = process.argv[3]
const webhookToken = process.argv[4]
const webhookThreadId = process.argv[5]
const webhookNickname = process.argv[6]


console.log('loading dependencies')
const fs = require('fs'); // Built-in to nodejs
const path = require('path'); // Built-in to nodejs
const request = require('request'); // Install using npm
const package = require('./package.json')

webhookUrl = "https://discord.com/api/webhooks/" + webhookId + "/" + webhookToken +"?wait=true&thread_id=" + webhookThreadId + "&name=" + webhookNickname
console.log("webhook url: " + webhookUrl)
console.log("squadron id: " + squadronId)

// important variables - dont change these
const carrierListTableRowRegexp = /<tr><td class="lineright wrap">(?:<a href="(\/elite\/cmdr-fleetcarrier\/\d+\/\d+\/)">)?(.*?) <span class="minor">\((.*?)\)<\/span>(?:<\/a>)?<\/td><td class="lineright wrap"><a href="(\/elite\/starsystem\/\d*\/?)">(.*?)<\/a><\/td><td class="wrap"><a href="(\/elite\/cmdr\/\d+\/)">(.*?)<\/a><\/td><\/tr>/ig // splits table cells out
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

function getInaraPageAnonymously( page, callback ) { // Grab a whole page's HTML from INARA, and return it all as a string
	writeLog( 'Retrieving INARA page (anonymously) : https://inara.cz/' + page, 'HTTP' );
	try {
		request.get( {
			url: 'https://inara.cz/' + page, 
			headers: { 'User-Agent': package.description + " - carrier monitor" + ' v' + package.version + ' by ' + package.author },
			timeout: 30000
		}, ( error, response, body ) => {
			if ( error ) {
				callback( null );
				writeLog( 'Error retrieving INARA page: ' + error, 'HTTP' );
				throw error;
			}
			if ( body === undefined ) {
				callback( null );
				writeLog( 'General error retrieving INARA page!', 'HTTP' );
				throw 'General error retrieving INARA page!';
			}
			callback( body );
		} );
	} catch ( err ) {
		writeLog( 'Failed to retrieve INARA page: ' + err, 'HTTP' );
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
				'User-Agent': package.description + " - carrier monitor" + ' v' + package.version + ' by ' + package.author,
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
function parseInaraSquadronCarrierListing(pageText) {
	const carrierListing = {}
	pageText.replace(carrierListTableRowRegexp, (match, carrierPage, carrierName, carrierIdent, carrierLocationId, carrierLocation, carrierOwnerId, carrierOwner) => 
			carrierListing[carrierIdent] = {
				name: carrierName,
				location: carrierLocation,
				locationId: carrierLocationId,
				owner: carrierOwner,
				ownerId: carrierOwnerId,
				carrierPage: carrierPage,
				stationPage: "/elite/station/?search=" + carrierIdent
			}
		)
	return carrierListing
}
function loadCachedCarrierListing(squadronId,webhookId){
	writeLog("Loading cached carrier listing from file...","Cache")
	cacheData = {}
	try {
		let rawCacheData = fs.readFileSync("./cache/carriers-"+squadronId+".json")
		cacheData = JSON.parse(rawCacheData)
		writeLog("Loaded cache ok","Cache")
	} catch(error) {
		writeLog("Couldn't load cache. Assuming doesn't exist & making a new one.\n\t"+error,"Cache")
		saveCachedCarrierListing(squadronId,webhookId,{})
	}
	return cacheData
}

function saveCachedCarrierListing(squadronId,webhookId,carrierListing) {
	cacheToWrite = JSON.stringify(carrierListing)
	try {
		fs.writeFileSync("./cache/carriers-"+squadronId+".json",cacheToWrite)
	} catch (error) {
		writeLog("COULD NOT WRITE CACHE FILE!\n\t"+error,"CACHE ERROR")
	}
}
function findChangedCarrierLocations(currentCarrierListing, lastCarrierListing){
	for (const carrier of Object.keys(currentCarrierListing)) {
		writeLog("iterating through "+carrier,"CarrierComparison")
		currenttime = new Date().toISOString();
		timestamp = parseInt( currenttime.split( /-(.+)/, 2 )[ 0 ] ) + 1286 + '-' + currenttime.split( /-(.+)/, 2 )[ 1 ];
		let addEmbed = false
		const newEmbedToSend = {
			title: "Fleet Carrier *" +currentCarrierListing[carrier]["name"] + "*  (" +carrier+ ")",
			timestamp,
			color: 0x57D168,
			description: "*[ inexplicable carrier appearance ]*\n\nyou ... probably shouldn't be seeing this. contact rglx and let her know.",
		}
		if ( lastCarrierListing[carrier] === undefined ) {
			// completely new carrier. add to our list of outgoing embeds that this is a new carrier in the fleet
			newEmbedToSend["description"] = "**Joined the squadron!**\nCurrently in ["+currentCarrierListing[carrier]["location"]+"](<https://inara.cz"+currentCarrierListing[carrier]["locationId"]+">)"
			addEmbed = true
			writeLog("carrier "+carrier+" has JOINED THE SQUADRON. they're in "+currentCarrierListing[carrier]["location"]+", sending embed","CarrierComparison")
		} else {
			if (lastCarrierListing[carrier]["location"] !== currentCarrierListing[carrier]["location"] ) { 
				newEmbedToSend["description"] = "**Hyperspace jump complete!**\nConfirming arrival in ["+currentCarrierListing[carrier]["location"]+"](<https://inara.cz"+currentCarrierListing[carrier]["locationId"]+">)"
				addEmbed = true
				writeLog("carrier "+carrier+" has moved to "+currentCarrierListing[carrier]["location"]+", sending embed","CarrierComparison")
			}
		}
		newEmbedToSend["description"] += "\n\nOperator: [CMDR "+currentCarrierListing[carrier]["owner"]+"](<https://inara.cz"+currentCarrierListing[carrier]["ownerId"]+">)"
		if (addEmbed) {
			outgoingEmbeds.push(newEmbedToSend)
			//postToDiscordViaWebhook(newEmbedToSend, webhookResult => { console.log(webhookResult) })
		} else {
			writeLog("skipping "+ carrier + ", unchanged location.","CarrierComparison")
		}
	}

}

writeLog(package.description + " - carrier monitor" + ' v' + package.version + ' by ' + package.author +', starting up...',"Initialization")

currentCarrierListing = getInaraPageAnonymously("/elite/squadron-assets/?param1="+squadronId+"", inaraPageText => {

	currentCarrierListing = parseInaraSquadronCarrierListing(inaraPageText)
	lastCarrierListing = loadCachedCarrierListing(squadronId,webhookId)
	saveCachedCarrierListing(squadronId,webhookId,currentCarrierListing)
	findChangedCarrierLocations(currentCarrierListing,lastCarrierListing)
	console.log("outbound embeds: "+ outgoingEmbeds.length)
	if (outgoingEmbeds.length == 0) {
		writeLog("no outgoing messages for discord. skipping this time.","Discord API")	
	} else if ( outgoingEmbeds.length < 11 ) {
			writeLog("sending single batch of embeds...","Discord API")
		postToDiscordViaWebhook(outgoingEmbeds, webhookResult => { if (webhookResult) {writeLog("Something happened, API result below: ","Discord API");console.error(webhookResult)} })
	} else if (outgoingEmbeds.length > 10 ) {
		// have to split into multiple messages...
		for (let counter = 0; counter < outgoingEmbeds.length; counter=counter+10) {
			writeLog("sending batch of ten embeds starting with the "+counter+"th one...","Discord API")
			postToDiscordViaWebhook(outgoingEmbeds.slice(counter,counter+10), webhookResult => { 
				//if (webhookResult) {writeLog("Something happened, API result below: ","Discord API");console.error(webhookResult)}
			})
		}
	} else {
		writeLog("you should never see this message","Discord API")	
	}
	writeLog("all done! shutting down.","Shutdown")
})
