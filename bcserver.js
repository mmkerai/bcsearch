// Boldchat test script for Nodejs
//******** Set up Express Server and socket.io
var http = require('http');
var https = require('https');
var path = require('path');
var app = require('express')();
var fs = require('fs');
var crypto = require('crypto');
var mysql = require('mysql');
var Big = require('big.js');
var bodyParser = require('body-parser');
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

/*const options = {
  pfx: fs.readFileSync('cert\BoldChat.pfx');
};

server = https.createServer(options, app).listen(443);
*/
var PORT = Number(8080);
var server = http.createServer(app).listen(PORT);
var	io = require('socket.io').listen(server);
	
//*********** Global variables
var EnVars;
var AID;
var SETTINGSID;
var KEY;
var TZONE;
var TOFFSET;
var MYSQLUSER;
var MYSQLPWD;
var MYSQLDBNAME;	
var MYSQLIP; 
	
//**********
var	Departments;	// array of dept ids and dept name objects
var	Operators;		// array of operator ids and name objectsvar
var Folders;		// folder id and names object
var UserCategories;
var UserStatuses;
var ApiDataNotReady;	// Flag to show when all Api data has been downloaded so that chat data download can begin
var TimeNow;
var EndOfDay;
var LastTime;
var ChatConnector;
var CHATDB = "CHATS";
var ARCHIVEDB = "ARCHIVE";

//******* Global class for chat data
var ChatData = function(chatid) {
		this.ChatId = Big(chatid);	// Big is necessary as normal javascript Integer only goes up to 16 digits
		this.DepartmentId = 0;
		this.OperatorId = 0;	// operator id of this chat
		this.UserCategoryId = 0;	// category id of this chat
		this.UserStatusId = 0;	// status id of this chat
		this.Started = 0;		// times ISO times must be converted to epoch (milliseconds since 1 Jan 1970)
		this.Answered = 0;			// so it is easy to do the calculations
		this.Ended = 0;
		this.VisitName = "";
		this.VisitInfo = "";
		this.VisitRef = "";
		this.VisitPhone = "";
		this.ChatUrl = "";
};

var Tmessage = function(cr,na,tx) {
		this.Created = cr;
		this.Name = na;
		this.Text = tx;
};

var TranscriptData = function(chatid) {
		this.ChatId = Big(chatid);
		this.Transcript = new Array();
};

try
{
	console.log("Reading API variables from config.json file...");
	EnVars = JSON.parse(fs.readFileSync('config.json', 'utf8'));
	AID = EnVars.AID || 0;
	SETTINGSID = EnVars.APISETTINGSID || 0;
	KEY = EnVars.APIKEY || 0;
//	TZONE = EnVars.TIMEZONE || GMT;
	MYSQLUSER = EnVars.MYSQLUSER || 0;
	MYSQLPWD = EnVars.MYSQLPWD || 0;
	MYSQLDBNAME = EnVars.MYSQLDATABASE || 0;	
	MYSQLIP = EnVars.MYSQLIPADDRESS || 0;	
}
catch (e)
{
	console.log("Error code: "+e.code);
}

if(AID == 0 || SETTINGSID == 0 || KEY == 0)
{
	console.log("BoldChat API Credentials not set. Terminating!");
	process.exit(1);
}

if(MYSQLUSER == 0 || MYSQLPWD == 0 || MYSQLDBNAME == 0 || MYSQLIP == 0)
{
	console.log("Mysql Database Credentials not set. Terminating!");
	process.exit(1);
}

console.log("Config loaded successfully");

//********************************* Callbacks for all URL requests
app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

app.get('/index.css', function(req, res){
	res.sendFile(__dirname + '/index.css');
});
app.get('/index.js', function(req, res){
	res.sendFile(__dirname + '/index.js');
});

app.get('/EurobetPanel.html', function(req, res){
	res.sendFile(__dirname + '/EurobetPanel.html');
});
app.get('/admin.html', function(req, res){
	res.sendFile(__dirname + '/admin.html');
});
app.get('/chosen-sprite.png', function(req, res){
	res.sendFile(__dirname + '/chosen-sprite.png');
});
app.get('/chosen-sprite@2x.png', function(req, res){
	res.sendFile(__dirname + '/chosen-sprite@2x.png');
});
app.get('/bc_eurobet.js', function(req, res){
	res.sendFile(__dirname + '/bc_eurobet.js');
});
app.get('/favicon.ico', function(req, res){
	res.sendFile(__dirname + '/favicon.ico');
});
app.get('/posttest.html', function(req, res){
	res.sendFile(__dirname + '/posttest.html');
});
app.get('/jquery-ui-1.12.0/*', function(req, res){
	res.sendFile(__dirname + req.path);
});

