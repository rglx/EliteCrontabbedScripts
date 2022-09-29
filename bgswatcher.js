
if (process.argv.length != 7) {
	console.error("(-.---s)\tcore - main - ERROR: wrong number of arguments given.")
	console.error("\tusage: "+ process.argv[0] + " " + process.argv[1] + " <discord webhook ID> <discord webhook token> <discord thread ID> <endpoint> <search target>")
	process.exit(255)
}

const webhookId = process.argv[2]
const webhookToken = process.argv[3]
const webhookThreadId = process.argv[4]
const endpoint = process.argv[5]
const target = process.argv[6]

let lastTime = new Date()
 
console.log("(-.---s)\tcore - startup - loading dependencies")

const fs = require("node:fs"); // Built-in to nodejs
const path = require("node:path"); // Built-in to nodejs
const util = require("node:util"); // Built-in to nodejs
const request = require("request"); // Install using npm
const package = require("./package.json")

console.log("(-.---s)\tcore - startup - defining core functions")

function writeLogFancy ( system = "core", subsystem = "debug", message = null, writeToFile = true, isError = false) {
	// get difference in milliseconds since our last execution
	let currentTime = new Date()
	const timeDifference = currentTime.getTime() - lastTime.getTime()
	const timeDifferenceMilliseconds = ( timeDifference / 1000 ).toFixed(3) 
	
	// prefix error message with this
	const messagePrefix = "(" + timeDifferenceMilliseconds + " s)\t" + system + " - " + subsystem + " - "
	let wholeMessage = ""

	// write to console
	if ( isError === true ) {
		wholeMessage = messagePrefix + "ERROR: " + message
		console.error(wholeMessage)
	} else {
		wholeMessage = messagePrefix + message
		console.log(wholeMessage)
	}

	// write out to file (if we must)
	if ( writeToFile === true ) {
		fs.appendFileSync( path.basename( __filename ) + ".log", wholeMessage + "\n" );
	}

	// update our last timestamp
	lastTime = currentTime
}

function synchronousDownloadPage(requestData,requestMethod = request.get) {
	writeLogFancy("core","http","retrieving API result from: " + requestData.url)

	return new Promise((resolve, reject) => {
		requestMethod( requestData, (error, response, body) => {
			if (error) reject(error)
			if (response.statusCode != 200) {
				error = "Invalid status code from API: <" + response.statusCode + ">"
				reject(error)
			}
			resolve(body)
		})
	})
}

function loadCache(uniqueName) {
	writeLogFancy("file","cache","loading cached info from file...")
	cacheData = {}
	try {
		let rawCacheData = fs.readFileSync("./cache/bgsdata-"+uniqueName+".json")
		cacheData = JSON.parse(rawCacheData)
		writeLogFancy("file","cache","loaded cache ok")
	} catch(error) {
		writeLogFancy("file","cache","couldn't load cache. assuming doesn't exist & making a new one.\n\t"+error,true,true)
		saveCache(uniqueName,{})
	}
	return cacheData
}

function saveCache(uniqueName,cacheData) {
	writeLogFancy("file","cache","saving cached info to file...")
	cacheToWrite = JSON.stringify(cacheData)
	try {
		fs.writeFileSync("./cache/bgsdata-"+uniqueName+".json",cacheToWrite)
	} catch (error) {
		writeLogFancy("file","cache","COULD NOT WRITE CACHE FILE!\n\t"+error,"CACHE ERROR")
	}
}

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

function acronymifyText(text) { 
	let returnValue = "";
	const words = text.split(" ")
	for ( let i=0; i < words.length; i++ ) {
		returnValue += words[i][0]
	}
	return returnValue
}

