webpackJsonp([3],{153:function(e,i,t){"use strict";(function(e,i){function n(e){return e&&e.__esModule?e:{default:e}}var s=t(0),a=n(s),o=t(66),r=n(o),l=t(3),d=n(l),c=t(44),h=n(c),u=a.default;window.app=function(t,n){window.Galaxy=new r.default.GalaxyApp(t,n),Galaxy.debug("login app");var s=encodeURI(t.redirect);if(!t.show_welcome_with_login){var o=a.default.param({use_panels:"True",redirect:s});return void(window.location.href=Galaxy.root+"user/login?"+o)}var l=e.View.extend({initialize:function(i){this.page=i,this.model=new e.Model({title:(0,d.default)("Login required")}),this.setElement(this._template())},render:function(){this.page.$("#galaxy_main").prop("src",t.welcome_url)},_template:function(){return'<iframe src="'+t.root+"user/login?"+u.param({redirect:s})+'" frameborder="0" style="width: 100%; height: 100%;"/>'}});u(function(){Galaxy.page=new h.default.View(i.extend(t,{Right:l}))})}}).call(i,t(2),t(1))},44:function(e,i,t){"use strict";(function(e,n,s){function a(e){return e&&e.__esModule?e:{default:e}}Object.defineProperty(i,"__esModule",{value:!0});var o=t(69),r=a(o),l=t(43),d=a(l),c=t(9),h=a(c),u=t(4),f=a(u),v=e.View.extend({el:"body",className:"full-content",_panelids:["left","right"],initialize:function(i){var t=this;this.config=n.defaults(i.config||{},{message_box_visible:!1,message_box_content:"",message_box_class:"info",show_inactivity_warning:!1,inactivity_box_content:""}),Galaxy.modal=this.modal=new h.default.View,Galaxy.display=this.display=function(e){e.title?(f.default.setWindowTitle(e.title),e.allow_title_display=!1):(f.default.setWindowTitle(),e.allow_title_display=!0),t.center.display(e)},Galaxy.router=this.router=i.Router&&new i.Router(t,i),this.masthead=new r.default.View(this.config),this.center=new d.default.CenterPanel,this.$el.attr("scroll","no"),this.$el.html(this._template()),this.$("#masthead").replaceWith(this.masthead.$el),this.$("#center").append(this.center.$el),this.$el.append(this.masthead.frame.$el),this.$el.append(this.modal.$el),this.$messagebox=this.$("#messagebox"),this.$inactivebox=this.$("#inactivebox"),this.panels={},n.each(this._panelids,function(e){var n=e.charAt(0).toUpperCase()+e.slice(1),s=i[n];if(s){var a=new s(t,i);t[a.toString()]=a,t.panels[e]=new d.default.SidePanel({id:e,el:t.$("#"+e),view:a})}}),this.render(),this.router&&e.history.start({root:Galaxy.root,pushState:!0})},render:function(){return s(".select2-hidden-accessible").remove(),this.masthead.render(),this.renderMessageBox(),this.renderInactivityBox(),this.renderPanels(),this._checkCommunicationServerOnline(),this},renderMessageBox:function(){if(this.config.message_box_visible){var e=this.config.message_box_content||"",i=this.config.message_box_class||"info";this.$el.addClass("has-message-box"),this.$messagebox.attr("class","panel-"+i+"-message").html(e).toggle(!!e).show()}else this.$el.removeClass("has-message-box"),this.$messagebox.hide();return this},renderInactivityBox:function(){if(this.config.show_inactivity_warning){var e=this.config.inactivity_box_content||"",i=s("<a/>").attr("href",Galaxy.root+"user/resend_verification").text("Resend verification");this.$el.addClass("has-inactivity-box"),this.$inactivebox.html(e+" ").append(i).toggle(!!e).show()}else this.$el.removeClass("has-inactivity-box"),this.$inactivebox.hide();return this},renderPanels:function(){var e=this;return n.each(this._panelids,function(i){var t=e.panels[i];t?t.render():(e.$("#center").css(i,0),e.$("#"+i).hide())}),this},_template:function(){return['<div id="everything">','<div id="background"/>','<div id="masthead"/>','<div id="messagebox"/>','<div id="inactivebox" class="panel-warning-message" />','<div id="left" />','<div id="center" />','<div id="right" />',"</div>",'<div id="dd-helper" />'].join("")},toString:function(){return"PageLayoutView"},_checkCommunicationServerOnline:function(){var e=window.Galaxy.config.communication_server_host,i=window.Galaxy.config.communication_server_port,t=window.Galaxy.user.attributes.preferences,n=s("#show-chat-online");t&&-1!=["1","true"].indexOf(t.communication_server)?s.ajax({url:e+":"+i}).success(function(e){null!==window.Galaxy.user.id&&"hidden"===n.css("visibility")&&n.css("visibility","visible")}).error(function(e){n.css("visibility","hidden")}):n.css("visibility","hidden")}});i.default={View:v}}).call(i,t(2),t(1),t(0))}},[153]);