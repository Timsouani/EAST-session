/* TODO:
 *  - intercepter les clics sur le sommaire
 */

// pour jslint
var EVENTS = EVENTS || {};
var console = console || {};

(function(){
var id_cpt = 100;
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
var new_slide_click = function(e){
  console.log("Click sur la slide");
};
var new_spanli_click = function(id, e){
  console.log("Click sur un accordéon d'id :"+id);
};

EVENTS.onSMILReady(function() {
  var containers = document.getTimeContainersByTagName("*");
  for (var _i=0; _i<containers.length; _i+=1) {
    var navigation = containers[_i].parseAttribute("navigation");
    if (navigation) {
      // override de selectIndex pour toutes les slides
      containers[_i].org_selectIndex = containers[_i].selectIndex;
      containers[_i].selectIndex = new_selectIndex;

      for (var _j=0; _j<containers[_i].timeNodes.length; _j+=1) {
        var slide = containers[_i].timeNodes[_j];
        // override de slide.reset()
        slide.org_reset = slide.reset;
        slide.reset = new_slide_reset;
        // override de slide.show()
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
  
});

})();
