/*global EVENTS */
/*jshint devel: true */
/*jshint nonstandard: true */

(function(){

// public API
document.SESSION = {
  record: function() {},  // starts session recording
  play: function() {},    // starts playing of loaded session
  pause: function() {},   // suspends/resume playing
  jump: function(secs) {} // jumps at specified time
};

var sessionEvents = [],           // session events list
    sessionLastEventTime = null,  // absolute time of last event
    sessionIsRecording = false,   // are we recording or playing a session ?
    slideControlContainer = null, // "master" timeContainer for slide changing and current slide index
    id_cpt = 100;                 // counter for our id generator

// adds an event to the session events list
var pushEvent = function(event, id){
  var eventTime = (new Date()).getTime(),
      interval = eventTime - sessionLastEventTime;

  sessionLastEventTime = eventTime;

  // do not catch show or reset events happening after slide events
  if (sessionEvents[sessionEvents.length-1].type !== 'slide' ||
      (event !== 'show' && event !== 'reset')) {
    sessionEvents.push({
      type: event,
      id: id,
      time: interval
    });
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
    if (sessionEvents[_e].id) {
      e.setAttribute('id', sessionEvents[_e].id);
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
      time: events[_e].getAttribute('time')
    });
  }
  return session;
};

// Starts replay of saved session
var playSession = function(){
  var position = 0,       // current event index
      lastTimeout = null; // return value of setTimeout for last planified event

  var walkSession = function(){
    switch (sessionEvents[position].type){
      case 'slide':
        slideControlContainer.selectIndex(
          parseInt(sessionEvents[position].id, 10)
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
      case 'li':
        document.getElementById(sessionEvents[position].id).click();
        break;
      default:
        console.error("EAST-session: unknown event type " +
                      sessionEvents[position].type);
    }
    position += 1;
    if (position < sessionEvents.length){
      lastTimeout = window.setTimeout(walkSession, sessionEvents[position].time);
    }
  };

  sessionIsRecording = false;
  walkSession();
};

// Public API
document.SESSION.record = function(){
  sessionEvents = [{
    type: 'slide',
    id: slideControlContainer.currentIndex,
    time: 0
  }];
  sessionLastEventTime = (new Date()).getTime();
  sessionIsRecording = true;
};
document.SESSION.play = function(){
};
document.SESSION.pause = function(){
};
document.SESSION.jump = function(time){
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
      }
    }
  }

  // intercepts clicks on lists
  var liTab = document.getElementsByTagName("li");
  for (_i=0; _i<liTab.length; _i+=1) {
    if (liTab[_i].hasAttribute("smil")){
      liTab[_i].addEventListener(
        "click", eventCatchers.li_click.bind(null, checkID(liTab[_i]))
      );
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
      playSession();
    };
    reader.readAsText(file);
  });

  document.getElementById('navigation_par').appendChild(recbtn);
  document.getElementById('navigation_par').appendChild(exportbtn);
  document.getElementById('navigation_par').appendChild(fileInput);

  document.SESSION.record();
});

}());
