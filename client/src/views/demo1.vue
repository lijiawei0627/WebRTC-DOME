<template>
  <div>
    <el-container>
      <el-header height="200px">
        <div>
          <ul v-for="(item, index) in roomUserList" :key="index">
            <el-tag size="mini" type="success">{{
              "用户" + item.userName
            }}</el-tag>
            <el-button
              size="mini"
              type="primary"
              v-if="userInfo.userId !== item.userId"
              @click="call(item)"
              >通话</el-button
            >
            <el-button
              v-if="userInfo.userId === item.userId"
              size="mini"
              type="danger"
              @click="openVideoOrNot"
              >切换</el-button
            >
          </ul>
        </div>
      </el-header>
      <el-container>
        <el-aside width="600px">
          <div>
            <el-form :model="oMessageInfo" label-width="250px">
              <el-form-item label="发送消息">
                <el-input
                  v-model="oMessageInfo.rtcmessage"
                  placeholder="消息"
                ></el-input>
              </el-form-item>
              <el-form-item label="远端消息">
                <div>{{ oMessageInfo.rtcmessageRes }}</div>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="sendMessageUserRtcChannel"
                  >点击发送</el-button
                >
              </el-form-item>
            </el-form>
          </div>
        </el-aside>
        <el-main>
          <div class="video-channel">
            <video
              @click="streamInfo('localdemo01')"
              id="localdemo01"
              autoplay
              controls
              muted
              title="本地"
            ></video>
            <video
              @click="streamInfo('remoteVideo01')"
              id="remoteVideo01"
              autoplay
              controls
              muted
              title="远端"
            ></video>
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script>
function handleError(error) {
  // alert("摄像头无法正常使用，请检查是否占用或缺失")
  console.error(
    "navigator.MediaDevices.getUserMedia error: ",
    error.message,
    error.name
  );
}

const PeerConnection =
  window.RTCPeerConnection ||
  window.mozRTCPeerConnection ||
  window.webkitRTCPeerConnection;
const { io } = require("socket.io-client");
// 解析url携带参数
function getParams(queryName) {
  let url = window.location.href;
  let query = decodeURI(url.split("?")[1]);
  let vars = query.split("&");
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    if (pair[0] === queryName) {
      return pair[1];
    }
  }
  return null;
}