function translateFdevId(text) {
	text = text.toLowerCase()
	// the best way to really do this is submodule the EDCD FDevIDs repository and parse the CSVs
	const fdevIds = {
		"$faction_happinessband1;": "elated",
		"$faction_happinessband2;": "happy",
		"$faction_happinessband3;": "discontented",
		"$faction_happinessband4;": "unhappy",
		"$faction_happinessband5;": "despondent",
		"$government_anarchy;": "anarchy",
		"$government_communism;": "communism",
		"$government_confederacy;": "confederacy",
		"$government_cooperative;": "cooperative",
		"$government_corporate;": "corporate",
		"$government_democracy;": "democracy",
		"$government_dictatorship;": "dictatorship",
		"$government_feudal;": "feudal",
		"$government_imperial;": "imperial",
		"$government_none;": "none",
		"$government_patronage;": "patronage",
		"$government_prisoncolony;": "prison colony",
		"$government_theocracy;": "theocracy",
		"$government_engineer;": "engineer",
		"$government_carrier;": "private ownership",
		"none": "none",
		"boom": "boom",
		"bust": "bust",
		"civilunrest": "civil unrest",
		"civilwar": "civil war",
		"election": "election",
		"expansion": "expansion",
		"famine": "famine",
		"investment": "investment",
		"lockdown": "lockdown",
		"outbreak": "outbreak",
		"retreat": "retreat",
		"war": "war",
		"civilliberty": "civil liberty",
		"pirateattack": "pirate attack",
		"blight": "blight",
		"drought": "drought",
		"infrastructurefailure": "infrastructure failure",
		"naturaldisaster": "natural disaster",
		"publicholiday": "public holiday",
		"terrorism": "terrorist attack",
		"coldwar": "cold war",
		"colonisation": "colonisation",
		"historicevent": "historic event",
		"revolution": "revolution",
		"technologicalleap": "technological leap",
		"tradewar": "trade war",
		"$economy_agri;": "agriculture",
		"$economy_colony;": "colony",
		"$economy_extraction;": "extraction",
		"$economy_hightech;": "high tech",
		"$economy_industrial;": "industrial",
		"$economy_military;": "military",
		"$economy_none;": "none",
		"$economy_refinery;": "refinery",
		"$economy_service;": "service",
		"$economy_terraforming;": "terraforming",
		"$economy_tourism;": "tourism",
		"$economy_prison;": "prison",
		"$economy_damaged;": "damaged",
		"$economy_rescue;": "rescue",
		"$economy_repair;": "repair",
		"$economy_carrier;": "private enterprise",
		"$economy_engineer;": "engineering",
		"$galaxy_map_info_state_anarchy;": "anarchy",
		"$galaxy_map_info_state_lawless;": "lawless",
		"$system_security_high;": "high",
		"$system_security_low;": "low",
		"$system_security_medium;": "medium"
	}

	if ( fdevIds[text] ) { 
		return fdevIds[text]
	} else {
		writeLogFancy("decode","fdevid","FDev ID '"+text+"' couldn't be decoded!",true,true)
		return text
	}
}

