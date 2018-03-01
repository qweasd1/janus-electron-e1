import {Component, OnInit} from '@angular/core';

let Janus = require('../../../janus');
import {desktopCapturer} from 'electron';


interface StreamInfo {
  stream:MediaStream
  name:string
  id:number
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  constructor() {
  }

  remoteVideos:StreamInfo[] = []
  localVideos:StreamInfo[] = []

  ngOnInit() {
    const room = 1249


    const remove = (id)=>{
      let index = this.remoteVideos.findIndex((remoteInfo)=>remoteInfo.id === id)
      console.log("delete video");
      if(index > -1){
        this.remoteVideos.splice(index,1)

      }
    }



    const createRemote = (info)=>{
      console.log(this.localVideos);
      if(this.localVideos.find((localInfo)=>localInfo.id === info.id)){

        return
      }

      janus.attach({
        plugin:"janus.plugin.videoroom",
        success:(remotePlugin)=>{
          let display
          let id


          remotePlugin.onmessage = (msg, jsep)=>{
            console.log("remote",msg);
            const event = msg.videoroom
            switch (event){
              case "attached":
                id = msg.id
                display = msg.display
                break
              default:
                if(msg.unpublished){
                  remove(msg.unpublished)
                }
                break
            }

            if(jsep){
              remotePlugin.createAnswer({
                jsep,
                media:{
                  audioSend:false,
                  videoSend:false
                },
                success:(remote_jsep)=>{
                  const startVideoRequest = {
                    request:"start",
                    room
                  }

                  remotePlugin.send({
                    message:startVideoRequest,
                    jsep:remote_jsep
                  })
                }
              })
            }
          }

          remotePlugin.onremotestream = (stream)=>{
            if(this.remoteVideos.find((remoteInfo)=>remoteInfo.id === id)){
              return
            }


            this.remoteVideos.push({
              name:display,
              id,
              stream
            })
          }

          const listenRequest = {
            request:"join",
            room,
            ptype:"listener",
            feed:info.id,
            // private_id:my_private_id
          }
          remotePlugin.send({
            message:listenRequest
          })


        }
      })
    }

    const createPublish = (name:string, stream?)=>{
      janus.attach({
        plugin: 'janus.plugin.videoroom',
        success: (plugin) => {
          const createRoomIfNotExist = ()=>{



            return new Promise((resolve,reject)=>{
              plugin.send({
                message:{
                  request:"exists",
                  room
                },
                success:({exists})=>{
                  if(!exists){
                    plugin.send({
                      message:{
                        request:"create",
                        room,
                        publishers:30,
                        permanent:true
                      },
                      success:(data)=>{
                        resolve()
                      }
                    })
                  }
                  else{
                    resolve()
                  }
                }
              })
            })

          }

          let my_private_id
          let id



          plugin.onmessage = (msg, jsep) => {
            console.log("publish",msg);
            const state = msg.videoroom
            switch (state){
              case "joined":
                id = msg.id
                my_private_id = msg.private_id
                this.localVideos.push({
                  name,
                  id,
                  stream
                });
                if(msg.publishers){
                  for(let publisher of msg.publishers){
                    createRemote(publisher)
                  }
                }

                break
              default:
                if(msg.publishers){
                  console.log("add publisher",msg);
                  for(let p of msg.publishers){
                    createRemote(p)
                  }
                }
                if(msg.unpublished){
                  remove(msg.unpublished)
                }
                break

            }

            if (jsep) {
              plugin.handleRemoteJsep({jsep});
            }
          };

          createRoomIfNotExist().then(()=>{
            var publishRequest = {'request': 'join', 'room': room, 'ptype': 'publisher', 'display': name};
            plugin.send({'message': publishRequest});

            plugin.createOffer({
              stream,
              media: { audioRecv: false, videoRecv: false, audioSend: true, videoSend: true },
              success: (jsep) => {
                plugin.send({
                  'message':
                    {
                      'request': 'configure',
                      'audio': true,
                      'video': true
                    },
                  'jsep': jsep
                });
              }
            });
          })

        },
        error: (error) => {
          console.error(error)
        }
      });
    }


    Janus.init({
      debug: true
    });


    // const server = 'https://janus.conf.meetecho.com/janus';
    // const server = 'http://localhost:8088/janus';
    const server = "http://shrsft6029himb.shrs.pitt.edu:8001/janus";
    const janus = new Janus({
      server: server,
      success: () => {
        let constraint = {
          deviceId:"9b49d332dba5b2d69db0335c8f5a0a3dc9a09189b193ad7c72c8ae14c9f1f08e",
          width: 800, height: 600
        }

        navigator.getUserMedia({
          video:constraint,
          audio:false
        },(stream)=>{
          createPublish("electron facetime",stream)
        },()=>{

        })

        navigator.getUserMedia({
          video:{
            deviceId:"4e6383a71c58693ab258fc1ac9504e44a0eff885ee137c9d2eddce3806aeb605",
            width: 1000, height: 800
          }
        },(stream)=>{
          createPublish("electron device",stream)
        },()=>{

        })
        
        
        



        // desktopCapturer.getSources({types: ['window', 'screen']}, (error, sources) => {
        //   if (error) throw error
        //   let constaint = <any>{
        //     audio: false,
        //     video: {
        //       mandatory: {
        //         chromeMediaSource: 'desktop',
        //         chromeMediaSourceId: sources[3].id,
        //         minWidth: 1280,
        //         maxWidth: 1280,
        //         minHeight: 720,
        //         maxHeight: 720
        //       }
        //     }
        //   }
        //
        //       navigator.mediaDevices.getUserMedia(constaint)
        //         .then((stream) => createPublish("electron screen sharing",stream))
        //         .catch((e) => {})
        //       return
        //
        //
        // })
      }
    });
  }





}
