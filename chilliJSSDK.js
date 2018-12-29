(function () {
    
    window.ChilliJSSDK = window.ChilliJSSDK || {
            _version: "2.0.8.40",
            _thisPath: "",

            callid: null,

            SessionS: {},
            userAgent: null,
            loglevel:"debug",
            microInfos:null,
            microId:null,
            
            STATUS:{
            // call states
            STATUS_NULL: 0,
            STATUS_CONSULTATIONING: 1,
            STATUS_RECONNECTING:2,
            STATUS_CONNECTED: 3,
            STATUS_ALTERNATEING:4,
            STATUS_CONFERENCEING:5,
            STATUS_SINGLESTEPCONFERENCEING:6
            },
            
            Cause:{
                Alternate:0,
                CallCancelled:1,
                CallNotAnswered:2,
                Consultation:3,
                MakeCall:4,
                NewCall:5,
                NormalClearing:6,
                SingleStepConference:7,
                Conference:8,
                SingleStepTransfer:9,
                Transfer:10
            },
            /**
            *设置日志级别
            * @param level:error,warn,info,debug
            **/
            setLogLevel:function(level)
            {
                ChilliJSSDK.debug("setLogLevel:"+level);
                if(level == "error" || level == "warn" || level == "info" || level == "debug"){
                    ChilliJSSDK.loglevel = level;
                    //SIP.setDebugLevel(ChilliJSSDK.loglevel);
                }
                else {
                    ChilliJSSDK.error("set log level error, not recognize:"+level);
                }
            },
            
            /**
             * 初始化
             * @param s_webrtc_type
             * @param s_fps
             * @param s_mbwu maxBandwidthUp (kbps)
             * @param s_mbwd maxBandwidthUp (kbps)
             * @param s_za ZeroArtifacts
             * @param s_ndb NativeDebug
             */
            Init: function () {
                ChilliJSSDK.debug("Init:");
                ChilliJSSDK.info("ChilliJSSDK version=" + ChilliJSSDK._version);
                
                if (typeof(SIP) == "undefined") {
                    ChilliJSSDK.error("SIP not init");
                    return false;
                }
				navigator.mediaDevices = navigator.mediaDevices || {};
				navigator.mediaDevices.getUserMedia = navigator.mediaDevices.getUserMedia || navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
				
				if(!navigator.mediaDevices.getUserMedia){
					ChilliJSSDK.error("not support getUserMedia");
					return false;
				}
				
				if(!navigator.mediaDevices.getUserMedia.bind){
					navigator.mediaDevices.getUserMedia.bind = function(obj){
						return navigator.mediaDevices.getUserMedia;
					};
				}
				
				window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection || window.msRTCPeerConnection;
				if(!window.RTCPeerConnection){
					ChilliJSSDK.error("not support RTCPeerConnection");
					return false;
				}
				
				window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription || window.msRTCSessionDescription;
				if(!window.RTCSessionDescription){
					ChilliJSSDK.error("not support RTCSessionDescription");
					return false;
				}
				
                ChilliJSSDK.info("init success");
				return true;
            },
            
            /**
             * 注册
             * @param txtRealm
             * @param sipid
             * @param sipurl
             * @param pwd
             * @param txtDisplayName
             * @param txtWebsocketUrl
             * @param txtICEServer
             */
            Login: function (txtRealm, sipid, sipurl, pwd, txtDisplayName, txtWebsocketUrl, txtICEServer) {
                // catch exception for IE (DOM not ready)
                ChilliJSSDK.debug("Login,Realm:" + txtRealm + ",SipID:" + sipid + ",SipUrl:" + sipurl + ",Pwd:" + pwd + ",DisplayName:" + txtDisplayName + ",WebSocketUrl:" + txtWebsocketUrl + ",ICEServer:" + txtICEServer);

                ChilliJSSDK.userAgent = new SIP.UA({
                  uri: sipurl,
                  wsServers: txtWebsocketUrl,
                  authorizationUser: sipid,
                  password: pwd,
                  displayName: txtDisplayName,
                  replaces: SIP.C.supported.SUPPORTED,
                  traceSip: true,
                  //register: true,
                  autostart: false,
                  allowLegacyNotifications: true,
                  //hackIpInContact: true,
                  //hackViaTcp: true,
                  sessionDescriptionHandlerFactoryOptions: {
                      constraints: {
                          audio:{deviceId:ChilliJSSDK.microId},
                          video:false
					  },
                      //iceCheckingTimeout: 15000,
                      peerConnectionOptions: {
                          rtcConfiguration:{
                              iceServers:eval(txtICEServer) || []
                          }
                      }
                  },
                  registerExpires: 300,
                  wsServerMaxReconnection: 1,
                  log:{
                      level:ChilliJSSDK.loglevel === 'info' ? 'log': ChilliJSSDK.loglevel
                  },
                  userAgentString: "Avaya html5_client"
                });  
                
                ChilliJSSDK.userAgent.on('connecting', function (args) {
                    ChilliJSSDK.debug('connecting attempts:' + args.attempts);
                });
                
                ChilliJSSDK.userAgent.on('connected', function () {
                    ChilliJSSDK.debug('connected');
                });
                
                ChilliJSSDK.userAgent.on('disconnected', function(args){
                    var msg = {};
                    args = args || {};
                    args.transport = args.transport || {};
                    msg.reason = args.code?args.code:args.transport.lastTransportError.code;
                    msg.msg = args.transport.lastTransportError.reason ? args.transport.lastTransportError.reason:"WebSocket connection error";
                    ChilliJSSDK.debug("disconnected:" + JSON.stringify(msg));
                    if(ChilliJSSDK.userAgent != null && ChilliJSSDK.userAgent.status === SIP.UA.C.STATUS_STARTING){
                        ChilliJSSDK.error("登录失败:" + JSON.stringify(msg));
                        if (typeof(ChilliJSSDK.onRegistered) == "function") {
                            ChilliJSSDK.onRegistered(msg);
                        }
                        
                        ChilliJSSDK.userAgent.stop();
                        ChilliJSSDK.userAgent = null;
                    }
                    
                });
                
                ChilliJSSDK.userAgent.on('registered', function(args){
                    
                    if(ChilliJSSDK.userAgent.IsRegeisted === true){
                        return;
                    }
                    
                    ChilliJSSDK.userAgent.IsRegeisted = true;
                    
                    ChilliJSSDK.debug("registered:");
                    ChilliJSSDK.debug("登录成功");
                    if(typeof(ChilliJSSDK.onRegistered) == "function"){
						var msg = {};
						msg.reason = 200;//注册成功
                        ChilliJSSDK.onRegistered(msg);
                    }
                });
                
                ChilliJSSDK.userAgent.on('unregistered', function(response,cause){

                    var msg = {};
                    response = response || {};
                    msg.reason = response.status_code ? response.status_code:504;
                    msg.msg = response.reason_phrase?response.reason_phrase:cause;
                    ChilliJSSDK.debug("unregistered:" + JSON.stringify(msg));
                    if (ChilliJSSDK.userAgent != null){
                        if(ChilliJSSDK.userAgent.status === SIP.UA.C.STATUS_READY){
                            ChilliJSSDK.info("登录失败:" + JSON.stringify(msg));
                            if (typeof(ChilliJSSDK.onRegistered) == "function") {
                                ChilliJSSDK.onRegistered(msg);
                            }
                        }
                        else{
                            ChilliJSSDK.info("登出成功");
                            if (typeof(ChilliJSSDK.onLogout) == "function") {
                                ChilliJSSDK.onLogout();
                            }
                        }
                    }
                    ChilliJSSDK.userAgent.stop();
                    ChilliJSSDK.userAgent = null;
                });
                
                ChilliJSSDK.userAgent.on('registrationFailed', function (response, cause) {
                    var msg = {};
                    response = response || {};
                    msg.reason = response.status_code? response.status_code:404;
                    msg.msg = response.reason_phrase?response.reason_phrase:cause;
                    ChilliJSSDK.debug("registrationFailed:" + JSON.stringify(msg));
                    ChilliJSSDK.error("登录失败:" + JSON.stringify(msg));
                    if (typeof(ChilliJSSDK.onRegistered) == "function") {
                        ChilliJSSDK.onRegistered(msg);
                    }
                });
                
                ChilliJSSDK.userAgent.on('invite', function (session) {
                    var call_id = session.id.substr(0,session.id.indexOf(session.from_tag));
                    ChilliJSSDK.debug('invite:' + call_id);
                    ChilliJSSDK.SessionS[call_id] = session; 
                    ChilliJSSDK.callid = call_id;
                    ChilliJSSDK.bindEvent(session);
                    
                    var sRemoteNumber = session.remoteIdentity.uri.user || 'unknown';
                    var msg = {"callid": call_id, "caller": sRemoteNumber};
                    ChilliJSSDK.debug("onReceived:" + JSON.stringify(msg));
                    ChilliJSSDK.info("呼入号码为 [" + sRemoteNumber + "]");
                    if (typeof(ChilliJSSDK.onReceived) == "function") {
                        ChilliJSSDK.onReceived(msg);
                    }
                    
                });
                
                ChilliJSSDK.userAgent.on('message', function (message) {
                    ChilliJSSDK.debug("message:" + message.body);
                });
                
                ChilliJSSDK.userAgent.start();

            },
            // 注销
            Logout: function () {
                ChilliJSSDK.debug("Logout:");
                if (ChilliJSSDK.userAgent) {
                    ChilliJSSDK.userAgent.stop(); // shutdown all sessions
                }
                return 0;
            },
            /**
             * 获取版本号
             * @returns {string}
             */
            getVersion: function () {
                ChilliJSSDK.debug("getVersion:");
                return ChilliJSSDK._version;
            },
            
			onInfo:function(request) {
				var call_id = request.call_id;
				ChilliJSSDK.debug('info:' + call_id);
				var msg={callid:call_id};
				if(ChilliJSSDK.SessionS[call_id]._status === ChilliJSSDK.STATUS.STATUS_SINGLESTEPCONFERENCEING){
                    ChilliJSSDK.SessionS[call_id]._status = ChilliJSSDK.STATUS.STATUS_CONNECTED;
                    msg.cause = ChilliJSSDK.Cause.SingleStepConference;
					var status_code = parseInt(request.body.substr(0,request.body.indexOf(':')));
					
					if(status_code === 200){
						ChilliJSSDK.debug("onConferenced:"+JSON.stringify(msg));
						if (typeof(ChilliJSSDK.onConferenced) == "function") {
							ChilliJSSDK.onConferenced(msg);
						}
						ChilliJSSDK.debug('单步会议中');
					}
					else{
						msg.reason = status_code;
						msg.msg = request.body.substr(request.body.indexOf(':')+1);
						ChilliJSSDK.debug("onConferenceFailed:"+JSON.stringify(msg));
						if (typeof(ChilliJSSDK.onConferenceFailed) == "function") {
							ChilliJSSDK.onConferenceFailed(msg);
						}
						ChilliJSSDK.debug('单步会议失败:' + msg.reason);
					}
				    return;
                }
			},

            //绑定事件
            bindEvent: function(session){
                session.on('progress', function (response,cause) {
                    //debugger;
                    ChilliJSSDK.debug('progress');
                    var msg = {callid: response.call_id,msg:cause};
                    ChilliJSSDK.callid = response.call_id;
                    if(ChilliJSSDK.SessionS[response.call_id]._status === ChilliJSSDK.STATUS.STATUS_CONSULTATIONING){
                        msg.cause = ChilliJSSDK.Cause.Consultation;
                    }
                    if(response.status_code == 100){
                        ChilliJSSDK.debug("onOriginated:" + JSON.stringify(msg));
                        ChilliJSSDK.info("外呼中...");
                        if (typeof(ChilliJSSDK.onOriginated) == "function") {
                            ChilliJSSDK.onOriginated(msg);
                        }
                    }
                    else if(response.status_code == 180 || response.status_code == 183){
                        
						if(response.status_code == 183){
							ChilliJSSDK.setupRemoteMedia(ChilliJSSDK.SessionS[ChilliJSSDK.callid]);
						}
						
                        ChilliJSSDK.debug("onDelivered:" + JSON.stringify(msg));
                        ChilliJSSDK.debug('远端振铃...');
                        if (typeof(ChilliJSSDK.onDelivered) == "function") {
                            ChilliJSSDK.onDelivered(msg);
                        }
                    }
                        
                });
                    
                session.on('accepted', function (data, cause) {
                    ChilliJSSDK.debug('accepted:');
                    ChilliJSSDK.callid = data.call_id || this.id.substr(0,this.id.indexOf(this.from_tag));
                    var msg = {"callid": ChilliJSSDK.callid,"msg":cause};
                    if(ChilliJSSDK.SessionS[ChilliJSSDK.callid]._status === ChilliJSSDK.STATUS.STATUS_CONSULTATIONING){
                        msg.cause = ChilliJSSDK.Cause.Consultation;
                    }

					ChilliJSSDK.setupRemoteMedia(ChilliJSSDK.SessionS[ChilliJSSDK.callid]);

                    ChilliJSSDK.debug("onEstablished:" + JSON.stringify(msg));
                    ChilliJSSDK.info("通话中");
                    if (typeof(ChilliJSSDK.onEstablished) == "function") {
                        ChilliJSSDK.onEstablished(msg);
                    }
                        
                });
                    
                session.on('rejected', function (response, cause) {
                    ChilliJSSDK.debug('rejected:' + cause);
                });
                
                session.on('failed', function (response, cause) {
                    ChilliJSSDK.debug('failed:'+cause);
                });
                    
                session.on('terminated', function(message, cause) {
                    ChilliJSSDK.debug('terminated:' + cause);
                    
                    var call_id = session.id.substr(0,session.id.indexOf(session.from_tag));
                    if(!ChilliJSSDK.SessionS[call_id]){
                        return;
                    }
                    ChilliJSSDK.callid = call_id;
                    message = message || {};
                    var msg = {"callid":call_id,"reason":message.status_code ? message.status_code:200,"msg":cause?cause:"OK"};

                    if(ChilliJSSDK.SessionS[ChilliJSSDK.callid]._status === ChilliJSSDK.STATUS.STATUS_CONSULTATIONING){
                        msg.cause = ChilliJSSDK.Cause.Consultation;
                    }

                    ChilliJSSDK.debug("onCallCleared:" + JSON.stringify(msg));
                    ChilliJSSDK.info("通话已挂断:" + msg.reason);
                    if(typeof(ChilliJSSDK.onCallCleared) == "function"){
                        ChilliJSSDK.onCallCleared(msg);
                    }

                    ChilliJSSDK.cleanupMedia(ChilliJSSDK.SessionS[call_id]);
                    ChilliJSSDK.SessionS[call_id]._audio && document.body.removeChild(ChilliJSSDK.SessionS[call_id]._audio);
                    delete ChilliJSSDK.SessionS[call_id];
                });
                    
                session.on('cancel', function() {
                    ChilliJSSDK.debug('cancel');
                });
                
                session.on('reinvite', function(session) {
                    ChilliJSSDK.debug('reinvite');
                });

                session.on('hold', function (session,cause){
                    ChilliJSSDK.debug('hold');
                });
                    
                session.on('unhold',function(session,cause){
                    ChilliJSSDK.debug('unhold');
                });

                session.on('reinviteAccepted',function(session){
                    var call_id = session.id.substr(0,session.id.indexOf(session.from_tag));
                    var msg={callid:call_id};
                    ChilliJSSDK.callid = call_id;
                    ChilliJSSDK.debug('reinviteAccepted:' + JSON.stringify(msg));
					                        
                    if(ChilliJSSDK.SessionS[call_id]._status === ChilliJSSDK.STATUS.STATUS_CONFERENCEING){
						ChilliJSSDK.SessionS[call_id]._status = ChilliJSSDK.STATUS.STATUS_CONNECTED;
                        msg.cause = ChilliJSSDK.Cause.Conference;
						 ChilliJSSDK.debug("onConferenced:"+JSON.stringify(msg));
                        if (typeof(ChilliJSSDK.onConferenced) == "function") {
                            ChilliJSSDK.onConferenced(msg);
                        }
                        ChilliJSSDK.debug('咨询会议中');
						return;
                    }

                    /*
					if(ChilliJSSDK.SessionS[call_id]._status === ChilliJSSDK.STATUS.STATUS_SINGLESTEPCONFERENCEING){
                        ChilliJSSDK.SessionS[call_id]._status = ChilliJSSDK.STATUS.STATUS_CONNECTED;
                        msg.cause = ChilliJSSDK.Cause.SingleStepConference;
                        ChilliJSSDK.debug("onConferenced:"+JSON.stringify(msg));
                        if (typeof(ChilliJSSDK.onConferenced) == "function") {
                            ChilliJSSDK.onConferenced(msg);
                        }
                        ChilliJSSDK.debug('单步会议中');
						return;
                    }
					*/

                    if(this.local_hold === true){
                        
                        if(ChilliJSSDK.SessionS[call_id]._status === ChilliJSSDK.STATUS.STATUS_CONSULTATIONING){
                            var result = ChilliJSSDK.MakeCall(ChilliJSSDK.SessionS[call_id]._consultNumber,ChilliJSSDK.SessionS[call_id]._userdata);
                            msg.newCall = result.callid;
                            msg.cause = ChilliJSSDK.Cause.Consultation;
                            ChilliJSSDK.SessionS[msg.newCall]._status = ChilliJSSDK.STATUS.STATUS_CONSULTATIONING;
                            ChilliJSSDK.SessionS[call_id]._newCall = result.callid;
                        }
                        
                        if(ChilliJSSDK.SessionS[call_id]._status === ChilliJSSDK.STATUS.STATUS_ALTERNATEING){
                            msg.cause = ChilliJSSDK.Cause.Alternate;
                        }

                        ChilliJSSDK.debug("onHeld:"+JSON.stringify(msg));
                        if (typeof(ChilliJSSDK.onHeld) == "function") {
                            ChilliJSSDK.onHeld(msg);
                        }
                        ChilliJSSDK.debug('通话保持');
                    }
                    else if(this.local_hold === false){
                        
                        if(ChilliJSSDK.SessionS[call_id]._status === ChilliJSSDK.STATUS.STATUS_RECONNECTING){
                            ChilliJSSDK.SessionS[call_id]._status = ChilliJSSDK.STATUS.STATUS_CONNECTED;
                            msg.cause = ChilliJSSDK.Cause.Consultation;
                        }
                        
                        if(ChilliJSSDK.SessionS[call_id]._status === ChilliJSSDK.STATUS.STATUS_ALTERNATEING){
                            ChilliJSSDK.SessionS[call_id]._status = ChilliJSSDK.STATUS.STATUS_CONNECTED;
                            msg.cause = ChilliJSSDK.Cause.Alternate;
                        }
                        ChilliJSSDK.debug("onRetrieved:" + JSON.stringify(msg));
                        if (typeof(ChilliJSSDK.onRetrieved) == "function") {
                            ChilliJSSDK.onRetrieved(msg);
                        }
                        ChilliJSSDK.debug('通话恢复');
                    }
                });
                    
                session.on('reinviteFailed',function(session){
                    var call_id = session.id.substr(0,session.id.indexOf(session.from_tag));
                    var msg={callid:call_id, reason:session.status_code || 504, msg:session.reason_phrase || "error"};
                    ChilliJSSDK.callid = call_id;
                    ChilliJSSDK.debug('reinviteFailed:' + JSON.stringify(msg));
                    if(this.local_hold === true){
                        ChilliJSSDK.debug("onHeldFailed:"+JSON.stringify(msg));
                        if (typeof(ChilliJSSDK.onHeldFailed) == "function") {
                            ChilliJSSDK.onHeldFailed(msg);
                        }
                        ChilliJSSDK.error('通话保持失败');
                    }
                    else if(this.local_hold === false){
                        ChilliJSSDK.debug("onRetrieveFailed:" + JSON.stringify(msg));
                        if (typeof(ChilliJSSDK.onRetrieveFailed) == "function") {
                            ChilliJSSDK.onRetrieveFailed(msg);
                        }
                        ChilliJSSDK.debug('通话恢复失败');
                    }
                });
                    
                session.on('replaced', function (newSession) {
                    ChilliJSSDK.debug('replaced');
                });
                    
                session.on('dtmf', function(request, dtmf) {
                    ChilliJSSDK.debug('dtmf');
                    var msg = {"callid": request.call_id,"dtmf":dtmf};
                    ChilliJSSDK.callid = request.call_id;
                    ChilliJSSDK.debug("onDtmfReceived:" + JSON.stringify(msg));
                    if (typeof(ChilliJSSDK.onDtmfReceived) == "function") {
                        ChilliJSSDK.onDtmfReceived(msg);
                    }
                });
                    
                session.on('bye', function(request) {
                    //debugger;
                    ChilliJSSDK.debug('bye:' + request.call_id);
                    var msg = {"callid":request.call_id,"reason":200,"msg":request.method};
                    ChilliJSSDK.callid = request.call_id;

					if(ChilliJSSDK.SessionS[request.call_id]._status === ChilliJSSDK.STATUS.STATUS_CONFERENCEING){
                        msg.cause = ChilliJSSDK.Cause.Conference;
                    }

                    ChilliJSSDK.debug("onCallCleared:" + JSON.stringify(msg));
                    ChilliJSSDK.info("通话已挂断:" + msg.reason);
                    
                    if(typeof(ChilliJSSDK.onCallCleared) == "function"){
                        ChilliJSSDK.onCallCleared(msg);
                    }

                    ChilliJSSDK.cleanupMedia(ChilliJSSDK.SessionS[request.call_id]);
                    ChilliJSSDK.SessionS[request.call_id]._audio && document.body.removeChild(ChilliJSSDK.SessionS[request.call_id]._audio);
                    delete ChilliJSSDK.SessionS[request.call_id];
                });
                    
                session.on('referRequested', function(context) {
                    ChilliJSSDK.debug('referRequested');
                });
                
                session.on('referRequestAccepted', function (referClientContext) {
                    ChilliJSSDK.debug('referRequestAccepted');
                });
                
                session.on('referRequestRejected', function (referClientContext) {
                    var call_id = referClientContext.call_id;
                    var msg = {callid:call_id,reason:referClientContext.status_code,msg:referClientContext.reason_phrase};
                    ChilliJSSDK.callid = referClientContext.call_id;
                    ChilliJSSDK.debug('referRequestRejected:' + JSON.stringify(msg));
                    ChilliJSSDK.debug("onTransferFailed:" + JSON.stringify(msg));
                    if (typeof(ChilliJSSDK.onTransferFailed) == "function") {
                        ChilliJSSDK.onTransferFailed(msg);
                    }
                    ChilliJSSDK.error('呼叫转接失败');
                });
                
                session.on('referProgress', function(referClientContext) {
                    ChilliJSSDK.debug('referProgress');
                });
                
                session.on('referAccepted', function (referClientContext) {
                    ChilliJSSDK.debug('referAccepted');
                });
                
                session.on('referRejected', function (referClientContext) {
                    var call_id = referClientContext.call_id;
                    var msg = {callid:call_id,reason:referClientContext.status_code,msg:referClientContext.reason_phrase};
                    ChilliJSSDK.callid = call_id;
                    ChilliJSSDK.debug('referRejected:' + JSON.stringify(msg));
                    ChilliJSSDK.debug("onTransferFailed:" + JSON.stringify(msg));
                    if (typeof(ChilliJSSDK.onTransferFailed) == "function") {
                        ChilliJSSDK.onTransferFailed(msg);
                    }
                    ChilliJSSDK.error('呼叫转接失败');
                });
                
                session.on('referInviteSent', function (referServerContext) {
                    ChilliJSSDK.debug('referInviteSent');
                });
                
                session.on('notify', function (request) {
                    var msg = {"callid": request.call_id};
                    ChilliJSSDK.callid = request.call_id;
                    ChilliJSSDK.debug('notify:' + JSON.stringify(msg));
                    ChilliJSSDK.debug("onTransferred:" + JSON.stringify(msg));
                    if (typeof(ChilliJSSDK.onTransferred) == "function") {
                        ChilliJSSDK.onTransferred(msg);
                        }
                    ChilliJSSDK.info('呼叫转接结束');
                });
                
                session.on('refer', function(context) {
                    var msg = {"callid": context.call_id};
                    ChilliJSSDK.callid = context.call_id;
                    ChilliJSSDK.debug('refer:' + JSON.stringify(msg));
                });
            },
            
            //呼叫
            MakeCall: function (called,userdata) {
                ChilliJSSDK.debug("MakeCall:" + called);
                var session = null;
                if (ChilliJSSDK.userAgent) {
                    // create call session
                    session = ChilliJSSDK.userAgent.invite(called, {sessionDescriptionHandlerOptions: {
                        constraints: {
                            audio:{deviceId:ChilliJSSDK.microId},
                            video: false
						}
                    },
					extraHeaders:[
						"P-User-to-User:" + (userdata ? typeof(userdata) === "string" ? userdata: JSON.stringify(userdata): "")
					],
					onInfo:ChilliJSSDK.onInfo,
					});
                    
                    if (session == null) {
                        
                        ChilliJSSDK.error('Failed to make call');
                        if (typeof(ChilliJSSDK.onMakeCallFailed) == "function") {
                            var msg = {};
                            msg.reason = 1;
                            msg.msg="make call failed";
                            ChilliJSSDK.onMakeCallFailed(msg);
                            ChilliJSSDK.debug("onMakeCallFailed:" + JSON.stringify(msg));
                            return {result:1};
                        }
                    }
                    
                    var call_id = session.id.substr(0,session.id.indexOf(session.from_tag));
                    ChilliJSSDK.debug("MakeCall:" + call_id);
                    ChilliJSSDK.bindEvent(session);

                    ChilliJSSDK.SessionS[call_id] = session;
                    ChilliJSSDK.callid = call_id;
                    return {result:0,callid:call_id};
                }
                else if (typeof(ChilliJSSDK.onMakeCallFailed) == "function") {
                    var msg = {};
                    msg.reason = 1;
                    msg.msg="未注册";
                    ChilliJSSDK.onMakeCallFailed(msg);
                    ChilliJSSDK.debug("onMakeCallFailed:" + JSON.stringify(msg));
                    return {result:1};
                }
                return {result:2};
            },
            //摘机
            AnswerCall: function (callid, userdata) {
                ChilliJSSDK.debug("AnswerCall:" + callid);
                if (callid && ChilliJSSDK.SessionS[callid]) {
                    ChilliJSSDK.debug('Connecting...');
                    ChilliJSSDK.SessionS[callid].accept({extraHeaders:[
						"P-User-to-User:" + (userdata ? typeof(userdata) === "string" ? userdata: JSON.stringify(userdata): "")
					],
					onInfo:ChilliJSSDK.onInfo
					});
                }
            },
            // 挂断 (SIP BYE or CANCEL)
            ClearCall: function (callid, reason) {
                ChilliJSSDK.debug("ClearCall, callid:" + callid + ",reason:" + reason);
                if (callid) {
                    ChilliJSSDK.debug('Terminating the call...'+callid);
                    
                    try{
                        ChilliJSSDK.SessionS[callid].terminate({status_code:reason});
                    }
                    catch(e) {
                        delete ChilliJSSDK.SessionS[callid];
                    };
                }
                else{
                    if(callid === null)
                        return;

                    ChilliJSSDK.debug('Terminating all call...');
                    var call_id;
                    for(call_id in ChilliJSSDK.SessionS){
                        ChilliJSSDK.debug('Terminating the call...'+call_id);
                        try {
                            ChilliJSSDK.SessionS[call_id].terminate({status_code:reason});
                        }
                        catch(e) {
                            delete ChilliJSSDK.SessionS[call_id];
                        };
                    }
                    
                }
                return 0;
            },
            //发送DTMF
            SendDTMF: function (callid, c) {
                var err = 1;
                if (callid && ChilliJSSDK.SessionS[callid] && c) {
                    err = ChilliJSSDK.SessionS[callid].dtmf(c);
                }
                ChilliJSSDK.debug("SendDTMF,callid:" + callid + ",c:" + c + ",result:" + err);
            },
            // 盲转
            SingleStepTransferCall: function (callid, s_destination, userdata) {
                ChilliJSSDK.debug("SingleStepTransferCall,callid:" + callid+ ",destination:" + s_destination);
                if (callid && ChilliJSSDK.SessionS[callid]) {
                    ChilliJSSDK.debug('SingleStepTransfering the call...'+callid);                    
                    var session = ChilliJSSDK.SessionS[callid].refer(s_destination,{extraHeaders:[
						"P-User-to-User:" + (userdata ? typeof(userdata) === "string" ? userdata: JSON.stringify(userdata): "")
					]});
                    return 0;
    
                }
                else{
                    ChilliJSSDK.error("SingleStepTransferCall, the call is not exist.");
                    return 1;
                }
            },
			
			// 咨询后转接
            TransferCall: function (heldCall, transferTargetCall) {
                ChilliJSSDK.debug("TransferCall,heldCall:" + heldCall+ ",transferTargetCall:" + transferTargetCall);
                if (heldCall && ChilliJSSDK.SessionS[heldCall] && transferTargetCall && ChilliJSSDK.SessionS[transferTargetCall]) {
                    ChilliJSSDK.debug('Transfering the call...');                    
                    var session = ChilliJSSDK.SessionS[heldCall].refer(ChilliJSSDK.SessionS[transferTargetCall]);
                    return 0;
    
                }
                else{
                    ChilliJSSDK.error("TransferCall, the call is not exist.");
                    return 1;
                }
            },
            /**
             * 保持
             * @param callid
             * @returns {number}
             * @constructor
             */
            HoldCall: function (callid) {
                ChilliJSSDK.debug("HoldCall,callid:" + callid);
                if (callid && ChilliJSSDK.SessionS[callid]) {
                    ChilliJSSDK.SessionS[callid].hold();
                    ChilliJSSDK.debug('Holding the call...'+callid);
                    return 0;
                } else {
                    ChilliJSSDK.error("HoldCall, the call is not exist.");
                    return 1;
                }
            },
            /**
             * 恢复
             * @param callid
             * @returns {number}
             * @constructor
             */
            RetrieveCall: function (callid) {
                ChilliJSSDK.debug("RetrieveCall,callid:" + callid);
                if (callid && ChilliJSSDK.SessionS[callid]) {
                    ChilliJSSDK.SessionS[callid].unhold();
                    ChilliJSSDK.debug('Retrieve the call...' + callid);                    
                    return 0;
                  
                } else {
                    ChilliJSSDK.error("RetrieveCall, the call is not exist.");
                    return 2;
                }
            },
            
            //咨询
            ConsultationCall:function(callid,called, userdata){
                ChilliJSSDK.debug("ConsultationCall,callid:" + callid + ",called:" + called);
                if (callid && ChilliJSSDK.SessionS[callid]) {
                    ChilliJSSDK.SessionS[callid]._status = ChilliJSSDK.STATUS.STATUS_CONSULTATIONING;
                    ChilliJSSDK.SessionS[callid]._consultNumber = called;
                    ChilliJSSDK.SessionS[callid]._userdata = userdata;
                    ChilliJSSDK.SessionS[callid].hold();
                    ChilliJSSDK.debug('hold the call...' + callid);
                    //ChilliJSSDK.MakeCall(called);                    
                    return 0;
                  
                } else {
                    ChilliJSSDK.error("ConsultationCall, the call is not exist.");
                    return 3;
                }
            },
            
            /**
             * 取消咨询
             * @param callid
             * @constructor
             */
            ReconnectCall: function (activeCall, heldCall) {
                ChilliJSSDK.debug("ReconnectCall,activeCall:" + activeCall+",heldCall:" + heldCall);
                if (heldCall && ChilliJSSDK.SessionS[heldCall]) {
                    ChilliJSSDK.SessionS[heldCall]._status = ChilliJSSDK.STATUS.STATUS_RECONNECTING;
                    ChilliJSSDK.debug('ReconnectCall the call...' + heldCall);                    
                    ChilliJSSDK.SessionS[heldCall].unhold();
                }
                else {
                    ChilliJSSDK.error("ReconnectCall, the call is not exist.");
                }

                ChilliJSSDK.ClearCall(activeCall);

            },
            
            //切换通话
            AlternateCall:function (activeCall,otherCall){
                ChilliJSSDK.debug("AlternateCall,activeCall:" + activeCall+",otherCall:" + otherCall);
                if (!activeCall || !ChilliJSSDK.SessionS[activeCall]){
                    ChilliJSSDK.error("AlternateCall, the activeCall is not exist.");
                    return 1;
                }
                
                if (!otherCall || !ChilliJSSDK.SessionS[otherCall]){
                    ChilliJSSDK.error("AlternateCall, the otherCall is not exist.");
                    return 1;
                }
                ChilliJSSDK.SessionS[activeCall]._status = ChilliJSSDK.STATUS.STATUS_ALTERNATEING;
                ChilliJSSDK.SessionS[otherCall]._status = ChilliJSSDK.STATUS.STATUS_ALTERNATEING;
                ChilliJSSDK.HoldCall(activeCall);
                ChilliJSSDK.RetrieveCall(otherCall);
            },
			
			//咨询后会议
            ConferenceCall:function (heldCall, otherCall){
                ChilliJSSDK.debug("ConferenceCall,otherCall:" + otherCall+",heldCall:" + heldCall);
                if (!heldCall || !ChilliJSSDK.SessionS[heldCall]){
                    ChilliJSSDK.error("ConferenceCall, the heldCall is not exist.");
                    return 1;
                }
                
                if (!otherCall || !ChilliJSSDK.SessionS[otherCall]){
                    ChilliJSSDK.error("ConferenceCall, the otherCall is not exist.");
                    return 1;
                }
				ChilliJSSDK.SessionS[heldCall]._status = ChilliJSSDK.STATUS.STATUS_CONFERENCEING;
				ChilliJSSDK.SessionS[heldCall].reinvite({extraHeaders:["P-Conf-MetaData: type=1;join=true"]});
				
				ChilliJSSDK.SessionS[otherCall]._status = ChilliJSSDK.STATUS.STATUS_CONFERENCEING;
				ChilliJSSDK.SessionS[otherCall].reinvite({extraHeaders:["P-Conf-MetaData: type=1;join=false"]});
            },
			
			//单步会议
            SingleStepConference:function (activeCall, destination,userdata){
                ChilliJSSDK.debug("SingleStepConference,activeCall:" + activeCall +",destination:" + destination);
                if (!activeCall || !ChilliJSSDK.SessionS[activeCall]){
                    ChilliJSSDK.error("SingleStepConference, the call is not exist.");
                    return 1;
                }
                
				ChilliJSSDK.SessionS[activeCall]._status = ChilliJSSDK.STATUS.STATUS_SINGLESTEPCONFERENCEING;
				ChilliJSSDK.SessionS[activeCall].reinvite({extraHeaders:["P-Conf-MetaData: type=0;user=" + destination + ";join=true",
				"P-User-to-User:" + (userdata ? typeof(userdata) === "string" ? userdata: JSON.stringify(userdata): "")
				]});

            },
            
            // 静音或恢复呼叫
            MuteCall: function () {
                if (ChilliJSSDK.ASession) {
                    var i_ret;
                    var bMute = !ChilliJSSDK.ASession.bMute;
                    ChilliJSSDK.info(bMute ? 'Mute the call...' : 'Unmute the call...');
                    i_ret = ChilliJSSDK.ASession.mute('audio'/*could be 'video'*/, bMute);
                    if (i_ret != 0) {
                        ChilliJSSDK.error('Mute / Unmute failed');
                        return;
                    }
                    ChilliJSSDK.ASession.bMute = bMute;
                }
            },

			setupRemoteMedia:function(session){
				if(!session){
					ChilliJSSDK.warn('setupRemoteMedia:session is null');
					return;
				}
				
				var audio = session._audio;
				if (!audio){
					audio = document.createElement("audio");
					//audio.setAttribute("id", "audio_remote");
					audio.setAttribute("autoplay", "true");
					document.body.appendChild(audio);
					session._audio = audio;

					session.sessionDescriptionHandler.on('addTrack', function () {
						ChilliJSSDK.setupRemoteMedia(this);
					}.bind(session));

					session.sessionDescriptionHandler.on('addStream', function () {
						ChilliJSSDK.setupRemoteMedia(this);
					}.bind(session));
				}
				
				ChilliJSSDK.debug('setupRemoteMedia:' + session.id.substr(0,session.id.indexOf(session.from_tag)));
				
				var pc = session.sessionDescriptionHandler.peerConnection;
				var remoteStream;

				if (pc.getReceivers) {
					remoteStream = new window.MediaStream();
					pc.getReceivers().forEach(function (receiver) {
						var track = receiver.track;
						if (track) {
						  remoteStream.addTrack(track);
						}
					});
				} else {
					remoteStream = pc.getRemoteStreams()[0];
				}
					
				if (audio) {
					ChilliJSSDK.debug(session.id.substr(0,session.id.indexOf(session.from_tag)) + ' set audio.srcObject:' + remoteStream);
					audio.srcObject = remoteStream;
					/*audio.play().catch(function (e) {
						ChilliJSSDK.error('play was rejected:' + e.message);
					}.bind(session));
					*/
				}
					
			},
			
			cleanupMedia:function(session){
				
				if (!session){
					ChilliJSSDK.warn('cleanupMedia:session is null');
					return;
				}
				
				ChilliJSSDK.debug('cleanupMedia:' + session.id.substr(0,session.id.indexOf(session.from_tag)));
				if(session._audio) {
					session._audio.srcObject = null;
					session._audio.pause();
				}
			},
			
			//getsystemdevice
			getSystemDevice:function(){
				ChilliJSSDK.microInfos = new Array();
				navigator.mediaDevices.enumerateDevices()
				.then(function(devices) {
					devices.forEach(function(device) {
						ChilliJSSDK.info(device.kind + ": " + device.label +
									" id = " + device.deviceId);
						if(device.kind === 'audioinput'){
						  ChilliJSSDK.microInfos.push(device);
						}
					  });
					})
					
					.catch(function(err) {
					  ChilliJSSDK.error(err.name + ": " + err.message);
				})
			},
				
			//获取设备
			getMicrophone:function(){
				ChilliJSSDK.info('device:' + JSON.stringify(ChilliJSSDK.microInfos));
				return ChilliJSSDK.microInfos;
			},
			
			//设置媒体设备
			setMicrophone:function(microId){
				ChilliJSSDK.microId = microId;
				var call_id;
                for(call_id in ChilliJSSDK.SessionS){
                    ChilliJSSDK.debug('setMicrophone the call...'+call_id);
                    var constraints={audio:{deviceId:microId}};
					ChilliJSSDK.SessionS[call_id].sessionDescriptionHandler.WebRTC.getUserMedia(constraints).then(function(stream){
						var pc = this.sessionDescriptionHandler.peerConnection;
								
							if (pc.addTrack) {
								stream.getTracks().forEach(function (track) {
									ChilliJSSDK.warn(pc.addTrack(track, stream));
								});
							} else {
								// Chrome 59 does not support addTrack
								pc.addStream(stream);
							}
							
							
					}.bind(ChilliJSSDK.SessionS[call_id]));
                    
                }
				ChilliJSSDK.debug('setMicrophone:' + JSON.stringify(ChilliJSSDK.microId));
			},

            /**
             * 返回当前日期+时间
             * @returns {string}
             */
            dateNow: function () {
                var date = new Date();
                var y = date.getFullYear();
                var m = date.getMonth() + 1;
                var d = date.getDate();
                var h = date.getHours();
                var mm = date.getMinutes();
                var s = date.getSeconds();
                var sss = date.getMilliseconds();
                if (m < 10) {
                    m = "0" + m
                }
                if (d < 10) {
                    d = "0" + d
                }
                if (h < 10) {
                    h = "0" + h
                }
                if (mm < 10) {
                    mm = "0" + mm
                }
                if (s < 10) {
                    s = "0" + s
                }
                return y + "-" + m + "-" + d + " " + h + ":" + mm + ":" + s + "." + sss;
            },
            /**
             * 日志
             * @returns {string}
             */
            debug: function (c) {
                if(ChilliJSSDK.loglevel == "debug"){
                    c = "[" + ChilliJSSDK.dateNow() + "] " + c;
                    window.console.debug(c);
                }
            },
            
            
            info: function (c) {
                if(ChilliJSSDK.loglevel == "debug" || ChilliJSSDK.loglevel == "info"){
                    c = "[" + ChilliJSSDK.dateNow() + "] " + c;
                    window.console.info(c);
                }
            },
            
            warn: function (c) {
                if(ChilliJSSDK.loglevel == "debug" || ChilliJSSDK.loglevel == "info"  || ChilliJSSDK.loglevel == "warn"){
                    c = "[" + ChilliJSSDK.dateNow() + "] " + c;
                    window.console.warn(c);
                }
            },
            
            error: function (c) {
                if(ChilliJSSDK.loglevel == "debug" || ChilliJSSDK.loglevel == "info"  || ChilliJSSDK.loglevel == "warn" || ChilliJSSDK.loglevel == "error" ){
                    c = "[" + ChilliJSSDK.dateNow() + "] " + c;
                    window.console.error(c);
                }
            },
            
            /**
             * 加载后自动调用
             */
            loading: function () {
                ChilliJSSDK.getPath();
                ChilliJSSDK.createScript(ChilliJSSDK._thisPath + "sip-0.9.2.js");
            },
            /**
             * 获取本文件路径
             * @returns {string}
             */
            getPath: function () {
                if (!ChilliJSSDK._thisPath) {
                    var js = document.scripts;
                    for (var i = 0; i < js.length; i++) {
                        var script = js[i];
                        var jsPath = script.src;
                        if (jsPath.indexOf("sip-0.9.2.js") != -1) {
                            ChilliJSSDK._thisPath = jsPath.substring(0, jsPath.lastIndexOf("/") + 1);
                        }
                    }
                }
                if (!ChilliJSSDK._thisPath) {
                    ChilliJSSDK._thisPath = "";
                }
                return ChilliJSSDK._thisPath;
            },

            /**
             * 创建script元素
             * @param filePath
             */
            createScript: function (filePath) {
                var tag = document.createElement("script");
                tag.setAttribute('type', 'text/javascript');
                tag.setAttribute('src', filePath);
                var head = document.getElementsByTagName("head");
                head.item(0).appendChild(tag);
            },
            /**
             * 生成uuid
             * @returns {*}
             */
            getUUID: function () {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            },
        }
    ChilliJSSDK.loading();
	ChilliJSSDK.getSystemDevice();
})();