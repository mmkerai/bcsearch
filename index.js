var socket = io();

function getDepartments() {
  socket.emit('getDepartments', 0);
}

function getOperators() {
  socket.emit('getOperators', 0);
}

function searchChats(aform) {
  console.log("searching chats");
  FV = {};
  for (var i = 1; i < aform.length - 2; i++) { //exclude 2 buttons
    if (aform.elements[i].value !== "") {
      if (aform.elements[i].name == "FromDate") {
        var f = (aform.elements[i].value).split("/");
        FV[aform.elements[i].name] = new Date(f[2], f[1] - 1, f[0], 0, 0, 0, 0).toISOString();
      } else if (aform.elements[i].name == "ToDate") {
        var f = (aform.elements[i].value).split("/");
        FV[aform.elements[i].name] = new Date(f[2], f[1] - 1, f[0], 23, 59, 59, 0).toISOString();
      } else {
        FV[aform.elements[i].name] = aform.elements[i].value;
      }
    }
  }
  /*
  for (var key in FV) {
    if (FV.hasOwnProperty(key)) {
      console.log(key + " -> " + FV[key]);
    }
  }*/
  socket.emit('searchChats', FV);
}

function getTranscript(id) {
  socket.emit('getTranscript', id);
}
//utility  
function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [, ""])[1].replace(/\+/g, '%20')) || null
}
/* Italian initialisation for the jQuery UI date picker plugin. */
/* Written by Antonello Pasella (antonello.pasella@gmail.com). */
( function( factory ) {
	if ( typeof define === "function" && define.amd ) {

		// AMD. Register as an anonymous module.
		define( [ "../widgets/datepicker" ], factory );
	} else {

		// Browser globals
		factory( $.datepicker );
	}
}( function( datepicker ) {
    console.log("Datepicker loaded"); 
datepicker.regional.it = {
	closeText: "Chiudi",
	prevText: "&#x3C;Prec",
	nextText: "Succ&#x3E;",
	currentText: "Oggi",
	monthNames: [ "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
		"Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre" ],
	monthNamesShort: [ "Gen","Feb","Mar","Apr","Mag","Giu",
		"Lug","Ago","Set","Ott","Nov","Dic" ],
	dayNames: [ "Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato" ],
	dayNamesShort: [ "Dom","Lun","Mar","Mer","Gio","Ven","Sab" ],
	dayNamesMin: [ "Do","Lu","Ma","Me","Gi","Ve","Sa" ],
	weekHeader: "Sm",
	dateFormat: "dd/mm/yy",
	firstDay: 1,
	isRTL: false,
	showMonthAfterYear: false,
	yearSuffix: "" };
datepicker.setDefaults( datepicker.regional.it );

return datepicker.regional.it;

} ) );


function getDate(element) {
  var date;
  try {
    date = $.datepicker.parseDate(dateFormat, element.value);
  } catch (e) {
    date = null;
  }
  return date;
}



