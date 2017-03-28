/*global EVENTS */
/*jshint devel: true */
/*jshint nonstandard: true */




(function(){

// public API
document.SESSION = {
  record: function() {},  // starts session recording
  play: function() {},    // starts playing of loaded session
  pause: function() {},   // suspends/resume playing
  jump: function(secs) {},// jumps at specified time
  load: function(str) {}, // loads session from string XML
  save: function() {},     // returns session as string XML
  recordVoice : function() {},
  stopRecordVoice : function(){},
  downloadVoice : function(){},
  playVoice : function(){}
};

var sessionEvents = [],           // session events list
    JsonEvents = [],
    sessionLastEventTime = null,  // absolute time of last event
    sessionIsRecording = false,   // are we recording or playing a session ?
    sessionIsPaused = false,      // was the session playback suspended ?
    slideControlContainer = null, // "master" timeContainer for slide changing and current slide index
    id_cpt = 100;                 // counter for our id generator



  var leftchannel = [];
var rightchannel = [];
var recorder = null;
var recordingLength = 0;
var volume = null;
var mediaStream = null;
      var sampleRate = 44100;
      var context = null;
      var blob = null;

// adds an event to the session events list
var pushEvent = function(event, id, cord = null, text = null){
  var eventTime = (new Date()).getTime(), interval = eventTime - sessionLastEventTime;

  sessionLastEventTime = eventTime;

  // do not catch show or reset events happening after slide events
  // also do not catch too close events, except show following reset
  if ((sessionEvents[sessionEvents.length-1].type !== 'slide' ||
      (event !== 'show' && event !== 'reset')) && ((interval>20) ||
      (event === 'show' && sessionEvents[sessionEvents.length-1].type ===
      'reset'))) {

    if (event === 'move') {
    sessionEvents.push({
      type: event,
      id: id,
      cord : cord,
      time: interval
    });
    }else if(event === 'highlight'){
        sessionEvents.push({
        type: event,
        id: id,
        text : text,
        time: interval
      });
    }
    else{

      sessionEvents.push({
        type: event,
        id: id,
        time: interval
      });

  }
    }

};

var GetSelectedText = function () {
    if (window.getSelection) {  // all browsers, except IE before version 9
        var range = window.getSelection ();
        return range.toString();
    }
    else {
        if (document.selection.createRange) { // Internet Explorer
            var range = document.selection.createRange ();
            return range.text;
        }
    }
};

var highlightText = function (noed, text) {
    if (document.createRange && window.getSelection) {

        var range = document.createRange();
        textNode = document.getElementById(noed);

        var nbr = textNode.textContent.indexOf(text);
        range.setStart(textNode.firstChild, nbr);
        range.setEnd(textNode.firstChild, nbr+text.length);

        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
};


// Adds an id to title elements if necessary and returns it
var checkID = function(node){
  if (!node.hasAttribute('id')) {
    node.id = 'el'+(id_cpt+=1);
  }
  return node.id;
};

// Converts session events array to XML
var sessionEventsToXml = function(){
  var doc = document.implementation.createDocument("", "", null);
  doc.appendChild(doc.createComment("SMIL session file"));
  doc.appendChild(doc.createComment("Save this to a .xml file."));
  doc.appendChild(doc.createComment("To play back, open your presentation, click \"Load session\" button and select this file."));
  doc.appendChild(doc.createElement('xml'));
  doc.lastChild.appendChild(doc.createTextNode('\n'));
  for (var _e=0; _e<sessionEvents.length; _e+=1) {
    var e = doc.createElement('event');
    e.setAttribute('type', sessionEvents[_e].type);
    e.setAttribute('time', sessionEvents[_e].time);
    if (sessionEvents[_e].id !== undefined) {
      e.setAttribute('id', sessionEvents[_e].id);
    }
    if (sessionEvents[_e].type === 'move') {
      e.setAttribute('x', sessionEvents[_e].cord.x);
      e.setAttribute('y', sessionEvents[_e].cord.y);
    }
    if (sessionEvents[_e].type === 'highlight') {
      e.setAttribute('text', sessionEvents[_e].text);
    }
    doc.lastChild.appendChild(e);
    doc.lastChild.appendChild(doc.createTextNode('\n'));
  }
  return (new XMLSerializer()).serializeToString(doc);
};


// Reads XML string and convert it to a session events array
var xmlToSessionEvents = function(xml){
  var doc = (new DOMParser()).parseFromString(xml, "application/xml"),
      events = doc.getElementsByTagName('event'),
      session = [];

  for (var _e=0; _e<events.length; _e+=1) {
    session.push({
      type: events[_e].getAttribute('type'),
      id: events[_e].getAttribute('id'),
      time: parseInt(events[_e].getAttribute('time'), 10),
      cord : {x : events[_e].getAttribute('x'), y : events[_e].getAttribute('y')},
      text : events[_e].getAttribute('text')
    });
  }
  return session;
};

// variables and functions for session playback
var playback = {
  _position: 0,
  _lastTimeout: null,

  play: function(){
    if (!sessionIsRecording){
      window.clearTimeout(playback._lastTimeout);
    }
    playback._position = 0;
    playback._lastTimeout = null;
    sessionIsRecording = false;
    sessionIsPaused = false;
	document.SESSION.playVoice();
    console.log("playing ...");
    playback.walk();
  },

  walk: function(onlyOne){
    if (playback._position < sessionEvents.length && !onlyOne && sessionEvents[playback._position+1]){
      sessionLastEventTime = (new Date()).getTime();
      playback._lastTimeout = window.setTimeout(playback.walk,sessionEvents[playback._position+1].time);
    }

    switch (sessionEvents[playback._position].type){
      case 'slide':
        slideControlContainer.selectIndex(
          parseInt(sessionEvents[playback._position].id, 10)
        );
        break;
      case 'reset':
        document.getTimeContainersByTarget(
          document.getElementById(window.location.hash.slice(1))
        )[0].reset();
        break;
      case 'show':
        document.getTimeContainersByTarget(
          document.getElementById(window.location.hash.slice(1))
        )[0].show();
        break;
      case 'click':
        document.getElementById(window.location.hash.slice(1)).click();
        break;
      case 'li':{
        document.getElementById(sessionEvents[playback._position].id).click();
        break;
      }
      case 'move':{
        document.getElementById('im').style.top  = sessionEvents[playback._position].cord.y+"px";
        document.getElementById('im').style.left = sessionEvents[playback._position].cord.x+"px";
        document.getElementById('im').style.display = "block";
        break;
      }
      case 'highlight':{
        highlightText(sessionEvents[playback._position].id, sessionEvents[playback._position].text);
        break;
      }
      default:
        console.error("EAST-session: unknown event type " +
                      sessionEvents[playback._position].type);
    }

    playback._position += 1;
  },

  pause: function(){
    window.clearTimeout(playback._lastTimeout);
    sessionLastEventTime = (new Date()).getTime() - sessionLastEventTime;
    sessionIsPaused = true;
  },

  resume: function(){
    playback._lastTimeout = window.setTimeout(playback.walk,
                sessionEvents[playback._position].time - sessionLastEventTime);
    sessionIsPaused = false;
  },

  jump: function(time){
    var timeCounter = 0,
        jumpFrom = 0,
        jumpTo = 0,
        nearestSlideIndex = 0;

    while (jumpTo<sessionEvents.length && timeCounter+sessionEvents[jumpTo].time < time){
      if (sessionEvents[jumpTo].type === 'slide'){
        nearestSlideIndex = jumpTo;
      }
      timeCounter += sessionEvents[jumpTo].time;
      jumpTo += 1;
    }

    if (jumpTo === playback._position){
      return;
    } else {
      jumpFrom = nearestSlideIndex;
    }

    window.clearTimeout(playback._lastTimeout);
    for (var _i=jumpFrom; _i<jumpTo; _i+=1){
      playback._position = _i;
      playback.walk(true);
    }
    sessionLastEventTime = time - timeCounter +
      sessionEvents[playback._position].time;
    if(!sessionIsPaused){
      playback.resume();
    }
 }
};

document.SESSION.recordVoice = function(){
 // Initialize recorder
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
            navigator.getUserMedia(
            {
                audio: true
            },
            function (e) {
                console.log("user consent");

                // creates the audio context
                window.AudioContext = window.AudioContext || window.webkitAudioContext;
                context = new AudioContext();

                // creates an audio node from the microphone incoming stream
                mediaStream = context.createMediaStreamSource(e);

                // https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createScriptProcessor
                // bufferSize: the onaudioprocess event is called when the buffer is full
                var bufferSize = 2048;
                var numberOfInputChannels = 2;
                var numberOfOutputChannels = 2;
                if (context.createScriptProcessor) {
                    recorder = context.createScriptProcessor(bufferSize, numberOfInputChannels, numberOfOutputChannels);
                } else {
                    recorder = context.createJavaScriptNode(bufferSize, numberOfInputChannels, numberOfOutputChannels);
                }

                recorder.onaudioprocess = function (e) {
                    leftchannel.push(new Float32Array(e.inputBuffer.getChannelData(0)));
                    rightchannel.push(new Float32Array(e.inputBuffer.getChannelData(1)));
                    recordingLength += bufferSize;
                }

                // we connect the recorder
                mediaStream.connect(recorder);
                recorder.connect(context.destination);
            },
                        function (e) {
                            console.error(e);
                        });

};

document.SESSION.stopRecordVoice = function(){
            // stop recording
            recorder.disconnect(context.destination);
            mediaStream.disconnect(recorder);

            // we flat the left and right channels down
            // Float32Array[] => Float32Array
            var leftBuffer = flattenArray(leftchannel, recordingLength);
            var rightBuffer = flattenArray(rightchannel, recordingLength);
            // we interleave both channels together
            // [left[0],right[0],left[1],right[1],...]
            var interleaved = interleave(leftBuffer, rightBuffer);

            // we create our wav file
            var buffer = new ArrayBuffer(44 + interleaved.length * 2);
            var view = new DataView(buffer);

            // RIFF chunk descriptor
            writeUTFBytes(view, 0, 'RIFF');
            view.setUint32(4, 44 + interleaved.length * 2, true);
            writeUTFBytes(view, 8, 'WAVE');
            // FMT sub-chunk
            writeUTFBytes(view, 12, 'fmt ');
            view.setUint32(16, 16, true); // chunkSize
            view.setUint16(20, 1, true); // wFormatTag
            view.setUint16(22, 2, true); // wChannels: stereo (2 channels)
            view.setUint32(24, sampleRate, true); // dwSamplesPerSec
            view.setUint32(28, sampleRate * 4, true); // dwAvgBytesPerSec
            view.setUint16(32, 4, true); // wBlockAlign
            view.setUint16(34, 16, true); // wBitsPerSample
            // data sub-chunk
            writeUTFBytes(view, 36, 'data');
            view.setUint32(40, interleaved.length * 2, true);

            // write the PCM samples
            var index = 44;
            var volume = 1;
            for (var i = 0; i < interleaved.length; i++) {
                view.setInt16(index, interleaved[i] * (0x7FFF * volume), true);
                index += 2;
            }

            // our final blob
            blob = new Blob([view], { type: 'audio/wav' });
            console.log("Stop Recording");

};

	document.SESSION.downloadVoice= function(){
	 if (blob == null) {
					return;
				}

				var url = URL.createObjectURL(blob);

				var a = document.createElement("a");
				document.body.appendChild(a);
				a.style = "display: none";
				a.href = url;
				a.download = "sample.wav";
				a.click();
				window.URL.revokeObjectURL(url);
				console.log("document downloaded");
	};

	document.SESSION.playVoice = function(){
	if (blob == null) {
					return;
				}

				var url = window.URL.createObjectURL(blob);
				var audio = new Audio(url);
				audio.play();
	}

// Public API
document.SESSION.record = function(){
  sessionEvents = [{
    type: 'slide',
    id: slideControlContainer.currentIndex,
    time: 0
  }];
  sessionLastEventTime = (new Date()).getTime();
  if(sessionIsRecording==true){
  document.SESSION.recordVoice();
  }
  sessionIsRecording = true;

  var spans = document.getElementsByTagName('span');
  for (var i = 0; i < spans.length; i++) {
    console.log(spans[i].id.length);
    if (spans[i].id.length > 0) {
      spans[i].addEventListener("mouseup", eventCatchers.highlight);
    }

  }
};

document.SESSION.play = function(){
  if (!sessionIsPaused){
    document.SESSION.pause();
  }
  playback.play();
};

document.SESSION.pause = function(){
  if(sessionIsPaused){
    playback.resume();
  } else {
    playback.pause();
  }
};

document.SESSION.jump = function(time){
  playback.jump(time);
};

document.SESSION.load = function(str){
  var events = xmlToSessionEvents(str);
  if (events.length && events.length>0){
    sessionEvents = events;
    return true;
  }
  return false;
};

document.SESSION.save = function(){
  return unescape(encodeURIComponent(sessionEventsToXml()));
};

// Catchers for session events
var eventCatchers = {
  /*jshint curly: false */
  selectIndex: function(slide_id){
    if (sessionIsRecording) pushEvent('slide', slide_id);
    return this.org_selectIndex.apply(this, arguments);
  },
  reset: function(){
    if (sessionIsRecording) pushEvent('reset');
    return this.org_reset.apply(this, arguments);
  },
  show: function(){
    if (sessionIsRecording) pushEvent('show');
    return this.org_show.apply(this, arguments);
  },
  slide_click: function(e){
    if (sessionIsRecording) pushEvent('click');
  },
  li_click: function(id, e){
    if (sessionIsRecording) pushEvent('li', id);
  },
  move: function(e){
    if (sessionIsRecording) pushEvent('move', null, {"x": e.pageX,"y": e.pageY});
  },
  highlight: function(e){
    if (sessionIsRecording) pushEvent('highlight', e.target.id, null, GetSelectedText());
  }
};

// Init, binds to events and creates UI
EVENTS.onSMILReady(function() {
  var containers = document.getTimeContainersByTagName("*");
  slideControlContainer = containers[containers.length-1];

  for (var _i=0; _i<containers.length; _i+=1) {
    var navigation = containers[_i].parseAttribute("navigation");
    if (navigation) {
      // overrides selectIndex for each slide
      // overrides selectIndex for each slide
      containers[_i].org_selectIndex = containers[_i].selectIndex;
      containers[_i].selectIndex = eventCatchers.selectIndex;

      for (var _j=0; _j<containers[_i].timeNodes.length; _j+=1) {
        var slide = containers[_i].timeNodes[_j];
        // overrides slide.reset()
        slide.org_reset = slide.reset;
        slide.reset = eventCatchers.reset;
        // overrides slide.show()
        slide.org_show = slide.show;
        slide.show = eventCatchers.show;
        // intercepts slide click
        EVENTS.bind(slide.target, "click", eventCatchers.slide_click);
        slide.target.addEventListener("mousemove", eventCatchers.move)
      }
    }
  }

  // intercepts clicks on lists
  var liTab = document.getElementsByTagName("li");
  for (_i=0; _i<liTab.length; _i+=1) {
    if (liTab[_i].hasAttribute("smil")){
      liTab[_i].addEventListener("click", eventCatchers.li_click.bind(null, checkID(liTab[_i])));
    }
  }

  // add buttons in navbar
  var recbtn = document.createElement('button'),
      exportbtn = document.createElement('button'),
      fileInput = document.createElement('input');

  recbtn.setAttribute('id', 'session_rec');
  recbtn.title = 'Start session recording';
  recbtn.appendChild(document.createTextNode('Record session'));

  exportbtn.id = 'session_export'; exportbtn.title = 'Export session';
  exportbtn.appendChild(document.createTextNode('Export session'));

  fileInput.type = 'file'; fileInput.id = 'session_import';
  fileInput.title = 'Import session';

  recbtn.addEventListener('click', document.SESSION.record);
  exportbtn.addEventListener('click', function(){
	  //Stop recording the voice
  document.SESSION.stopRecordVoice();

  //Download the recorded voice
  //document.SESSION.downloadVoice();
    window.open('data:text/xml;base64,' +
                    window.btoa(unescape(
                      encodeURIComponent(sessionEventsToXml())
                    )));
  });
  fileInput.addEventListener('change', function(e){
    var file = e.target.files[0];
    var reader = new FileReader();
    reader.onload = function(f){
      sessionEvents = xmlToSessionEvents(f.target.result);
      playback.play();
    };
    reader.readAsText(file);
  });

  document.getElementById('navigation_par').appendChild(recbtn);
  document.getElementById('navigation_par').appendChild(exportbtn);
  document.getElementById('navigation_par').appendChild(fileInput);

  document.SESSION.record();
});

}());
function flattenArray(channelBuffer, recordingLength) {
            var result = new Float32Array(recordingLength);
            var offset = 0;
            for (var i = 0; i < channelBuffer.length; i++) {
                var buffer = channelBuffer[i];
                result.set(buffer, offset);
                offset += buffer.length;
            }
            return result;
        }

function interleave(leftChannel, rightChannel) {
            var length = leftChannel.length + rightChannel.length;
            var result = new Float32Array(length);

            var inputIndex = 0;

            for (var index = 0; index < length;) {
                result[index++] = leftChannel[inputIndex];
                result[index++] = rightChannel[inputIndex];
                inputIndex++;
            }
            return result;
        }

function writeUTFBytes(view, offset, string) {
            for (var i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        }
