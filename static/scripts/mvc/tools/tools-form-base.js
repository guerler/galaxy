define(["utils/utils","utils/deferred","mvc/ui/ui-misc","mvc/form/form-view","mvc/tools/tools-template","mvc/citation/citation-model","mvc/citation/citation-view"],function(a,b,c,d,e,f,g){return Backbone.View.extend({initialize:function(c){this.options=a.merge(c,{}),this.setElement("<div/>"),this.deferred=new b,c.inputs?this._buildForm(c):this._buildModel(c,!0)},_buildForm:function(b){var c=this;this.options=a.merge(b,this.options),this.options=a.merge({icon:"fa-wrench",title:"<b>"+b.name+"</b> "+b.description+" (Galaxy Tool Version "+b.version+")",operations:this._operations(),onchange:function(){c.deferred.reset(),c.deferred.execute(function(){c._updateModel()})}},this.options),this.options.customize&&this.options.customize(this.options),this.form=new d(this.options),this._footer(),this.$el.empty(),this.$el.append(this.form.$el)},_buildModel:function(b,d){var e=this;if(this.options.id=b.id,this.options.version=b.version,b.job_id)f=Galaxy.root+"api/jobs/"+b.job_id+"/build_for_rerun";else{var f=Galaxy.root+"api/tools/"+b.id+"/build?";b.version&&(f+="tool_version="+b.version+"&"),Galaxy.params&&Galaxy.params.tool_id==b.id&&_.each(Galaxy.params,function(a,b){-1==["tool_version","tool_id"].indexOf(b)&&(f+=b+"="+a+"&")})}var g=this.deferred.register();a.request({type:"GET",url:f,success:function(a){e._buildForm(a.tool_model||a),!d&&e.form.message.update({status:"success",message:"Now you are using '"+e.options.name+"' version "+e.options.version+".",persistent:!1}),e.deferred.done(g),console.debug("tools-form::initialize() - Initial tool model ready."),console.debug(a)},error:function(a){e.deferred.done(g),console.debug("tools-form::initialize() - Initial tool model request failed."),console.debug(a);var b=a.error||a.err_msg||"Uncaught error.";e.$el.is(":empty")?e.$el.prepend(new c.Message({message:b,status:"danger",persistent:!0}).$el):Galaxy.modal.show({title:"Tool request failed",body:b,buttons:{Close:function(){Galaxy.modal.hide()}}})}})},_updateModel:function(){var b=this.options.update_url||Galaxy.root+"api/tools/"+this.options.id+"/build",c=this,d=this.form,e={tool_id:this.options.id,tool_version:this.options.version,inputs:$.extend(!0,{},c.form.data.create())};d.wait(!0);var f=this.deferred.register();console.debug("tools-form-base::_updateModel() - Sending current state (see below)."),console.debug(e),a.request({type:"POST",url:b,data:e,success:function(a){c.form.update(a.tool_model||a),c.options.update&&c.options.update(a),d.wait(!1),console.debug("tools-form-base::_updateModel() - Received new model (see below)."),console.debug(a),c.deferred.done(f)},error:function(a){c.deferred.done(f),console.debug("tools-form-base::_updateModel() - Refresh request failed."),console.debug(a)}})},_operations:function(){var a=this,b=this.options,d=new c.ButtonMenu({icon:"fa-cubes",title:!b.narrow&&"Versions"||null,tooltip:"Select another tool version"});if(!b.is_workflow&&b.versions&&b.versions.length>1)for(var f in b.versions){var g=b.versions[f];g!=b.version&&d.addMenu({title:"Switch to "+g,version:g,icon:"fa-cube",onclick:function(){var c=b.id.replace(b.version,this.version),d=this.version;a.deferred.reset(),a.deferred.execute(function(){a._buildModel({id:c,version:d})})}})}else d.$el.hide();var h=new c.ButtonMenu({icon:"fa-caret-down",title:!b.narrow&&"Options"||null,tooltip:"View available options"});return b.biostar_url&&(h.addMenu({icon:"fa-question-circle",title:"Question?",tooltip:"Ask a question about this tool (Biostar)",onclick:function(){window.open(b.biostar_url+"/p/new/post/")}}),h.addMenu({icon:"fa-search",title:"Search",tooltip:"Search help for this tool (Biostar)",onclick:function(){window.open(b.biostar_url+"/local/search/page/?q="+b.name)}})),h.addMenu({icon:"fa-share",title:"Share",tooltip:"Share this tool",onclick:function(){prompt("Copy to clipboard: Ctrl+C, Enter",window.location.origin+Galaxy.root+"root?tool_id="+b.id)}}),Galaxy.user&&Galaxy.user.get("is_admin")&&h.addMenu({icon:"fa-download",title:"Download",tooltip:"Download this tool",onclick:function(){window.location.href=Galaxy.root+"api/tools/"+b.id+"/download"}}),b.requirements&&b.requirements.length>0&&h.addMenu({icon:"fa-info-circle",title:"Requirements",tooltip:"Display tool requirements",onclick:function(){this.visible?(this.visible=!1,a.form.message.update({message:""})):(this.visible=!0,a.form.message.update({persistent:!0,message:e.requirements(b),status:"info"}))}}),b.sharable_url&&h.addMenu({icon:"fa-external-link",title:"See in Tool Shed",tooltip:"Access the repository",onclick:function(){window.open(b.sharable_url)}}),{menu:h,versions:d}},_footer:function(){var a=this.options;if(""!=a.help&&this.form.$el.append(e.help(a)),a.citations){var b=$("<div/>"),c=new f.ToolCitationCollection;c.tool_id=a.id;var d=new g.CitationListView({el:b,collection:c});d.render(),c.fetch(),this.form.$el.append(b)}}})});
//# sourceMappingURL=../../../maps/mvc/tools/tools-form-base.js.map