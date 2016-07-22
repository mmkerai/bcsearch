var socket = io();

function getDepartments() {
	socket.emit('getDepartments',0);
}

function getOperators() {
	socket.emit('getOperators',0);
}

function getChats() {
	var fDate = $('#fromDate').val();
	var tDate = $('#toDate').val();
	var obj = {FromDate: fDate,ToDate: tDate};
	console.log("Load From:"+fDate+" to "+tDate);
	socket.emit('getChats',obj);
}

function loadData() {
	var fDate = $('#fromDate').val();
	var tDate = $('#toDate').val();
	var obj = {FromDate: fDate,ToDate: tDate};
	console.log("Load From:"+fDate+" to "+tDate);
	socket.emit('loadChats',obj);
}

function deleteDataDate() {
	if(confirm("Are you sure you want to do this?") == false)
		return;
	var fDate = $('#fromDate').val();
	var tDate = $('#toDate').val();
	var obj = {FromDate: fDate,ToDate: tDate};
	console.log("Delete From:"+fDate+" to "+tDate);
	try
	{
		var dt = new Date(fDate);
		console.log("Date is "+dt.toISOString());	
	}
	catch (err)
	{
		console.log("Invalid date: "+err);
	}

	socket.emit('deleteChats',obj);
}

function deleteAllData() {
	if(confirm("Are you sure you want to do this?") == false)
		return;
	if(confirm("Are you really really sure?") == false)
		return;
	socket.emit('deleteChats',{FromDate: new Date(0).toISOString(),ToDate: new Date().toISOString()});
}

$(document).ready(function() {

	setDefaultValues();
	
	socket.on('errorResponse', function(data){
		$("#error").text(data);
	});

	socket.on('getDepartmentsResponse', function(data){
		$("#message1").html("<b>No of Departments: "+Object.keys(data).length+"</b>");
		var str = "";
		for(var i in data)
		{
			str = str +"Department id: "+i+", Name: "+data[i]+"<br/>";
		}
		$("#message2").html(str);
	});
	socket.on('getOperatorsResponse', function(data){
		$("#message1").html("<b>No of Operators: "+Object.keys(data).length+"</b>");
		var str = "";
		for(var i in data)
		{
			str = str + "Operator id: "+i+", Name: "+data[i]+"<br/>";
		}
		$("#message2").html(str);
	});
	socket.on('getChatsResponse', function(results){
		$("#message1").html("<b>No of Chats: "+results.length+"</b>");
		var str = "";
		for(var i in results)
		{
			str = "<b>"+i+":</b><br/>";
			var dataobj = results[i];
			for(var key in dataobj)
			{
				if(dataobj.hasOwnProperty(key))
					str = str + key +":"+dataobj[key]+",";
			}
			str = str +"<br/>";
		}
		$("#message2").html(str);
	});
	socket.on('deleteChatsResponse', function(dataobj){
			for(var key in dataobj)
			{
				if(dataobj.hasOwnProperty(key))
					console.log(key +":"+dataobj[key]);
			}
		$("#message1").html("Chats deleted "+dataobj.affectedRows);
	});
});

function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null
}

function setDefaultValues() {
	$('#fromDate').val((new Date()).toISOString());
	$('#toDate').val((new Date()).toISOString());
}