///////////////DOCUMENT READY
$(function() {
  //load them straightaway
  getDepartments();
  getOperators();
  //Style input boxes
  $('input').addClass("ui-widget ui-widget-content ui-corner-all");
  //initialize chats table
  $('#chats').DataTable({
    "paging": false,
    "scrollX": false,
    "scrollY": "100%",
    "scrollCollapse": true,
    "fixedHeader": true,
    "columns": [{
      "data": "ChatId",
      "defaultContent": "---"
    }, {
      "data": "VisitName",
      "defaultContent": "---"
    }, {
      "data": "VisitRef",
      "defaultContent": "---"
    }, {
      "data": "VisitInfo",
      "defaultContent": "---"
    }, {
      "data": "VisitPhone",
      "defaultContent": "---"
    }, {
      "data": "Started",
      "defaultContent": "---"
    }, {
      "data": "Answered",
      "defaultContent": "---"
    }, {
      "data": "Ended",
      "defaultContent": "---"
    }, {
      "data": "OperatorId",
      "defaultContent": "---"
    }, {
      "data": "DepartmentId",
      "defaultContent": "---"
    }, {
      "data": "ChatUrl",
      "defaultContent": "---"
    }]
  });
  //initialize transcript table
  $('#transcript').DataTable({
    "paging": false,
    "scrollX": false,
    "scrollY": "100%",
    "scrollCollapse": true,
    "fixedHeader": true,
    "columns": [{
      "data": "Created",
      "defaultContent": "---"
    }, {
      "data": "Name",
      "defaultContent": "---"
    }, {
      "data": "Text",
      "defaultContent": "---"
    }]
  });
  //add navigation buttons
  $("#transcript_wrapper").append($("#GoBack"));
  $("#transcript_wrapper").append($("#Prev"));
  $("#transcript_wrapper").append($("#Next"));
  $("#transcript_wrapper").append($("#BreadCrumb"));
  
  
  //datepickers
  var from = $("#FromDate").datepicker({
    defaultDate: "+1w",
    changeMonth: true,
    numberOfMonths: 1
  }).on("change", function() {
    to.datepicker("option", "minDate", getDate(this));
  }),
  to = $("#ToDate").datepicker({
    defaultDate: "+1w",
    changeMonth: true,
    numberOfMonths: 1
  }).on("change", function() {
    from.datepicker("option", "maxDate", getDate(this));
  });  
  
  
  //Socket responses
  
  socket.on('errorResponse', function(data) {
    $("#error").text(data);
  });
  socket.on('getDepartmentsResponse', function(data) {
    //Save it globaly first
    window.global_Departments = data;
    var output = ['<option value="" selected></option>'];
    for (var i in data) {
      output.push('<option value="' + i + '">' + data[i] + '</option>');
      //console.log("Department id: " + i + " Name: " + data[i]);
    }
    $('#DepartmentId').html(output.join(''));
    $("#DepartmentId").chosen({
      allow_single_deselect: true,
      width: '100%'
    });
    //$("#message1").html("No of Departments: " + Object.keys(data).length);
  });
  socket.on('getOperatorsResponse', function(data) {
    //Save it globally first
    window.global_Operators = data;
    var output = ['<option value="" selected></option>'];
    for (var i in data) {
      output.push('<option value="' + i + '">' + data[i] + '</option>');
      //console.log("Operator id: " + i + " Name: " + data[i]);
    }
    $('#OperatorId').html(output.join(''));
    $("#OperatorId").chosen({
      allow_single_deselect: true,
      width: '100%'
    });
    //$("#message2").text("No of Operators: " + Object.keys(data).length);
  });
  socket.on('searchChatsResponse', function(Chats) {
    console.log("finished searching chats");
    //properly initialize the global array
    window.GlobalChatIds = [];
    window.GlobalChatIds.length = 0;
    //pre=parse the table
    for (i = 0; i < Chats.length; i++) {
      //keep array of chat Ids in global array
      window.GlobalChatIds[i] = Chats[i].ChatId + "";
      //console.log(i + ":  " + window.GlobalChatIds[i]);
      Chats[i].ChatId = "<a href='#' onclick='getTranscript(\"" + Chats[i].ChatId + "\");'>" + Chats[i].ChatId + "</a>";
      Chats[i].Started = moment(Chats[i].Started).format("DD-MM-YY HH:mm");
      Chats[i].Answered = moment(Chats[i].Answered).format("DD-MM-YY HH:mm");
      Chats[i].Ended = moment(Chats[i].Ended).format("DD-MM-YY HH:mm");
      Chats[i].OperatorId = window.global_Operators[Chats[i].OperatorId];
      Chats[i].DepartmentId = window.global_Departments[Chats[i].DepartmentId];
    }
    var datatable = $('#chats').dataTable().api(); //get reference
    datatable.clear();
    datatable.rows.add(Chats);
    datatable.draw();
    /*
    for(var i in Chats)
    {
        var dataobj = Chats[i];
        for(var key in dataobj)
        {
            if(dataobj.hasOwnProperty(key))
                console.log(key +":"+dataobj[key]);
        }
    }*/
  });
  socket.on('getTranscriptResponse', function(transcript) {
    console.log("finished retrieving transcript");
    //pre=parse the table
    var chatindex;
    var numberchats = window.GlobalChatIds.length;
    for (i = 0; i < numberchats; i++) {
      if (transcript.ChatId == window.GlobalChatIds[i]) {
        chatindex = i;
        break;
      }
    }
    //console.log(chatindex+" / "+numberchats);
    $("#BreadCrumb").show();
    $("#BreadCrumb").text("Chat ID: " + transcript.ChatId + "     " + "Chat " + (chatindex + 1) + " di " + (numberchats));
    for (i = 0; i < transcript.Transcript.length; i++) {
      transcript.Transcript[i].Created = moment(transcript.Transcript[i].Created).format("DD-MM-YY HH:mm:ss");
    }
    var datatable = $('#transcript').dataTable().api(); //get reference
    $("#resultstable").hide();
    $("#transcripttable").show();
    datatable.clear();
    datatable.rows.add(transcript.Transcript);
    datatable.draw();
    $("#GoBack").show();
    $("#GoBack").click(function() {
      $("#GoBack").hide();
      $("#resultstable").show();
      $("#transcripttable").hide();
    });
    if (chatindex > 0) {
      $("#Prev").show();
      $("#Prev").off(); //remove events
      $("#Prev").click(function() {
        getTranscript(window.GlobalChatIds[chatindex - 1]);
      });
    } else {
      $("#Prev").hide();
    }
    if (chatindex < numberchats - 1) {
      $("#Next").show();
      $("#Next").off(); //remove events
      $("#Next").click(function() {
        getTranscript(window.GlobalChatIds[chatindex + 1]);
      });
    } else {
      $("#Next").hide();
    }
  });
});