export default {
  name: "demo1",
  data() {
    return {
      linkSocket: "",
      roomUserList: [],
      userInfo: {}, //用户信息
      oMessageInfo: {
        rtcmessage: "",
        rtcmessageRes: "", //响应
      },
      localRtcPc: "",
      rtcmessage: "",
      mapSender: [] //发送的媒体
    };
  },
  created() {
    if (getParams("userId")) {
      // 创建用户和websocket链接
      this.init(getParams("userId"), getParams("roomId"), getParams("userId"));
    }
  },
  methods: {
    // 设置本地音视频信息
    async setLocalDomVideoStream(domId, newStream) {
      let video = document.getElementById(domId);
      let stream = video.srcObject;
      if (stream) {
        // 清除音频轨道
        stream.getAudioTracks().forEach((e) => {
          stream.removeTrack(e);
        });
        // 清除视频轨道
        stream.getVideoTracks().forEach((e) => {
          stream.removeTrack(e);
        });
      }
      video.srcObject = newStream;
      video.muted = true;
    },
    // 设置远端音视频信息
    setRemoteDomVideoStream(domId, track) {
      let video = document.getElementById(domId);
      let stream = video.srcObject;
      if (stream) {
        stream.addTrack(track);
      } else {
        let newStream = new MediaStream();
        newStream.addTrack(track);
        video.srcObject = newStream;
        video.muted = true;
      }
    },
    // 创建用户和websocket链接
    init(userId, roomId, userName) {
      this.userInfo = {
        userId,
        roomId,
        userName,
      };
      this.linkSocket = io(this.$serverSocketUrl, {
        reconnectionDelayMax: 10000, // 重新创建链接的延迟时间
        transports: ["websocket"],
        query: {
          userId: userId,
          roomId: roomId,
          userName: userName,
        },
      });
      this.linkSocket.on("connect", (e) => {
        console.log("server init connect success", this.linkSocket);
      });
      this.linkSocket.on("roomUserList", (e) => {
        console.log("roomUserList", e);
        this.roomUserList = e;
      });
      this.linkSocket.on("msg", async (e) => {
        console.log("msg", e);
        if (e["type"] === "join" || e["type"] === "leave") {
          setTimeout(() => {
            let params = { roomId: getParams("roomId") };
            this.linkSocket.emit("roomUserList", params);
          }, 1000);
        }
        if (e["type"] === "call") {
          await this.onCall(e);
        }
        if (e["type"] === "offer") {
          await this.onRemoteOffer(e["data"]["userId"], e["data"]["offer"]);
        }
        if (e["type"] === "answer") {
          await this.onRemoteAnswer(e["data"]["userId"], e["data"]["answer"]);
        }
        if (e["type"] === "candidate") {
          this.localRtcPc.addIceCandidate(e.data.candidate);
        }
      });
      this.linkSocket.on("error", (e) => {
        console.log("error", e);
      });
    },
    // 获取设备 stream
    async getLocalUserMedia(constraints) {
      return await navigator.mediaDevices
        .getUserMedia(constraints)
        .catch(handleError);
    },
    // 发起通话
    async call(item) {
      this.initCallerInfo(getParams("userId"), item.userId);
      let params = {
        userId: getParams("userId"),
        targetUid: item.userId,
      };
      this.linkSocket.emit("call", params);
    },
    async onCall(e) {
      console.log("远程呼叫：", e);
      await this.initCalleeInfo(e.data["targetUid"], e.data["userId"]);
    },
    async initCalleeInfo(localUid, fromUid) {
      //初始化pc
      this.localRtcPc = new PeerConnection();
      //初始化本地媒体信息
      let localStream = await this.getLocalUserMedia({
        audio: true,
        video: true,
      });
      for (const track of localStream.getTracks()) {
        this.localRtcPc.addTrack(track);
      }
      // dom渲染
      await this.setLocalDomVideoStream("localdemo01", localStream);
      //监听
      this.onPcEvent(this.localRtcPc, localUid, fromUid);
    },
    async initCallerInfo(callerId, calleeId) {
      this.mapSender = [];
      //初始化pc
      this.localRtcPc = new PeerConnection();
      //获取本地媒体并添加到pc中
      let localStream = await this.getLocalUserMedia({
        audio: true,
        video: true,
      });
      for (const track of localStream.getTracks()) {
        this.mapSender.push(this.localRtcPc.addTrack(track));
      }
      // 本地dom渲染
      await this.setLocalDomVideoStream("localdemo01", localStream);
      //回调监听
      this.onPcEvent(this.localRtcPc, callerId, calleeId);
      //创建offer
      let offer = await this.localRtcPc.createOffer({ iceRestart: true });
      //设置offer为本地描述
      await this.localRtcPc.setLocalDescription(offer);
      //发送offer给被呼叫端
      let params = { targetUid: calleeId, userId: callerId, offer: offer };
      this.linkSocket.emit("offer", params);
    },
    onPcEvent(pc, localUid, remoteUid) {
      const that = this;
      this.channel = pc.createDataChannel("chat");
      pc.ontrack = function (event) {
        console.log(event);
        that.setRemoteDomVideoStream("remoteVideo01", event.track);
      };
      pc.onnegotiationneeded = function (e) {
        console.log("重新协商", e);
      };
      pc.ondatachannel = function (ev) {
        console.log("created Data channel");
        ev.channel.onopen = function () {
          console.log("open Data channel");
        };
        ev.channel.onmessage = function (data) {
          console.log("Data channel msg", data);
          that.oMessageInfo.rtcmessageRes = data.data;
        };
        ev.channel.onclose = function () {
          console.log("Data channel close");
        };
      };
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          that.linkSocket.emit("candidate", {
            targetUid: remoteUid,
            userId: localUid,
            candidate: event.candidate,
          });
        }
      };
    },
    // 发送消息
    sendMessageUserRtcChannel() {
      if (!this.channel) {
        this.$message.error("请先建立webrtc连接");
      }
      this.channel.send(this.oMessageInfo.rtcmessage);
      this.oMessageInfo.rtcmessage = undefined;
    },
    // 保存远端信令
    async onRemoteOffer(fromUid, offer) {
      this.localRtcPc.setRemoteDescription(offer);
      let answer = await this.localRtcPc.createAnswer();
      await this.localRtcPc.setLocalDescription(answer);
      let params = {
        targetUid: fromUid,
        userId: getParams("userId"),
        answer: answer,
      };
      this.linkSocket.emit("answer", params);
    },
    async onRemoteAnswer(fromUid, answer) {
      await this.localRtcPc.setRemoteDescription(answer);
    },
    /**
     * 打开或关闭摄像头
     */
    openVideoOrNot() {
      const senders = this.localRtcPc.getSenders();
      const send = senders.find((s) => s.track.kind === "video");
      send.track.enabled = !send.track.enabled; //控制视频显示与否
    },
    streamInfo(domId) {
      let video = document.getElementById(domId);
      console.log(video.srcObject);
    }
  }
};
</script>

<style scoped>
#localdemo01 {
  width: 400px;
  height: 300px;
  margin-right: 20px;
}
#remoteVideo01 {
  width: 400px;
  height: 300px;
}
.video-channel {
  margin-top: -20px;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
}
</style>