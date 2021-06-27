class ChatApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ZentalkWorker: null,
      socket: null,
      originPublicKey: null,
      destinationPublicKey: null,
      messages: [],
      notifications: [],
      currentRoom: null,
      pendingRoom: Math.floor(Math.random() * 1000 * 100),
      draft: '',
      address: null,
      data: { userCount: 0 },
    };
    this.notificationContainer = React.createRef();
    this.chatView = React.createRef();
  }

  setupSocketListeners = () => {
    this.state.socket.on('connect', () => {
      this.addNotification('Safe Connected With Zentalk');
      this.joinRoom();
    });
    this.state.socket.on('disconnect', () => this.addNotification('Zentalk Lost Connection'));
    this.state.socket.on('MESSAGE', async (message) => {
      if (message.recipient === this.state.originPublicKey) {
        message.text = await this.getWebWorkerResponse('decrypt', message.text);
        this.setState({ messages: [...this.state.messages, message] });
        this.autoscroll(this.chatView.current);
      }
    });

    this.state.socket.on('NEW_CONNECTION', () => {
      this.addNotification('Another User Has Joined The Room');
      this.sendPublicKey();
    });

    this.state.socket.on('ROOM_JOINED', (newRoom) => {
      this.setState({ currentRoom: newRoom });
      this.addNotification(`User Have Joined The Zentaroom - ${newRoom}`);
      this.sendPublicKey();
    });

    this.state.socket.on('PUBLIC_KEY', (key) => {
      this.addNotification(`Public Key Received - ${this.getKeyShorted(key)}`);
      this.setState({ destinationPublicKey: key });
    });

    this.state.socket.on('user disconnected', () => {
      this.notify(`The User is Disconnected - ${this.getKeyShorted(this.destinationKey)}`);
      this.setState({ destinationPublicKey: null });
    });

    this.state.socket.on('ROOM_FULL', () => {
      this.addNotification(`Cannot Join ${this.state.pendingRoom}, Zentaroom is full`);
      this.setState({ pendingRoom: Math.floor(Math.random() * 1000 * 10) });
      this.joinRoom();
    });
    this.state.socket.on('INTRUSION_ATTEMPT', () => {
      this.addNotification('Sorry Third User are attempted to join the Zentarooms');
    });
  };

  sendPublicKey = () => {
    if (this.state.originPublicKey) {
      this.state.socket.emit('PUBLIC_KEY', this.state.originPublicKey);
    }
  };

  joinRoom = () => {
    if (this.state.pendingRoom !== this.state.currentRoom && this.state.originPublicKey) {
      this.addNotification(`Connecting to Zentaroom - ${this.state.pendingRoom}`);
      this.setState({ messages: [] });
      this.setState({ destinationPublicKey: null });
      this.state.socket.emit('JOIN', this.state.pendingRoom);
    }
  };

  addNotification = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    this.setState(
      { notifications: [...this.state.notifications, { message, timestamp }] },
      () => {},
    );
    this.autoscroll(this.notificationContainer.current);
  };

  getWebWorkerResponse = (messageType, messagePayload) => {
    return new Promise((resolve) => {
      const messageId = Math.floor(Math.random() * 100000 * 10);
      this.state.ZentalkWorker.postMessage([messageType, messageId].concat(messagePayload));
      const handler = function (e) {
        if (e.data[0] === messageId) {
          e.currentTarget.removeEventListener(e.type, handler);
          resolve(e.data[1]);
        }
      };
      this.state.ZentalkWorker.addEventListener('message', handler);
    });
  };

  autoscroll = (element) => {
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  };

  getKeyShorted = (key) => {
    return key.slice(400, 416, 432);
  };

  addMessage = (message) => {
    this.setState({ messages: [...this.state.messages, message] });
    this.autoscroll(this.chatView.current);
  };

  sendMessage = async () => {
    if (!this.state.draft || this.state.draft === '') {
      return;
    }
    let message = Immutable.Map({
      text: this.state.draft,
      recipient: this.state.destinationPublicKey,
      sender: this.state.originPublicKey,
    });
    this.setState({ draft: '' });
    this.addMessage(message.toObject());

    if (this.state.destinationPublicKey) {
      const encryptedText = await this.getWebWorkerResponse('encrypt', [
        message.get('text'),
        this.state.destinationPublicKey,
      ]);
      const encryptedMsg = message.set('text', encryptedText);
      this.state.socket.emit('MESSAGE', encryptedMsg.toObject());
    }
  };

  async componentDidMount() {
    await this.addNotification('Welcome Zentalk-Web!');
    await this.addNotification('Please Wait Zentalk Generating New Key-Pair...');
    this.setState({ ZentalkWorker: new Worker('zentalk-worker.js') });
    this.setState({ originPublicKey: await this.getWebWorkerResponse('generate-keys') });
    await this.addNotification(
      `Keypairs Are Now Generated: ${this.getKeyShorted(this.state.originPublicKey)}`,
    );
    this.addNotification('User see only the Public-Key');
    this.setState({ socket: io() });
    this.setupSocketListeners();
  }

  render() {
    const { notifications, messages, pendingRoom, destinationPublicKey, originPublicKey, draft } =
      this.state;
    return (
      <React.Fragment>
        <div className="chat-container full-width" ref={this.chatView}>
          <div className="message-list">
            {messages.map((message, index) => {
              return (
                <div className="message full-width" key={index}>
                  <p>
                    <span className={message.sender == originPublicKey ? 'user1' : 'user2'}>
                      {this.getKeyShorted(message.sender)}
                    </span>
                    &#10148; {message.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="info-container full-width">
          <div id="chatjoin">
            <div className="room-select">
              <input
                type="text"
                className="room-id"
                placeholder="Choose Room"
                id="room-id"
                value={pendingRoom}
                onChange={(e) => this.setState({ pendingRoom: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && this.joinRoom()}
              />
            </div>
          </div>

          <div className="room-btn">
            <button className="join-button" type="submit" onClick={this.joinRoom}>
              JOIN
            </button>
          </div>

          <div className="divider"></div>

          <div className="notification-list" ref={this.notificationContainer}>
            {notifications.map((notification, index) => {
              return (
                <div className="notification full-width" key={index}>
                  <div className="notification-timestamp">{notification.timestamp}</div>
                  <div className="notification-message">{notification.message}</div>
                </div>
              );
            })}
          </div>

          <div className="flex-fill"></div>
          <div className="divider"></div>

          <div className="keys full-width">
            {destinationPublicKey ? (
              <div className="user2_Key">
                <div className="input-wrap">
                  <input type="checkbox" className="publicKey--visibleToggle" defaultChecked />
                  <div className="publicKey--background"></div>
                  <div className="publicKey--visibleToggle-eye open">
                    <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/138980/eye-open.png" />
                  </div>
                  <div className="publicKey--visibleToggle-eye close">
                    <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/138980/eye-close.png" />
                  </div>
                  <h3>
                    THEIR PUBLIC KEY & IDENTIFICATION - {this.getKeyShorted(destinationPublicKey)}
                  </h3>
                  <p>{destinationPublicKey}</p>
                </div>
              </div>
            ) : (
              <h4 style={{ textAlign: 'center' }}>Waiting for second user to join room...</h4>
            )}
            <div className="dividerkey"></div>
            {originPublicKey ? (
              <div className="user1_Key">
                <h3>YOUR PUBLIC KEY & IDENTIFICATION - {this.getKeyShorted(originPublicKey)}</h3>
                <p>{originPublicKey}</p>
              </div>
            ) : (
              <div className="keypair-loader full-width">
                <div className="loader"></div>
              </div>
            )}

            <div className="bottom-bar full-width" id="message-input">
              <div className="gradient-border">
                <input
                  className="message-input"
                  type="text"
                  placeholder="Your Message..."
                  value={draft}
                  onChange={(e) => this.setState({ draft: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && this.sendMessage()}
                />
              </div>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }
}

ReactDOM.render(<ChatApp />, document.getElementById('zentalk'));
