define("mvc/visualization/visualization-view",["exports","utils/utils","mvc/ui/ui-thumbnails","mvc/ui/ui-portlet","mvc/ui/ui-misc"],function(i,e,t,a,s){"use strict";function l(i){return i&&i.__esModule?i:{default:i}}Object.defineProperty(i,"__esModule",{value:!0});l(e);var n=l(t),o=(l(a),l(s),Backbone.View.extend({initialize:function(i){var e=this;this.setElement($("<div/>")),this.model=new Backbone.Model,$.ajax({url:Galaxy.root+"api/datasets/"+i.dataset_id}).done(function(i){0===i.visualizations.length?e.$el.append($("<div/>").addClass("errormessagelarge").append($("<p/>").text("Unfortunately we could not identify a suitable plugin. Feel free to contact us if you are aware of visualizations for this datatype."))):(e.model.set({dataset:i}),e.render())})},render:function(){var i=this,e=this.model.get("dataset");this.vis_index={},this.vis_array=[],_.each(e.visualizations,function(e,t){var a={id:t,name:e.name,keywords:e.keywords||[],title:e.title?type.title+" ("+e.html+")":e.html,image_src:e.logo?Galaxy.root+e.logo:null,description:e.description||"No description available.",regular:e.regular,visualization:e};i.vis_index[a.id]=a,i.vis_array.push(a)}),this.types=new n.default.View({title_default:"Suggested plugins",title_list:"List of available plugins",collection:this.vis_array,ondblclick:function(e){var t=i.vis_index[e];$("#galaxy_main").attr("src",t.visualization.href)}}),this.$el.empty().append(this.types.$el)}}));i.default={View:o}});