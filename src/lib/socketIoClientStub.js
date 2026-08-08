class SocketStub {
  connected = false;

  on() {
    return this;
  }

  off() {
    return this;
  }

  emit() {
    return this;
  }

  connect() {
    this.connected = false;
    return this;
  }

  disconnect() {
    this.connected = false;
    return this;
  }

  close() {
    this.connected = false;
    return this;
  }

  removeAllListeners() {
    return this;
  }
}

class ManagerStub {
  socket() {
    return new SocketStub();
  }
}

export const io = () => new SocketStub();
export const connect = io;
export const Manager = ManagerStub;
export const Socket = SocketStub;
export default io;