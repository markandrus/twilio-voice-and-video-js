'use strict';

/**
 * @interface Tokens
 * @property {string} accessToken
 * @property {string} capabilityToken
 */

/**
 * @param {string} identity
 * @returns {Promise<Tokens>}
 */
async function fetchTokens(identity) {
  identity = encodeURIComponent(identity);
  const response = await fetch('/tokens?identity=' + identity);
  return response.json();
}

/**
 * @param {string} token
 * @param {ConnectOptions} [options]
 * @returns {Promise<Room>}
 */
function connectToRoom(token, options) {
  return Twilio.Video.connect(token, options);
}

/**
 * @param {string} token
 * @param {DeviceOptions} [options]
 * @returns {Promise<void>}
 */
async function setupDevice(token, options) {
  Twilio.Device.setup(token, options);
  await new Promise(Twilio.Device.ready);
  return Twilio.Device;
}

/**
 * @param {Device} device
 * @param {MediaTrackConstraints} [audioConstraints]
 * @returns {Promise<Connection>}
 */
async function acceptIncomingCall(device, audioConstraints) {
  const connection = await new Promise(device.incoming);
  connection.accept(audioConstraints);
  return connection;
}

/**
 * @param {Device} device
 * @param {object} [params]
 * @param {MediaTrackConstraints} [audioConstraints]
 * @returns {Connection}
 */
function placeOutgoingCall(device, params, audioConstraints) {
  const connection = device.connect(params, audioConstraints);
  return new Promise(resolve => connection.accept(resolve));
}

/**
 * @returns {void}
 */
async function setup() {
  let tokens;

  const deviceOptions = {
    debug: true
  };

  const identityInput = document.querySelector('#identity');
  const createButton = document.querySelector('#create');

  const tokensPromise = new Promise(resolve => {
    createButton.onclick = async event => {
      event.preventDefault();

      const identity = identityInput.value;

      createButton.disabled = true;

      tokens = await fetchTokens(identity);

      connectButton.disabled = false;

      resolve(tokens);
    };
  });

  const voiceDiv = document.querySelector('#voice');

  const devicePromise = tokensPromise.then(async tokens => {
    const token = tokens.capabilityToken;
    const device = await setupDevice(token, deviceOptions);
    callButton.disabled = false;
    return device;
  });

  const incomingCallPromise = devicePromise.then(acceptIncomingCall);

  const toInput = document.querySelector('#to');
  const callButton = document.querySelector('#call');

  const outgoingCallPromise = new Promise(resolve => {
    callButton.onclick = async event => {
      event.preventDefault();

      const params = { to: toInput.value };

      callButton.disabled = true;
      toInput.disabled = true;

      resolve(placeOutgoingCall(Twilio.Device, params))
    };
  });

  const hangupButton = document.querySelector('#hangup');

  Promise.race([incomingCallPromise, outgoingCallPromise]).then(connection => {
    callButton.disabled = true;
    toInput.disabled = true;
    hangupButton.disabled = false;

    hangupButton.onclick = event => {
      event.preventDefault();

      hangupButton.disabled = true;

      connection.disconnect();
    };

    connection.disconnect(() => {
      hangupButton.disabled = true;
    });

    displayCall(voiceDiv, connection);
  });

  const videoDiv = document.querySelector('#video');

  const [audioTrack, videoTrack] = await Twilio.Video.createLocalTracks();
  audioTrack.disable();
  displayLocalVideoTrack(videoDiv, videoTrack);

  const connectOptions = {
    logLevel: 'debug',
    tracks: [audioTrack, videoTrack]
  };

  const nameInput = document.querySelector('#name');
  const connectButton = document.querySelector('#connect');
  const disconnectButton = document.querySelector('#disconnect');

  connectButton.onclick = async event => {
    event.preventDefault();

    const tokens = await tokensPromise
    const token = tokens.accessToken;
    console.log(tokens);
    connectOptions.name = nameInput.value;

    nameInput.disabled = true;
    connectButton.disabled = true;

    const room = await connectToRoom(token, connectOptions);

    disconnectButton.disabled = false;

    disconnectButton.onclick = event => {
      event.preventDefault();

      disconnectButton.disabled = true;

      room.disconnect();
    };

    room.once('disconnected', () => {
      disconnectButton.disabled = true;
    });

    displayRoom(videoDiv, room);
  };
}

/**
 * @param {HTMLElement} voiceDiv
 * @param {Connection} connection
 * @returns {Promise<void>}
 */
async function displayCall(voiceDiv, connection) {
  const sid = connection.parameters.CallSid;
  const callUl = document.createElement('ul');
  callUl.className = 'list-group list-group-flush';

  const callSidLi = document.createElement('li');
  callSidLi.className = 'list-group-item';
  callSidLi.innerText = sid;

  callUl.appendChild(callSidLi);

  voiceDiv.appendChild(callUl);

  const waveformLi = document.createElement('li');
  waveformLi.className = 'list-group-item';

  const waveform = new Waveform();

  // HACK(mroberts): This is private API; do not depend on. Also, I'm manually
  // polling until the MediaStream is present. Very bad.
  let stream;

  while (!stream) {
    const version = connection.mediaStream.version;
    if (version) {
      stream = version.pc.getRemoteStreams()[0];
      if (stream) {
        break;
      }
    }
    await new Promise(resolve => setTimeout(resolve));
  }

  waveform.setStream(stream);
  waveformLi.appendChild(waveform.element);

  callUl.appendChild(waveformLi);
}

/**
 * @param {HTMLElement} videoDiv
 * @param {Room} room
 * @returns {void}
 */
function displayRoom(videoDiv, room) {
  const roomUl = document.createElement('ul');
  roomUl.id = room.sid;
  roomUl.className = 'list-group list-group-flush';

  const roomLi = document.createElement('li');
  roomLi.id = room.sid;
  roomLi.className = 'list-group-item';

  const roomSpan = document.createElement('span');
  roomSpan.innerText = room.sid;

  roomLi.appendChild(roomSpan);
  roomUl.appendChild(roomLi);

  room.participants.forEach(participant => displayParticipant(roomUl, participant));
  room.on('participantConnected', participant => displayParticipant(roomUl, participant));

  videoDiv.appendChild(roomUl);
}

/**
 * @param {HTMLElement} roomUl
 * @param {Participant} participant
 * @returns {void}
 */
function displayParticipant(roomUl, participant) {
  const participantLi = document.createElement('li');
  participantLi.id = participant.sid;
  participantLi.className = 'list-group-item';

  const participantSpan = document.createElement('span');
  participantSpan.innerText = participant.identity;
  participantLi.appendChild(participantSpan);

  participant.tracks.forEach(track => displayTrack(participantLi, track));
  participant.on('trackAdded', track => displayTrack(participantLi, track));

  roomUl.appendChild(participantLi);
}

/**
 * @param {HTMLElement} participantLi
 * @param {Track} track
 * @returns {void}
 */
function displayTrack(participantLi, track) {
  participantLi.appendChild(track.attach());
}

/**
 * @param {HTMLElement} videoDiv
 * @param {VideoTrack} track
 * @returns {void}
 */
function displayLocalVideoTrack(videoDiv, videoTrack) {
  const video = videoTrack.attach();
  video.className = 'card-img-top';
  videoDiv.insertAdjacentElement('afterbegin', video);
}

setup();