// Process incoming Boldchat triggered operator data
app.post('/chat-ended', function(req, res){ 
	debugLog("chat ended post message ",req.body);
//	if(validateSignature(req.body, TriggerDomain+'/chat-ended'))
		saveChatToDB(req.body);

	res.send({ "result": "success" });
});

var pool = mysql.createPool({
	host     : MYSQLIP,
	user     : MYSQLUSER,
	password : MYSQLPWD,
	database : MYSQLDBNAME,
    connectionLimit : 100, //important
	acquireTimeout: 30000,
	supportBigNumbers : true,
	waitForConnections : true
});

function saveChatToDB(data) {

	if(data === null || typeof data === 'undefined')
		return;
	
	if(data.OperatorID === null || data.OperatorID === "")
		return;				// not interested if chat wasnt answered
	var chat = new ChatData(data.ChatID);
	chat.OperatorId = data.OperatorID.substring(0,20);
	if(data.DepartmentID)
		chat.DepartmentId = data.DepartmentID.substring(0,20);
	if(data.UserCategoryID)
		chat.UserCategoryId = data.UserCategoryID.substring(0,20);
	if(data.UserStatusID)
		chat.UserStatusId = data.UserStatusID.substring(0,20);
	if(data.ChatUrl)
		chat.ChatUrl = data.ChatUrl.substring(0,256);
	if(data.ChatName)
		chat.VisitName =  data.ChatName.substring(0,32);
	if(data.VisitRef)
		chat.VisitRef = data.VisitRef.substring(0,32);
	if(data.VisitInfo)
		chat.VisitInfo = data.VisitInfo.substring(0,32);
	if(data.VisitPhone)
		chat.VisitPhone = data.VisitPhone.substring(0,32);
	chat.Started = new Date(data.Started);
	chat.Answered = new Date(data.Answered);
	chat.Ended = new Date(data.Ended);
	
	pool.getConnection(function(err, connection)
	{
		if(err)
		{
			debugLog("SQL connection error",err);
			return;
		} 		
//		console.log('connected as id ' + connection.threadId);
 
		connection.query('INSERT INTO '+CHATDB+' SET ?',chat,function(err, result)
		{
			connection.release();
			if(err)
				debugLog("SQL query error",err);

			console.log("Chat saved ID: "+chat.ChatId);			
		});
		
		connection.on('error', function(err)
		{
			connection.release();
			debugLog("SQL on error",err);
			return;
        });
	});
}