async function generateSystemReport() {

	// system information report

	// get basic info about the system
	const systemInfoRequest = {
		url: "https://elitebgs.app/api" + "/ebgs/v5/systems?name=" + encodeURI(target),
		headers: { "User-Agent": package.description + " - bgs change monitor" + " v" + package.version + " by " + package.author },
		timeout: 30000
	}
	var systemInfo
	var systemFactionInfo

	try {
		systemInfo = JSON.parse( await synchronousDownloadPage(systemInfoRequest) )
		writeLogFancy("main", "system report", "retrieved system info")
	} catch (error) {
		writeLogFancy("main", "system report", "error querying API: " + error,true,true)
		process.exit(1)
	}
	if ( systemInfo.docs[0] === undefined ) {
		err = "system info API decode failed- is this not JSON?"
		writeLogFancy("main", "system report", "error parsing API result: " + err,true,true)
		process.exit(1)
	}

	if ( target !== systemInfo.docs[0].name ) {
		err = "received information for a system that isn't what we asked for. was the name entered correctly & case sensitive? received: '"+ systemInfo.docs[0].name + "'"
		writeLogFancy("main", "system report", err,true,true)
		process.exit(253)
	}

	// get more information about the factions in-system
	const systemFactionInfoRequest = {
		url: "https://elitebgs.app/api" + "/ebgs/v5/factions?system=" + encodeURI(systemInfo.docs[0].name),
		headers: { "User-Agent": package.description + " - bgs change monitor" + " v" + package.version + " by " + package.author },
		timeout: 30000
	}

	try {
		systemFactionInfo = JSON.parse( await synchronousDownloadPage(systemFactionInfoRequest) )
		writeLogFancy("main", "system report", "retrieved system's factions' info")
	} catch (error) {
		writeLogFancy("main", "system report", "error querying API: " + error,true,true)
		process.exit(1)
	}
	if ( systemFactionInfo === null ) {
		err = "systems faction info API decode failed- is this not JSON?"
		writeLogFancy("main", "system report", "error parsing API result: " + err)
		process.exit(1)
	}

	// clean up system info and merge into one array
	for ( let i = 0; i < systemFactionInfo.docs.length; i++ ) {
		// iterate through the factions present in the system
		for ( let j = 0; j < systemFactionInfo.docs[i].faction_presence.length; j++ ) {
			// delete faction info timestamps
			delete systemFactionInfo.docs[i].faction_presence[j].updated_at
			if ( systemFactionInfo.docs[i].faction_presence[j].system_name == systemInfo.docs[0].name ) {
				// overwrite the entire faction presences with only the one we want
				systemFactionInfo.docs[i].faction_presence = systemFactionInfo.docs[i].faction_presence[j]
			}
		}
		// remove the faction info timestamps. if someone updates the system, the main timestamp for the system should update as well.
		delete systemFactionInfo.docs[i].updated_at
	}

	// overwrite the systeminfo factions with the complete factions page which includes their influences
	systemInfo.docs[0].factions = systemFactionInfo.docs
	systemInfo = systemInfo.docs[0]
	const systemInfoTimestamp = new Date(systemInfo.updated_at)
	delete systemFactionInfo

	// now, compare to our cached data to figure out if we need to do anything

	// load the cache
	cacheData = loadCache("system-" + webhookId + "-" + systemInfo.name)

	// strip timestamps so the arrays match
	systemInfoWithoutTimestamp = systemInfo
	delete systemInfoWithoutTimestamp.updated_at
	cacheDataWithoutTimestamp = cacheData
	delete cacheDataWithoutTimestamp.updated_at

	// actually do the comparison
	if ( JSON.stringify(systemInfoWithoutTimestamp) != JSON.stringify(cacheDataWithoutTimestamp) ) {
		writeLogFancy("main", "system report", "cache data does NOT match. stashing our copy.")
		// cache data differs from what we just received, meaning something has changed and it wasn't just the timestamp.
		saveCache("system-" + webhookId + "-" + systemInfo.name,systemInfo)
	} else {
		// cache data is identical. we can bail full-stop
		writeLogFancy("main", "system report", "cache data matches. ignoring & bailing out",true,true)
		process.exit(0)
	}

	embedsToSend = []

	writeLogFancy("main", "system report", "preparing discord embed...")

	embedTime = new Date().toISOString()
	timestamp = parseInt( embedTime.split( /-(.+)/, 2 )[ 0 ] ) + 1286 + "-" + embedTime.split( /-(.+)/, 2 )[ 1 ]

	let conflictsReport = "";
	for ( let i = 0; i < systemInfo.conflicts.length; i++) {
		writeLogFancy("parsing","system reports","catalogued a " + systemInfo.conflicts[i].status + " " + systemInfo.conflicts[i].type + " between " + acronymifyText(systemInfo.conflicts[i].faction1.name) + " & " + acronymifyText(systemInfo.conflicts[i].faction2.name) )
		conflictsReport += "**⚠️ "
		conflictsReport += systemInfo.conflicts[i].status
		conflictsReport += " "
		conflictsReport += systemInfo.conflicts[i].type
		conflictsReport += "**, "
		conflictsReport += acronymifyText(systemInfo.conflicts[i].faction1.name)
		conflictsReport += " vs "
		conflictsReport += acronymifyText(systemInfo.conflicts[i].faction2.name)
		conflictsReport += "\n"
	}

	let returnedEmbed = {
		title: "BGS status update for " + systemInfo.name,
		description: "Updated: <t:"+Math.floor(systemInfoTimestamp.getTime() / 1000)+":R>",
		timestamp,
		url: "https://elitebgs.app/systems/" + systemInfo._id,
		color: 0xff9800,
		fields: [
			{
				name: "__Demographics__",
				value: "State: `" + translateFdevId(systemInfo.state) + "`\nSecurity: `" + translateFdevId(systemInfo.security) + "`\nGovernment: `" + translateFdevId(systemInfo.government) + "`\nAllegiance: `" + translateFdevId(systemInfo.allegiance) + "`",
				inline: true	
			},
			{
				name: "__Conflicts: `" + systemInfo.conflicts.length + "`__",
				value: conflictsReport,
				inline: true
			},
			{
				name: "__Factions: `" + systemInfo.factions.length + "`__",
				value: "__                                         __",
				inline: false
			}
		]
	}

	for ( let i = 0; i < systemInfo.factions.length; i++ ) {
		writeLogFancy("parsing","system reports","catalogued a faction: "+ systemInfo.factions[i].name)
		// iterate through factions
		newField = {}
		newField.name = "`" + acronymifyText(systemInfo.factions[i].name) + "` - " + systemInfo.factions[i].name
		newField.value = ""
		newField.inline = true

		// add more details
		
		newField.value += "Influence: `" + (systemInfo.factions[i].faction_presence.influence * 100).toFixed(1) + "%`\n"
		newField.value += "Happiness: `" + translateFdevId(systemInfo.factions[i].faction_presence.happiness) + "`\n"
		newField.value += "States: `" + translateFdevId(systemInfo.factions[i].faction_presence.state) + "`"
		if (systemInfo.factions[i].faction_presence.active_states.length != 0) {
			// append local state info
			for ( let j = 0; j < systemInfo.factions[i].faction_presence.active_states.length; j++) {
			// skip reporting this additional state if it matches the local faction state already
				if (translateFdevId(systemInfo.factions[i].faction_presence.active_states[j].state) != translateFdevId(systemInfo.factions[i].faction_presence.state)) {
					newField.value += " & "
					// append the name of the state
					newField.value += "`" + translateFdevId(systemInfo.factions[i].faction_presence.active_states[j].state) + "`"
				}
			}
		}
		if (systemInfo.factions[i].faction_presence.pending_states.length != 0) {
			// append local state info
			newField.value += "\n⚠️ pending "
			for ( let j = 0; j < systemInfo.factions[i].faction_presence.pending_states.length; j++) {
				if ( j > 0 ) {
					// add a comma and space if it's not the first one
					newField.value += " & "
				}
				// append the name of the state
				newField.value += "`" + translateFdevId(systemInfo.factions[i].faction_presence.pending_states[j].state) + "`"
			}
		}
		if (systemInfo.factions[i].faction_presence.recovering_states.length != 0) {
			// append local state info
			newField.value += "\n🔄 recovering "
			for ( let j = 0; j < systemInfo.factions[i].faction_presence.recovering_states.length; j++) {
				if ( j > 0 ) {
					// add a comma and space if it's not the first one
					newField.value += " & "
				}
				// append the name of the state
				newField.value += "`" + translateFdevId(systemInfo.factions[i].faction_presence.recovering_states[j].state) + "`"
			}
		}



		returnedEmbed.fields.push(newField)
	}
	// prepare webhook
	let discordApiRequest = {
		url: "https://discord.com/api/webhooks/" + webhookId + "/" + webhookToken + "?wait=true&thread_id=" + webhookThreadId,
		headers: {
			"User-Agent": package.description + " - bgs change monitor" + " v" + package.version + " by " + package.author,
			//"Content-Type": "application/json"
		},
		timeout: 3000,
		json: {
			username: "BGS monitoring for " + systemInfo.name,
			embeds: [ returnedEmbed ],
		},
	}
	console.log(discordApiRequest)
	console.log(discordApiRequest.json.embeds[0])
	try {
		discordApiResult = JSON.parse( await synchronousDownloadPage(discordApiRequest,request.post) )
		writeLogFancy("main", "system report", "webhook embed successfully sent, API result below:")
		console.log(discordApiResult)
	} catch (error) {
		writeLogFancy("main", "system report", "error sending webhook embed: " + error,true,true)
		process.exit(1)
	}
}

