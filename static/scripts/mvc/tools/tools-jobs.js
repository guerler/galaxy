define(["utils/utils","mvc/tools/tools-template"],function(a,b){return{submit:function(c,d,e){var f=this,g={tool_id:d.id,tool_version:d.version,inputs:c.data.create()};return c.trigger("reset"),this._validation(c,g)?(a.emit.debug("tools-jobs::submit()","Validation complete.",g),void a.request({type:"POST",url:galaxy_config.root+"api/tools",data:g,success:function(a){e&&e(),c.$el.replaceWith(b.success(a)),f._refreshHdas()},error:function(d){if(e&&e(),a.emit.debug("tools-jobs::submit","Submission failed.",d),d&&d.err_data){var f=c.data.matchResponse(d.err_data);for(var h in f){c.highlight(h,f[h]);break}}else c.modal.show({title:"Job submission failed",body:d&&d.err_msg||b.error(g),buttons:{Close:function(){c.modal.hide()}}})}})):(a.emit.debug("tools-jobs::submit()","Submission canceled. Validation failed."),void(e&&e()))},_validation:function(b,c){var d=c.inputs,e=-1,f=null;for(var g in d){var h=d[g],i=b.data.match(g),j=b.field_list[i],k=b.input_list[i];if(i&&k&&j){if(!k.optional&&null==h)return b.highlight(i),!1;if(h&&h.batch){var l=h.values.length,m=null;if(l>0&&(m=h.values[0]&&h.values[0].src),m)if(null===f)f=m;else if(f!==m)return b.highlight(i,"Please select either dataset or dataset list fields for all batch mode fields."),!1;if(-1===e)e=l;else if(e!==l)return b.highlight(i,"Please make sure that you select the same number of inputs for all batch mode fields. This field contains <b>"+l+"</b> selection(s) while a previous field contains <b>"+e+"</b>."),!1}}else a.emit.debug("tools-jobs::_validation()","Retrieving input objects failed.")}return!0},_refreshHdas:function(a,b){parent.Galaxy&&parent.Galaxy.currHistoryPanel&&parent.Galaxy.currHistoryPanel.refreshContents(a,b)}}});
//# sourceMappingURL=../../../maps/mvc/tools/tools-jobs.js.map