function sleep(milliseconds) {
  var start = new Date().getTime();
  for(var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

function BC_API_Request(api_method,params,callBackFunction) {
	var auth = AID + ':' + SETTINGSID + ':' + (new Date()).getTime();
	var authHash = auth + ':' + crypto.createHash('sha512').update(auth + KEY).digest('hex');
	var options = {
		host : 'api.boldchat.com', 
		port : 443, 
		path : '/aid/'+AID+'/data/rest/json/v1/'+api_method+'?auth='+authHash+'&'+params, 
		method : 'GET'
		};
	https.request(options, callBackFunction).end();
}

function debugLog(name, dataobj) {
	console.log(name+": ");
	for(key in dataobj) {
		if(dataobj.hasOwnProperty(key))
			if(key == 'ChatId')
				console.log(key +":"+Big(dataobj[key]));
			else
				console.log(key +":"+dataobj[key]);
	}
}

// this function calls API again if data is truncated
function loadNext(method,next,callback,cbparam) {
	var str = [];
	for(var key in next) {
		if (next.hasOwnProperty(key)) {
			str.push(encodeURIComponent(key) + "=" + encodeURIComponent(next[key]));
		}
	}
	getApiData(method,str.join("&"),callback,cbparam);
}

// calls extraction API and receives JSON objects which are processed by the callback method
function getApiData(method,params,fcallback,cbparam) {
	ApiDataNotReady++;		// flag to track api calls
	BC_API_Request(method, params, function (response) {
		var str = '';
		//another chunk of data has been received, so append it to `str`
		response.on('data', function (chunk) {
			str += chunk;
		});
		//the whole response has been received, take final action.
		response.on('end', function () {
			ApiDataNotReady--;
			var jsonObj;
			try {
				jsonObj = JSON.parse(str);
			}
			catch (e){
				console.log("API or JSON error: "+e.message);
				process.exit(1);
			}
			var data = new Array();
			data = jsonObj.Data;
			if(typeof data == 'undefined' || data == null)
			{
				console.log("No JSON data field: "+str);
				return;		// exit out if error json message received
			}
			fcallback(data,cbparam);
			
			var next = jsonObj.Next;
			if(typeof next !== 'undefined') 
			{
				loadNext(method,next,fcallback,cbparam);
			}
		});
		// in case there is a html error
		response.on('error', function(err) {
		// handle errors with the request itself
		console.error("Error with the request: ", err.message);
		ApiDataNotReady--;
		});
	});
}

function deptsCallback(dlist) {
	for(var i in dlist) 
	{
		Departments[dlist[i].DepartmentID] = dlist[i].Name;
	}
	console.log("No of Depts: "+Object.keys(Departments).length);
}

function foldersCallback(dlist) {
	for(var i in dlist) 
	{
		Folders[dlist[i].FolderID] = dlist[i].Name;
	}
	console.log("No of Folders: "+Object.keys(Folders).length);
}

function userCategoriesCallback(dlist) {
	for(var i in dlist) 
	{
		UserCategories[dlist[i].SetupItemID] = dlist[i].Name;
	}
	console.log("No of User Categories: "+Object.keys(UserCategories).length);
}

function userStatusesCallback(dlist) {
	for(var i in dlist) 
	{
		UserStatuses[dlist[i].SetupItemID] = dlist[i].Name;
	}
	console.log("No of User Statuses: "+Object.keys(UserStatuses).length);
}

function operatorsCallback(dlist) {
	for(var i in dlist) 
	{
		Operators[dlist[i].LoginID] = dlist[i].Name;
	}
	console.log("No of Operators: "+Object.keys(Operators).length);
}

function updateTableCallback(res, sock) {
	debugLog("SQL Query Result",res);
}

/* No longer used. Using mysql pools instead.
function getDBConnector() {
	var con = new mysql.createConnection({
		host     : MYSQLIP,
		user     : MYSQLUSER,
		password : MYSQLPWD,
		database : MYSQLDBNAME,
		supportBigNumbers : true
	});
	return(con);
}*/

function inactiveChatsCallback(dlist) {
	console.log("No of chats in folder: "+ dlist.length);
	for(var i in dlist) 
	{
		saveChatToDB(dlist[i]);		// save to DB
		sleep(100);	// a breather in case there are lots
	}
}

function chatTranscriptCallback(dlist,tsocket) {
	console.log("No of chat messages: "+ dlist.length);
	if(dlist.length <= 0)
	{
		tsocket.emit("errorResponse","No chat transcript data for this chat ID");
		return;
	}
	
	var tdata = new TranscriptData(dlist[0].ChatID);
	for(var i in dlist) 
	{
		var tm = new Tmessage(dlist[i].Created,dlist[i].Name,dlist[i].Text);
		tdata.Transcript.push(tm);
	}
	tsocket.emit("getTranscriptResponse",tdata);
}

function getChatsViaAPI(from, to) {
//	console.log("Getting inactive chat info from "+from.toISOString()+" to "+to.toISOString());					
	console.log("Getting inactive chat info from "+from+" to "+to);					
	var parameters;
	for(var fid in Folders)	// Inactive chats are by folders
	{
//		parameters = "FolderID="+fid+"&FromDate="+from.toISOString()+"&ToDate="+to.toISOString();
		parameters = "FolderID="+fid+"&FromDate="+from+"&ToDate="+to;
		console.log("Getting chats for folder: "+Folders[fid]);
		getApiData("getInactiveChats", parameters, inactiveChatsCallback);
		sleep(100);
	}
}

function getTranscriptViaAPI(chatid,socket) {
	console.log("Getting chat transcript for chat id: "+chatid);					
	var parameters = "ChatID="+chatid;
	getApiData("getChatMessages",parameters,chatTranscriptCallback,socket);
}

function buildSearchQuery(sobj,thisSocket) {
	var searchp = new Array();
	var sq = "SELECT * FROM "+CHATDB+" WHERE ";
	
	if(typeof sobj.FromDate !== 'undefined' && sobj.FromDate !== null && sobj.FromDate !== "")
	{
		var fromd = convertDate(sobj.FromDate,thisSocket);
		console.log("From Date is: "+sobj.FromDate+" or "+fromd);
		searchp.push("Started >= '"+fromd+"'");
	}
	if(typeof sobj.ToDate !== 'undefined' && sobj.ToDate !== null && sobj.ToDate !== "")
	{
		var tod = convertDate(sobj.ToDate,thisSocket);
		console.log("To Date is: "+sobj.ToDate+" or "+tod);
		searchp.push("Started <= '"+tod+"'");
	}
	if(typeof sobj.VisitName !== 'undefined' && sobj.VisitName !== null && sobj.VisitName !== "")
		searchp.push("VisitName LIKE '%"+sobj.VisitName+"%'");
	if(typeof sobj.VisitRef !== 'undefined' && sobj.VisitRef !== null && sobj.VisitRef !== "")
		searchp.push("VisitRef LIKE '%"+sobj.VisitRef+"%'");
	if(typeof sobj.VisitInfo !== 'undefined' && sobj.VisitInfo !== null && sobj.VisitInfo !== "")
		searchp.push("VisitInfo LIKE '%"+sobj.VisitInfo+"%'");
	if(typeof sobj.VisitPhone !== 'undefined' && sobj.VisitPhone !== null && sobj.VisitPhone !== "")
		searchp.push("VisitPhone LIKE '%"+sobj.VisitPhone+"%'");
	if(typeof sobj.DepartmentId !== 'undefined' && sobj.DepartmentId !== null && sobj.DepartmentId!== "")
		searchp.push("DepartmentId = '"+sobj.DepartmentId+"'");
	if(typeof sobj.OperatorId !== 'undefined' && sobj.OperatorId !== null && sobj.OperatorId !== "")
		searchp.push("OperatorId = '"+sobj.OperatorId+"'");
	if(typeof sobj.UserCategoryId !== 'undefined' && sobj.UserCategoryId !== null && sobj.UserCategoryId !== "")
		searchp.push("UserCategoryId = '"+sobj.UserCategoryId+"'");
	if(typeof sobj.UserStatusId !== 'undefined' && sobj.UserStatusId !== null && sobj.UserStatusId !== "")
		searchp.push("UserStatusId = '"+sobj.UserStatusId+"'");
	
	if(searchp.length == 0)		// no query parameters
	{
		console.log("No query params");
		return null;
	}
		
	for(var i in searchp)
		sq = sq + searchp[i] + " AND ";
	
	sq = sq.substring(0, sq.length - 5);		// remove last AND
	return sq;
}

// Set up callbacks
io.sockets.on('connection', function(socket){
	
	socket.on('getDepartments', function(data)
	{
		socket.emit('getDepartmentsResponse',Departments);
	});
	socket.on('getOperators', function(data)
	{
		socket.emit('getOperatorsResponse',Operators);
	});
	socket.on('getUserCategories', function(data)
	{
		socket.emit('getUserCategoriesResponse',UserCategories);
	});
	socket.on('getUserStatuses', function(data)
	{
		socket.emit('getUserStatusesResponse',UserStatuses);
	});
/*	socket.on('updateSQLTable', function(data)
	{
		var qstr = "ALTER TABLE "+CHATDB+" ADD UserCategoryId VARCHAR(20)";
		doMysqlQuery(qstr, updateTableCallback,socket);
		qstr = "ALTER TABLE "+CHATDB+" ADD UserStatusId VARCHAR(20)";
		doMysqlQuery(qstr, updateTableCallback,socket);
	}); */
	socket.on('getChats', function(data)
	{
		var fromd = convertDate(data.FromDate,socket);
		var tod = convertDate(data.ToDate,socket)
		console.log("Get chats from "+fromd+" to "+tod);
		var query = "SELECT * FROM "+CHATDB+" WHERE Started BETWEEN '"+fromd+"' AND '"+tod+"'";
		doMysqlQuery(query, getChatsCallback,socket);
	});
	socket.on('searchChats', function(data)
	{
		var query = buildSearchQuery(data,socket);
		if(query !== null)
			doMysqlQuery(query,searchChatsCallback,socket);
	});
	socket.on('getTranscript', function(chatid)
	{
		if(chatid == 0 || chatid == "" || chatid == null)
			socket.emit("errorResponse", "Chat ID is invalid");	
		else
		{			
			getTranscriptViaAPI(chatid,socket);
		}
	});
	socket.on('loadChats', function(data)
	{
		getChatsViaAPI(data.FromDate,data.ToDate);

	});
	socket.on('deleteChats', function(data)
	{
		var fromd = convertDate(data.FromDate,socket);
		var tod = convertDate(data.ToDate,socket)
		console.log("Delete chats from "+fromd+" to "+tod);
		var query = "DELETE FROM "+CHATDB+" WHERE Started BETWEEN '"+fromd+"' AND '"+tod+"'";
		doMysqlQuery(query, delChatsCallback, socket);
	});
});

function doMysqlQuery(query, sqlCallback, tsocket) {

	console.log("SQL Query is: "+query);
	pool.getConnection(function(err, connection)
	{
		if(err)
		{
			debugLog("SQL connection error",err);
			return;
		}   
 		
//		console.log('connected as id ' + connection.threadId);
		connection.query(query,function(err, results)
		{
			connection.release();
			if(err)
			{
				debugLog("SQL query error",err);
				tsocket.emit("errorResponse", "Request error: "+err.code);
			}
			
			sqlCallback(results, tsocket);
		});
		
		connection.on('error', function(err)
		{
			connection.release();
			debugLog("SQL on error",err);
			return;
        });
	});
}

function getChatsCallback(results, thisSocket) {
	thisSocket.emit('getChatsResponse',results);			
}

function searchChatsCallback(results, thisSocket) {
	thisSocket.emit('searchChatsResponse',results);			
}

function delChatsCallback(results, thisSocket) {
	thisSocket.emit('deleteChatsResponse',results);			
}
// This function converts an ISO date time stamp to mysql format (yyyy-mm-dd hh:mm:ss)
// Sends error response if date invalid
function convertDate(datetime,thisSocket) {
	var dt = null;
	try
	{
		dt = new Date(datetime).toISOString().slice(0, 19).replace('T', ' ');
	}
	catch (err)
	{
		thisSocket.emit('errorResponse',"Date error: "+err);
	}
	return(dt);
}

function initialiseGlobals() {
	Departments = new Object();	// array of dept ids and dept name objects
	Operators = new Object();	// array of operator ids and name objects
	Folders = new Object();		// array of folder ids objects
	UserCategories = new Object();
	UserStatuses = new Object();
	ApiDataNotReady = 0;
	TimeNow = new Date();
	EndOfDay = new Date();
	EndOfDay.setHours(23,59,59,999);	// last milli second of the day
}

function doStartOfDay() {
	initialiseGlobals();
	getApiData("getDepartments", 0, deptsCallback);
	sleep(200);
	getApiData("getFolders", "FolderType=5", foldersCallback);	// chat folders only
	sleep(200);
	getApiData("getOperators", 0, operatorsCallback);
	sleep(200);
	getApiData("getSetupItems", "FolderType=20", userCategoriesCallback);
	sleep(200);
	getApiData("getSetupItems", "FolderType=21", userStatusesCallback);
	sleep(200);
	LastTime = new Date().toISOString();
}

function downloadRecentChats() {
	TimeNow = new Date().toISOString();
	console.log(TimeNow+": Getting latest chats for DB");
	getChatsViaAPI(LastTime,TimeNow);
	LastTime = TimeNow;
}

function checkEndOfDay() {
	var ctime = new Date();
	if(ctime > EndOfDay)		// we have skipped to a new day
	{
		console.log(ctime.toISOString()+": New day started, reload static data");
		doStartOfDay();
	}
}

console.log("Server Started on port "+PORT);
doStartOfDay();
setInterval(downloadRecentChats, 600000);		// downloads latest chats every 10 mins
setInterval(checkEndOfDay, 60000);			// check if new day every minute
