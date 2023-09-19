#
#   _   _  ____   ____  ______     __
#  | \ | |/ __ \ / __ \|  _ \ \   / /
#  |  \| | |  | | |  | | |_) \ \_/ /
#  | . ` | |  | | |  | |  _ < \   /
#  | |\  | |__| | |__| | |_) | | |
#  |_| \_|\____/ \____/|____/  |_|
#
# @usage
# let noobyClient = new nooby
#
# @authors
# Luke100000
# Thecoolpeople
#
# @license MIT
#

import socket
import struct
import lz4.block
import msgpack
import threading

def compress(data):
    return lz4.block.compress(data.encode())

def decompress(cdata):
    return lz4.block.decompress(cdata).decode()


class NoobyClient:
    def __init__(self):
        self.status = {
            "channel": "",
            "user": -1,
            "bytesSend": 0,
            "bytesReceived": 0
        }
        self.bufferSocket = bytearray()
        self.bufferUser = {}
        self.lock = threading.Lock()
        self.receive_thread = None

    def init(self, wrapper, ip, port, compress=True):
        self.compress = compress
        self.ip = ip
        self.port = port
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.socket.connect((ip, port))

        print("[nooby] TCP Socket is open now.")

        self.terminate_receive_event = threading.Event()  # Event for stopping the thread
        self.receive_thread = threading.Thread(target=self.receive_messages, args=(wrapper,))
        self.receive_thread.start()

    def shutdown(self):
        self.runningThread = False

    def receive_messages(self, wrapper):
        from socket import timeout as TimeoutException
        while not self.terminate_receive_event.is_set():
            try:
                data = self.socket.recv(256*256)
                if not data:
                    break
                self.handle_message(wrapper, data)
            except TimeoutException:
                pass
        self.socket.close()

    def handle_message(self, wrapper, data):
        self.lock.acquire()
        self.bufferSocket.extend(data)

        while len(self.bufferSocket) >= 4:
            chunk_size = struct.unpack(">H", self.bufferSocket[2:4])[0]
            if len(self.bufferSocket) >= chunk_size + 4:
                user_id = struct.unpack(">H", self.bufferSocket[0:2])[0]
                if user_id not in self.bufferUser:
                    self.bufferUser[user_id] = self.bufferSocket[4:chunk_size + 4 + 1]
                else:
                    self.bufferUser[user_id].extend(self.bufferSocket[4:chunk_size + 4 + 1])
                self.bufferSocket = self.bufferSocket[chunk_size + 4 + 1:]

                while len(self.bufferUser[user_id]) >= 6:
                    header_size = struct.unpack(">H", self.bufferUser[user_id][0:2])[0]
                    payload_size = struct.unpack(">I", self.bufferUser[user_id][2:6])[0]

                    if len(self.bufferUser[user_id]) >= 6 + header_size + payload_size:
                        header = self.bufferUser[user_id][6:6 + header_size]
                        payload = self.bufferUser[user_id][6 + header_size:6 + header_size + payload_size]

                        self.bufferUser[user_id] = self.bufferUser[user_id][6 + header_size + payload_size + 1:]

                        if header:
                            header = msgpack.unpackb(header)
                        else:
                            header = {"m": "message"}

                        if payload[0] == 0:
                            payload = msgpack.unpackb(payload[1:])
                        elif payload[0] == 1:
                            payload = decompress(payload[1:])
                            payload = msgpack.unpackb(payload)
                        elif payload[0] == 2:
                            # TODO: Handle zlib compressed payload
                            pass

                        header["u"] = user_id
                        wrapper.onmessage(header, payload)

        self.lock.release()

    def send_message(self, data):
        self.socket.send(data)

    def send(self, header, payload):
        msgpack_data = self.message_to_packet(header, payload)
        binary_data = self.text2binary(msgpack_data)
        self.send_message(binary_data)

    def connect(self, channel=None):
        if channel is not None:
            self.send({"m": "connect", "channel": channel}, {})
        else:
            self.send({"m": "connect"}, {})

    def text2binary(self, text):
        return text

    def intTo2Bytes(self, n):
        return struct.pack(">H", n)

    def bytesToInt(self, b):
        return struct.unpack(">I", b)[0]

    def intTo4Bytes(self, n):
        return struct.pack(">I", n)

    def message_to_packet(self, header, payload):
        header_data = msgpack.packb(header)
        payload_data = msgpack.packb(payload)

        if self.compress and len(payload_data) >= 128:
            payload_data = bytes([1]) + compress(payload_data)
        else:
            payload_data = bytes([0]) + payload_data

        return self.intTo2Bytes(len(header_data)) + self.intTo4Bytes(len(payload_data)) + header_data + payload_data