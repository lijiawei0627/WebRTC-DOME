# 一、简述

WebRTC（Web Real-Time Communications）是Google公司开源的一项实时通讯技术，它允许网络应用或者站点，在不借助中间媒介的情况下，建立浏览器之间点对点（Peer-to-Peer）的连接，实现视频流、音频流或者其他任意数据的传输。

# 二、优势

1. 实时双向音视频
2. 主流浏览器支持
3. 具有毫秒级的延迟特性：WebRTC 本身就是多媒体即时通讯技术，几乎是实时传输。
4. 浏览器端成熟的API，无需多少代码就可以满足无客户端视频通话的目的。
5. 使用范围广且技术开源成熟
6. 无需安装任何插件或第三方软件即可实现点对点的数据分享

# 三、基础API

使用这些API是有前提条件的，首先需要在安全源访问。**安全源是至少匹配以下（ Scheme** **、** **Host** **、** **Port ）模式之一的源。**

![img](https://cdn.nlark.com/yuque/0/2023/webp/634779/1700795635901-655899e8-60b8-4214-919d-199a21ef3103.webp?x-oss-process=image%2Fresize%2Cw_937%2Climit_0)

比如说：**你本地开发用HTTP请求地址获取摄像头API没有问题，但是其他人用他的电脑访问你电脑IP对应的项目地址时，摄像头会调用失败**。

## 3.1 getUserMedia

使用navigator.mediaDevices.getUserMedia来获取计算机的摄像头或者麦克风等媒体设备

### 3.1.1 作用

你的电脑通过 USB 或者其他网络形式接入了 多个摄像头或虚拟设备时，都是可以通过这个 API 获取到的。 不仅仅是视频设备，还包括音频设备和虚拟音频设备。 **获取媒体设备是最简单的操作，它还可以控制获取到媒体的分辨率，以及其他的一些可选项。**

### 3.1.2 使用

getUserMedia直接调用不使用任何参数，则获取的就是 PC 的默认摄像头和麦克风。当然，我们也可以传入媒体约束 constraints（可以指定视频轨道前置后置、分辨率、帧率等等各类参数），来获取我们想要的设备信息。

```javascript
let constraints = {video:true, audio: true} ;
async function getLocalUserMedia(constraints){
    return await navigator.mediaDevices.getUserMedia(constraints);
}
let stream = await this.getLocalUserMedia(constraints).catch(handleError);
console.log(stream);
```

## 3.2 getDisplayMedia

### 3.2.1 作用

使用getDisplayMedia方法在浏览器中实现分享屏幕

### 3.2.2 使用

```javascript
navigator.mediaDevices.getDisplayMedia({
  audio: true,
  video: true
})
  .then((stream) => {
    /* use the stream */
  })
  .catch((err) => {
    /* handle the error */
  });
```

## 3.3 MediaStream API

MediaStream API中有两个重要组成：MediaStreamTrack以及MediaStream。

### 3.3.1 MediaStreamTrack

MediaStreamTrack对象代表单一类型的媒体流，可以是音频或者视频，音频称作audio track，视频的话称作video track，也称作为音轨、视频轨。

一个track由source与sink组成。source给track提供数据，sink表示媒体流接受者，通俗来说，source摄像头采集到图像之后，保存为视频，成为视频源，编码和本地渲染需要sink消费图像做处理

source—（提供媒体流）—>track—（输出媒体流）—>sink

### 3.3.2  MeidiaStream

MeidiaStream用于将多个MediaStreamTrack对象打包到一起。一个MediaStream可包含audio track 与video track。类似平时的多媒体文件，可包含音频与视频。

一个MediaStream对象可以包含多个MediaStreamTrack对象。MediaStream中的所有MediaStreamTrack对象在渲染时必须同步。就像我们平时播放媒体文件时，音视频的同步。

source 与sink构成一个track，多个MediaStreamTrack构成MediaStram。

# 四、PeerConnection

PeerConnection是整个WebRTC通讯的载体。

```javascript
const PeerConnection = window.RTCPeerConnection ||
        window.mozRTCPeerConnection ||
        window.webkitRTCPeerConnection;
```

## 4.1 核心方法

- addIceCandidate()： 保存 ICE 候选信息，即双方协商信息，持续整个建立通信过程，直到没有更多候选信息。
- addTrack() ：添加音频或者视频轨道。
- createAnswer() ：创建应答信令。
- createDataChannel()： 创建消息通道，建立WebRTC通信之后，就可以 p2p 的直接发送文本消息，无需中转服务器。
- createOffer()： 创建初始信令。
- setRemoteDescription()： 保存远端发送给自己的信令。
- setLocalDescription() ：保存本地端创建的信令。

以上就是PeerConnection这个载体核心驱动的主要方法，除了这些核心方法之外，还有一些**事件监听函数**，这些监听函数用于监听远程发送过来的消息。

假如 A 和 B 建立连接，如果 A 作为主动方即呼叫端，则需要调用的就是上述**核心方法**去创建建立连接的信息，而 B 则在另一端使用上述**部分核心方法**创建信息再发送给 A，A 则调用**事件监听函数**去保存这些信息。常用的事件监听函数如下：

- ondatachannel： 创建datachannel后监听回调以及 p2p消息监听。
- ontrack ：监听远程媒体轨道即远端音视频信息。
- onicecandidate： ICE 候选监听。

# 五、WebRTC会话流程

![img](https://cdn.nlark.com/yuque/0/2023/webp/634779/1702534188209-5c403a5e-538a-47a4-a24d-4b7af5052963.webp?x-oss-process=image%2Fresize%2Cw_937%2Climit_0)

上图中 **A** 为**caller（呼叫端），B为callee（被呼叫端）。**

1. 首先 A 呼叫 B，呼叫之前我们一般通过实时通信协议WebSocket即可，让对方能收到信息。
2. B 接受应答，A 和 B 均开始初始化PeerConnection 实例，用来关联 A 和 B 的信令会话信息。
3. A 调用createOffer创建信令，同时通过setLocalDescription方法在本地实例PeerConnection中储存一份（**图中流程①**）。
4. 然后调用信令服务器将 A 的信令转发给 B（**图中流程②**）。
5. B 接收到 A 的信令后调用setRemoteDescription，将其储存在初始化好的PeerConnection实例中（**图中流程③**）。
6. B 同时调用createAnswer创建应答信令，并调用setLocalDescription储存在自己本地PeerConnection实例中（**图中流程④**）。
7. B 继续将自己创建的应答信令通过服务器转发给 A（**图中流程⑤**）。
8. A 调用setRemoteDescription将 B 的信令储存在本地PeerConnection实例（**图中流程⑤**）。
9. 在会话的同时，从图中我们可以发现有个ice candidate，这个信息就是 ice 候选信息，A 发给 B 的 B 储存，B 发给 A 的 A 储存，直至候选完成。

# 六、信令服务器

从上面整个流程来看，信令服务器为 A、B 两者中转信令起了很重要的角色，充当的是连通 A、B 的媒介，就好比手机通话，运营商的服务器替我们中转呼叫、接听、挂断等操作，在这里，**运营商的服务器就是信令服务器**。

信令服务器实际上，简单理解就是转发通话双方需要交换或者会话的信息，可以借助WebSocket来完成信令服务器的搭建。

# 七、备注

源代码路径：

https://github.com/lijiawei0627/WebRTC-DOME.git

测试地址：

[localhost:8082/call?userId=1001&roomId=10012](http://localhost:8082/call?userId=1001&roomId=10012)

[localhost:8082/call?userId=1002&roomId=10012](http://localhost:8082/call?userId=1001&roomId=10012)