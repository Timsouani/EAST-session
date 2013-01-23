/* TODO:
 *  - override défilement slide
 *  - override accordéons
 * FIXME:
 *  - override reset/show
 */

// pour jslint
var EVENTS = EVENTS || {};
var console = console || {};

(function(){

var new_selectIndex = function(){
  // arguments[0] est le numéro d'index
  console.log("Changement de slide (ou un truc du genre).");
  return this.org_selectIndex.apply(this, arguments);
};
var new_slide_reset = function(){
  console.log("Reset de la slide");
  return this.org_reset.apply(this, arguments);
};
var new_slide_show = function(){
  console.log("Show de la slide");
  return this.org_show.apply(this, arguments);
};

EVENTS.onSMILReady(function() {
  var containers = document.getTimeContainersByTagName("*");
  for (var _i=0; _i<containers.length; _i+=1) {
    var navigation = containers[_i].parseAttribute("navigation");
    if (navigation) {
      // override de selectIndex pour toutes les slides
      containers[_i].org_selectIndex = containers[_i].selectIndex;
      containers[_i].selectIndex = new_selectIndex;

      var slide = containers[_i].timeNodes[containers[_i].currentIndex];
      // override de slide.reset()
      slide.org_reset = slide.reset;
      slide.reset = new_slide_reset;
      // override de slide.show()
      slide.org_show = slide.show;
      slide.show = new_slide_show;
    }
  }
});

})();
