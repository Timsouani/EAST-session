/* TODO:
 *  - Permettre l'exportation de la session
 */

// pour jslint
var EVENTS = EVENTS || {};
var console = console || {};

(function(){

// session events list
var sessionEvents = [];
// absolute time of last event
var sessionLastEventTime = (new Date()).getTime();

// counter for elsommaire2 elements
var id_cpt = 100;

// adds an event to the session events list
var pushEvent = function(event, id){
  var eventTime = (new Date()).getTime();
  var interval = eventTime - sessionLastEventTime;
  sessionLastEventTime = eventTime;

  // prevents flooding of event list with 'reset' events on slide change
  if (interval > 100 ||
      // allows reset quickly followed by show (aka slide reset)
      (sessionEvents[sessionEvents.length-1].type === 'reset' && event === 'show')
     ){
    sessionEvents.push({
      type: event,
      id: id,
      time: interval
    });
  }
};

// === Events functions
var new_selectIndex = function(){
  // arguments[0] is the index number
  pushEvent('slide', arguments[0]);
  return this.org_selectIndex.apply(this, arguments);
};
var new_slide_reset = function(){
  pushEvent('reset');
  return this.org_reset.apply(this, arguments);
};
var new_slide_show = function(){
  pushEvent('show');
  return this.org_show.apply(this, arguments);
};
var new_slide_click = function(e){
  pushEvent('click');
};
var new_spanli_click = function(id, e){
  pushEvent('spanli', id);
};
var new_elsommaire_click = function(id, e){
  pushEvent('elsommaire', id);
};
// ===

// Adds an id to title elements if necessary
var checkID = function(node){
  if (!node.hasAttribute('id')) {
    node.id = 'el'+(id_cpt++);
  }
  return node.id;
}

EVENTS.onSMILReady(function() {
  var containers = document.getTimeContainersByTagName("*");
  for (var _i=0; _i<containers.length; _i+=1) {
    var navigation = containers[_i].parseAttribute("navigation");
    if (navigation) {
      // overrides selectIndex for each slide
      containers[_i].org_selectIndex = containers[_i].selectIndex;
      containers[_i].selectIndex = new_selectIndex;

      for (var _j=0; _j<containers[_i].timeNodes.length; _j+=1) {
        var slide = containers[_i].timeNodes[_j];
        // overrides slide.reset()
        slide.org_reset = slide.reset;
        slide.reset = new_slide_reset;
        // overrides slide.show()
        slide.org_show = slide.show;
        slide.show = new_slide_show;
        // intercepts slide click
        EVENTS.bind(slide.target, "click", new_slide_click);
      }
    }
  }
  // intercepts spanli click
  var spanliTab = document.getElementsByClassName("spanli");
  for (_i=0; _i<spanliTab.length; _i+=1) {
    spanliTab[_i].addEventListener("click", new_spanli_click.bind(null, spanliTab[_i].id));
  }
  // intercepts elsommaire click
  var elsommaireTab = document.getElementsByClassName("elsommaire");
  for (_i=0; _i<elsommaireTab.length; _i+=1) {
    elsommaireTab[_i].addEventListener("click", new_elsommaire_click.bind(null, checkID(elsommaireTab[_i])));
  }
  var elsommaire2Tab = document.getElementsByClassName("elsommaire2");
  for (_i=0; _i<elsommaire2Tab.length; _i+=1) {
    elsommaire2Tab[_i].addEventListener("click", new_elsommaire_click.bind(null, checkID(elsommaire2Tab[_i])));
  }
  
});

})();