async function generateFactionReport() {
	// timestamp for the embed
	embedTime = new Date().toISOString()
	timestamp = parseInt( embedTime.split( /-(.+)/, 2 )[ 0 ] ) + 1286 + "-" + embedTime.split( /-(.+)/, 2 )[ 1 ]

	// retrieve entire page of info about our faction
	var factionInfo
	const factionInfoRequest = {
		url: "https://elitebgs.app/api" + "/ebgs/v5/factions?name=" + encodeURI(target),
		headers: { "User-Agent": package.description + " - bgs change monitor" + " v" + package.version + " by " + package.author },
		timeout: 30000
	}

	try {
		factionInfo = JSON.parse( await synchronousDownloadPage(factionInfoRequest) )
		writeLogFancy("main","faction report","retrieved faction "+target+"'s BGS info")
	} catch (error) {
		writeLogFancy("main", "faction report", "error querying API: " + error,true,true)
		process.exit(1)
	}
	if ( factionInfo === null ) {
		err = "faction info API decode failed- is this not JSON?"
		writeLogFancy("main", "faction report", "error parsing API result: " + err)
		process.exit(1)
	}
	if ( factionInfo.docs[0].name === undefined ) {
		err = "API returned no results."
		writeLogFancy("main", "faction report",  err)
		process.exit(1)
	} else if ( factionInfo.docs[0].name !== target ) {
		err = "API returned results for wrong faction, a '" + factionInfo.docs[0].name + "'"
		writeLogFancy("main", "faction report",  err)
		process.exit(1)
	}

	factionInfo = factionInfo.docs[0]

	// retrieve last tick info so we can see if what we have is up to date
	var lastTickInfo
	const lastTickInfoRequest = {
		url: "https://elitebgs.app/api" + "/ebgs/v5/ticks",
		headers: { "User-Agent": package.description + " - bgs change monitor" + " v" + package.version + " by " + package.author },
		timeout: 30000
	}
	try {
		lastTickInfo = JSON.parse( await synchronousDownloadPage(lastTickInfoRequest) )
		writeLogFancy("main", "faction report", "retrieved galactic tick info")
	} catch (error) {
		writeLogFancy("main", "faction report", "error querying API: " + error,true,true)
		process.exit(1)
	}

	const lastTick = new Date(lastTickInfo[0].updated_at)
	const factionUpdateTime = new Date(factionInfo.updated_at)
	delete factionInfo.updated_at
	writeLogFancy("main", "faction report", "faction info was updated " + ( ( ( ( factionUpdateTime - lastTick ) / 1000 ) / 60 ) / 60 ).toFixed(2)  + " hours after tick") // difference in hours

	if ( ( factionUpdateTime - lastTick ) < 0 ) {
		writeLogFancy("main", "faction report", "entire faction info page has not been updated since the tick. bailing.",true,true)
		process.exit(253)
	} else {
		writeLogFancy("main", "faction report", "parts of the faction's information have been updated.")
	}

	returnedEmbed = {
		title: "BGS status update for " + factionInfo.name,
		description: "Updated: <t:"+Math.floor(factionUpdateTime.getTime() / 1000)+":R>",
		timestamp,
		url: "https://elitebgs.app/factions/" + factionInfo._id,
		color: 0xff9800,
		fields: [
			{	
				name: "__Demographics__",
				value: "Allegiance: `"+translateFdevId(factionInfo.allegiance)+"`\nGovernment: `"+translateFdevId(factionInfo.government)+"`",
				inline:true
			},
			{	
				name: "__Conflicts Report__",
				value: "conflicts report should go here - if you see this something is very wrong",
				inline:false
			},
			{	
				name: "__Systems presence: `" + factionInfo.faction_presence.length + "`__",
				value: "__        __",
				inline:false
			}
		]
	}

	let conflictsReport = ""
	let conflictsCounter = 0
	let staleSystemsList = []
	for ( let i = 0; i < factionInfo.faction_presence.length; i++) {
		// if the data is stale, clobber this whole thing over with a note saying so.
		let factionSystemInfoTimestamp = new Date(factionInfo.faction_presence[i].updated_at)
		delete factionInfo.faction_presence[i].updated_at
		if ( ( factionSystemInfoTimestamp - lastTick ) < 0 ) {
			staleSystemsList.push("`" + factionInfo.faction_presence[i].system_name + "`")
		} else {
			// iterate through each factions' presence in each system
			newField = {
				name: factionInfo.faction_presence[i].system_name,
				value: "",
				inline: true
			}
			newField.value += "**" +(factionInfo.faction_presence[i].influence * 100).toFixed(1) + "%**, "
			newField.value += translateFdevId(factionInfo.faction_presence[i].happiness) + "\n"
			newField.value += "*updated <t:"+Math.floor(factionSystemInfoTimestamp.getTime() / 1000)+":R>*"
			if ( translateFdevId(factionInfo.faction_presence[i].state) !== "none" ) {
				newField.value += "\n**in `"+translateFdevId(factionInfo.faction_presence[i].state)+"`**"
			} else {
				newField.value += "\n**no active state**"
			}

			if ( factionInfo.faction_presence[i].active_states !== [] ) {
				for ( let j = 0; j < factionInfo.faction_presence[i].active_states.length; j++ ) {
					if ( factionInfo.faction_presence[i].active_states[j].state !== factionInfo.faction_presence[i].state ) {
						newField.value += " & " + translateFdevId(factionInfo.faction_presence[i].active_states[j].state)
					}
				}
			}
			if ( factionInfo.faction_presence[i].pending_states !== [] ) {
				for ( let j = 0; j < factionInfo.faction_presence[i].pending_states.length; j++ ) {
					if ( j > 0 ) {
						newField.value += " & "
					} else {
						newField.value += "\n⚠️ pending "
					}
					newField.value += translateFdevId(factionInfo.faction_presence[i].pending_states[j].state)
				}
			}
			if ( factionInfo.faction_presence[i].recovering_states !== [] ) {
				for ( let j = 0; j < factionInfo.faction_presence[i].recovering_states.length; j++ ) {
					if ( j > 0 ) {
						newField.value += " & "
					} else {
						newField.value += "\n🔄 recovering "
					}
					newField.value += translateFdevId(factionInfo.faction_presence[i].recovering_states[j].state)	
				}
			}

			if ( factionInfo.faction_presence[i].conflicts !== [] ) {
				for ( let j = 0; j < factionInfo.faction_presence[i].conflicts.length; j++ ) {
					conflictsCounter++
					conflictsReport += factionInfo.faction_presence[i].conflicts[j].status + " " + factionInfo.faction_presence[i].conflicts[j].type + " in " + factionInfo.faction_presence[i].system_name + " vs " + acronymifyText(factionInfo.faction_presence[i].conflicts[j].opponent_name)
					if (factionInfo.faction_presence[i].conflicts[j].stake === "" ) {
						conflictsReport += ", staking nothing"
					} else {
						conflictsReport += ", staking " + factionInfo.faction_presence[i].conflicts[j].stake
					}
					conflictsReport += ", " + factionInfo.faction_presence[i].conflicts[j].days_won + " won\n"
				}
			}

			returnedEmbed.fields.push(newField)
		}

	}

	// load the cache
	cacheData = loadCache("faction-" + webhookId + "-" + factionInfo.name)

	// actually do the comparison
	if ( JSON.stringify(factionInfo) != JSON.stringify(cacheData) ) {
		writeLogFancy("main", "faction report", "cache data does NOT match. stashing our copy.")
		// cache data differs from what we just received, meaning something has changed and it wasn't just the timestamp.
		saveCache("faction-" + webhookId + "-" + factionInfo.name,factionInfo)
	} else {
		// cache data is identical. we can bail full-stop
		writeLogFancy("main", "faction report", "cache data matches. ignoring & bailing out",true,true)
		process.exit(0)
	}

	returnedEmbed.fields[2].value = "🛑 stale system data: " + staleSystemsList.join(", ")
	returnedEmbed.fields[1].name = "__Conflicts of this faction: `" + conflictsCounter + "`__"
	returnedEmbed.fields[1].value = conflictsReport

	// split out more than 25 fields into its own embed.
	var returnedEmbeds = []
	if ( returnedEmbed.fields.length > 25 ) {
		writeLogFancy("main","discord preprocessing","splitting out the fields into multiple embeds...")
		allFields = returnedEmbed.fields
		returnedEmbed.fields = allFields.slice(0,24)
		returnedEmbeds = [ returnedEmbed ]
		for (let counter = 24; counter < allFields.length; counter=counter+25) {
			returnedEmbeds.push({author:{name:"... continued from previous page"},color:returnedEmbeds[0].color,fields: allFields.slice(counter,counter+25)})
		}
	} else {
		returnedEmbeds = [ returnedEmbed ]
	}
	
	// prepare webhook
	let discordApiRequest = {
		url: "https://discord.com/api/webhooks/" + webhookId + "/" + webhookToken + "?wait=true&thread_id=" + webhookThreadId,
		headers: {
			"User-Agent": package.description + " - bgs change monitor" + " v" + package.version + " by " + package.author,
			//"Content-Type": "application/json"
		},
		timeout: 3000,
		json: {
			username: "BGS monitoring for " + factionInfo.name,
			embeds: returnedEmbeds,
		},
	}

	try {
		discordApiResult = JSON.parse( await synchronousDownloadPage(discordApiRequest,request.post) )
		writeLogFancy("main", "faction report", "webhook embed successfully sent, API result below:")
		console.log(discordApiResult)
	} catch (error) {
		writeLogFancy("main", "faction report", "error sending webhook embed: " + error,true,true)
		process.exit(1)
	}
}

writeLogFancy("core","startup",package.description + " - bgs change monitor" + " v" + package.version + " by " + package.author + ", starting up!")

function main () {
	switch ( endpoint ) {
		case "system":
			generateSystemReport()
			break;
		case "faction":
			generateFactionReport()
			break;
		default:
			console.error("(-.---s)\tcore - main - ERROR: specify either 'system' or 'faction' for the fourth argument.")
			process.exit(255)
			break;
	}
}

main()